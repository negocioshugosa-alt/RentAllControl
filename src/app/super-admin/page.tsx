"use client";

// src/app/super-admin/page.tsx
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Building2, Users, CreditCard, AlertTriangle, TrendingUp,
  Search, Filter, ExternalLink, Loader2, Shield, LogOut,
  RefreshCw, Clock, XCircle, CheckCircle2, Timer, Crown
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_trial_ends_at: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  user_count: number;
}

interface Metrics {
  total: number;
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  expired: number;
  mrr: number;
}

type StatusFilter = "all" | "active" | "trialing" | "past_due" | "canceled" | "expired";

export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, trialing: 0, pastDue: 0, canceled: 0, expired: 0, mrr: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch("/api/platform/admin/companies", { cache: "no-store" });
      if (res.status === 403 || res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(`Acesso negado (${res.status}): ${JSON.stringify(errorData)}`);
        setAuthorized(false);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar dados: " + res.status);

      const data = await res.json();
      setCompanies(data.companies);
      setMetrics(data.metrics);
      setAuthorized(true);
    } catch (e) {
      console.error("Erro Super Admin:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    if (statusFilter !== "all") {
      if (statusFilter === "expired") {
        filtered = filtered.filter(c => {
          if (c.subscription_status === "trialing" && c.subscription_trial_ends_at) {
            return new Date(c.subscription_trial_ends_at) < new Date();
          }
          return false;
        });
      } else {
        filtered = filtered.filter(c => c.subscription_status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.cnpj.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [companies, statusFilter, searchQuery]);

  function getStatusBadge(company: Company) {
    const isTrialExpired = company.subscription_status === "trialing" &&
      company.subscription_trial_ends_at &&
      new Date(company.subscription_trial_ends_at) < new Date();

    if (isTrialExpired) return { label: "Trial Expirado", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Timer };
    if (company.subscription_status === "active") return { label: "Ativa", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 };
    if (company.subscription_status === "trialing") return { label: "Trial", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock };
    if (company.subscription_status === "past_due") return { label: "Inadimplente", color: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse", icon: AlertTriangle };
    if (company.subscription_status === "canceled") return { label: "Cancelada", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: XCircle };
    return { label: company.subscription_status, color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: Clock };
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/30">
              <Shield className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="absolute -inset-4 rounded-3xl bg-violet-500/10 animate-ping" />
          </div>
          <p className="text-zinc-400 text-sm mt-6">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4 max-w-lg bg-red-500/10 p-8 rounded-2xl border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-400">Acesso Bloqueado</h2>
          <p className="text-zinc-400 text-sm">{errorMsg || "Você não tem permissão para acessar esta página."}</p>
          <button onClick={() => router.push("/dashboard")} className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-all">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: "Total de Empresas", value: metrics.total, icon: Building2, gradient: "from-violet-600 to-indigo-600", shadow: "shadow-violet-500/20" },
    { label: "Assinaturas Ativas", value: metrics.active, icon: CheckCircle2, gradient: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/20" },
    { label: "Em Trial", value: metrics.trialing, icon: Clock, gradient: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
    { label: "Inadimplentes", value: metrics.pastDue + metrics.expired, icon: AlertTriangle, gradient: "from-red-600 to-rose-600", shadow: "shadow-red-500/20" },
    { label: "MRR Estimado", value: formatCurrency(metrics.mrr), icon: TrendingUp, gradient: "from-amber-600 to-orange-600", shadow: "shadow-amber-500/20", isCurrency: true },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Super Admin
              </h1>
              <p className="text-[11px] text-zinc-500">RentAllControl • Painel de Gestão da Plataforma</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {metricCards.map((card, i) => (
            <div
              key={card.label}
              className={`relative group rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all duration-300 hover:border-white/10 overflow-hidden`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

              <div className="relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-lg ${card.shadow}`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-black mt-1 tracking-tight ${card.isCurrency ? "text-lg" : ""}`}>
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "all", label: "Todas", count: metrics.total },
              { key: "active", label: "Ativas", count: metrics.active },
              { key: "trialing", label: "Trial", count: metrics.trialing },
              { key: "past_due", label: "Inadimplentes", count: metrics.pastDue },
              { key: "expired", label: "Expiradas", count: metrics.expired },
              { key: "canceled", label: "Canceladas", count: metrics.canceled },
            ] as { key: StatusFilter; label: string; count: number }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === f.key
                    ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                    : "bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] opacity-60">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar empresa, CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
          </div>
        </div>

        {/* Companies Table */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Empresa</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Plano</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Usuários</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Criado em</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Validade</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-600">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma empresa encontrada</p>
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => {
                    const badge = getStatusBadge(company);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={company.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-white group-hover:text-violet-300 transition-colors">{company.name}</p>
                            <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{company.cnpj}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            company.subscription_plan === "pro"
                              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20"
                              : "bg-white/5 text-zinc-400 border border-white/10"
                          }`}>
                            {company.subscription_plan === "pro" && <Crown className="w-3 h-3" />}
                            {company.subscription_plan === "pro" ? "Pro" : "Essencial"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <Users className="w-3.5 h-3.5" />
                            {company.user_count}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-500 text-xs font-mono">{formatDate(company.created_at)}</td>
                        <td className="px-5 py-4 text-zinc-500 text-xs font-mono">{formatDate(company.subscription_expires_at)}</td>
                        <td className="px-5 py-4 text-right">
                          {company.asaas_customer_id && (
                            <a
                              href={`https://www.asaas.com/customerAccount/show/${company.asaas_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Asaas
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/5 flex justify-between items-center text-xs text-zinc-600">
            <span>{filteredCompanies.length} de {companies.length} empresas</span>
            <span>Última atualização: {new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
