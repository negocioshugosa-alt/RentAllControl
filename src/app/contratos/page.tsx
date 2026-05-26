"use client";
// src/app/contratos/page.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Pencil, Trash2, Eye, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { ContractForm } from "@/components/contratos/ContractForm";
import { formatCurrency, formatDate, CONTRACT_STATUS } from "@/lib/utils";
import { toast } from "sonner";
import type { Contract } from "@/types";

async function fetchContracts(companyId: string, search: string, status: string) {
  const supabase = createClient();
  let query = supabase
    .from("contracts")
    .select("*, clients(name, document), equipment(name, code)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  let results = data || [];
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(
      (c: any) =>
        c.contract_number.toLowerCase().includes(s) ||
        c.clients?.name?.toLowerCase().includes(s) ||
        c.equipment?.name?.toLowerCase().includes(s)
    );
  }
  return results;
}

async function getCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  return data?.company_id;
}

export default function ContratosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativo");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Contract | null>(null);
  const queryClient = useQueryClient();

  const { companyId } = useCompanyId();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contratos", companyId, search, statusFilter],
    queryFn: () => fetchContracts(companyId!, search, statusFilter),
    enabled: !!companyId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("contracts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato atualizado");
    },
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Contratos"
        subtitle={`${contracts.length} contratos`}
        actions={
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Contrato
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Buscar por número, cliente ou equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[{ value: "", label: "Todos" }, ...CONTRACT_STATUS].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${statusFilter === s.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="data-table w-full">
            <thead className="bg-muted/30">
              <tr>
                <th>Nº / Cliente</th>
                <th className="hidden md:table-cell">Equipamento</th>
                <th>Status</th>
                <th className="hidden lg:table-cell">Início</th>
                <th className="hidden lg:table-cell">Término</th>
                <th className="hidden xl:table-cell">Valor</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="skeleton h-5 w-full rounded" /></td></tr>
                ))
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum contrato encontrado</p>
                  </td>
                </tr>
              ) : (
                contracts.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{c.contract_number}</p>
                      <p className="text-xs text-muted-foreground">{c.clients?.name}</p>
                    </td>
                    <td className="hidden md:table-cell">
                      <p className="text-sm">{c.equipment?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.equipment?.code}</p>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium badge-${c.status}`}>
                        {CONTRACT_STATUS.find((s) => s.value === c.status)?.label || c.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-muted-foreground">{formatDate(c.start_date)}</td>
                    <td className="hidden lg:table-cell text-muted-foreground">
                      {c.end_date ? formatDate(c.end_date) : "—"}
                    </td>
                    <td className="hidden xl:table-cell">
                      {c.payment_frequency === "unica" && c.contract_value
                        ? <span className="text-sm font-medium">{formatCurrency(Number(c.contract_value))}<span className="text-xs text-muted-foreground">/único</span></span>
                        : c.monthly_rate
                        ? <span className="text-sm font-medium">{formatCurrency(Number(c.monthly_rate))}<span className="text-xs text-muted-foreground">/mês</span></span>
                        : c.daily_rate
                        ? <span className="text-sm font-medium">{formatCurrency(Number(c.daily_rate))}<span className="text-xs text-muted-foreground">/dia</span></span>
                        : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditItem(c); setShowForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar contrato"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {c.file_url && (
                          <a
                            href={c.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            title="Visualizar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {c.status === "ativo" && (
                          <button
                            onClick={() => statusMutation.mutate({ id: c.id, status: "encerrado" })}
                            className="p-1.5 hover:bg-orange-500/10 rounded-lg text-muted-foreground hover:text-orange-500 transition-colors text-xs"
                            title="Encerrar contrato"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ContractForm
          contract={editItem}
          companyId={companyId!}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["contratos"] });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
