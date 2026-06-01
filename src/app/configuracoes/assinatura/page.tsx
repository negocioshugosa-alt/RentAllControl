"use client";

// src/app/configuracoes/assinatura/page.tsx
import { useState, useEffect } from "react";
import { Header } from "@/components/shared/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  CreditCard, Check, AlertTriangle, QrCode,
  Copy, FileText, Download, Loader2, Info, Landmark, HelpCircle,
  Building2, User, Users
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Invoice {
  id: string;
  dueDate: string;
  value: number;
  status: "pago" | "vencido" | "pendente";
  paymentUrl: string;
  bankSlipUrl: string;
}

export default function AssinaturaPage() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Form State para Nova Assinatura
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"essencial" | "pro">("pro");
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO">("PIX");
  const [cnpj, setCnpj] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Modais State
  const [pixModalData, setPixModalData] = useState<{ id: string; qrCode: string; payload: string } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [boletoModalData, setBoletoModalData] = useState<{ id: string; barcode: string; pdfUrl: string } | null>(null);
  const [boletoLoading, setBoletoLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*, companies(*)")
        .eq("user_id", user.id)
        .single();

      if (prof) {
        setProfile(prof);
        const comp = (prof as any).companies;
        setCompany(comp);
        setCnpj(comp.cnpj || "");
        setBillingEmail(prof.email || "");

        if (comp.asaas_customer_id) {
          const loadedInvoices = await loadInvoices(comp);
          return { profile: prof, company: comp, invoices: loadedInvoices };
        }
        return { profile: prof, company: comp, invoices: [] };
      }
    } catch (e: any) {
      toast.error("Erro ao carregar dados da empresa: " + e.message);
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function loadInvoices(compObj?: any) {
    const activeCompany = compObj || company;
    setInvoicesLoading(true);
    try {
      const res = await fetch("/api/platform/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);

        // Auto-heal local state: Se há uma fatura paga, recarrega os dados da empresa do Supabase
        const hasPaid = data.some((inv: any) => inv.status === "pago");
        if (hasPaid && activeCompany && activeCompany.subscription_status !== "active") {
          const supabase = createClient();
          const { data: comp } = await supabase
            .from("companies")
            .select("*")
            .eq("id", activeCompany.id)
            .single();
          if (comp) {
            setCompany(comp);
            toast.success("Assinatura sincronizada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["company-context"] });
          }
        }

        return data;
      }
    } catch (e) {
      console.error("Erro ao buscar faturas:", e);
    } finally {
      setInvoicesLoading(false);
    }
    return [];
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!cnpj || !billingEmail) {
      toast.error("Por favor, preencha todos os campos de cobrança.");
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch("/api/platform/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          billingType,
          name: company.name,
          cnpj,
          email: billingEmail,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao assinar");

      toast.success("Assinatura criada com sucesso! Carregando faturas...");
      queryClient.invalidateQueries({ queryKey: ["company-context"] });

      const loaded = await loadData();
      if (loaded && loaded.invoices && loaded.invoices.length > 0) {
        const pendingInvoice = loaded.invoices.find((inv: any) => inv.status === "pendente");
        if (pendingInvoice) {
          if (billingType === "PIX") {
            await showPixModal(pendingInvoice.id);
          } else if (billingType === "BOLETO") {
            await showBoletoModal(pendingInvoice.id, pendingInvoice.bankSlipUrl);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro ao ativar o plano.");
    } finally {
      setSubscribing(false);
    }
  }

  async function showPixModal(invoiceId: string) {
    setPixLoading(true);
    try {
      const res = await fetch(`/api/platform/invoices/${invoiceId}/pix`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPixModalData({
        id: invoiceId,
        qrCode: data.qrCodeImage,
        payload: data.payload,
      });
    } catch (e: any) {
      toast.error("Erro ao gerar QR Code Pix: " + e.message);
    } finally {
      setPixLoading(false);
    }
  }

  async function showBoletoModal(invoiceId: string, pdfUrl: string) {
    setBoletoLoading(true);
    try {
      const res = await fetch(`/api/platform/invoices/${invoiceId}/barcode`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBoletoModalData({
        id: invoiceId,
        barcode: data.identificationField,
        pdfUrl: pdfUrl,
      });
    } catch (e: any) {
      toast.error("Erro ao carregar código do boleto: " + e.message);
    } finally {
      setBoletoLoading(false);
    }
  }

  function handleCopy(text: string, type: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copiado com sucesso!`);
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Carregando dados da assinatura...</p>
      </div>
    );
  }

  const hasSubscription = !!company?.asaas_subscription_id;
  const trialDaysLeft = company ? Math.max(0, Math.ceil((new Date(company.subscription_trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const isTrialExpired = company?.subscription_status === "trialing" && trialDaysLeft <= 0;

  return (
    <div className="flex flex-col flex-1">
      <Header title="Assinatura & Plano" subtitle="Gerencie as mensalidades e recursos do seu RentAllControl" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
          {[
            { id: "empresa", label: "Empresa", icon: Building2, href: "/configuracoes" },
            { id: "assinatura", label: "Plano / Assinatura", icon: CreditCard, href: "/configuracoes/assinatura" },
            { id: "equipe", label: "Minha Equipe", icon: Users, href: "/configuracoes/equipe" },
            { id: "contas", label: "Contas Bancárias", icon: Landmark, href: "/configuracoes/contas" },
          ].map((tab) => {
            const isActive = tab.id === "assinatura";
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Status atual da conta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border bg-card p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[180px]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano Atual</p>
                  <h3 className="text-2xl font-black font-display text-primary uppercase mt-1">
                    {company?.subscription_plan === "essencial" ? "Essencial" : "Pro"}
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  company?.subscription_status === "active" ? "bg-emerald-500/10 text-emerald-600" :
                  company?.subscription_status === "past_due" ? "bg-rose-500/10 text-rose-600 animate-pulse" :
                  "bg-amber-500/10 text-amber-600"
                }`}>
                  {company?.subscription_status === "active" ? "Assinatura Ativa" :
                   company?.subscription_status === "past_due" ? "Atrasado/Inadimplente" :
                   isTrialExpired ? "Trial Expirado" : `Período Trial - ${trialDaysLeft} dias`}
                </span>
              </div>

              {company?.subscription_status === "trialing" && !isTrialExpired && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Seu período experimental de 30 dias termina em <strong>{formatDate(company.subscription_trial_ends_at)}</strong>. Ative uma assinatura para evitar interrupções.</span>
                </div>
              )}

              {isTrialExpired && (
                <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Seu período experimental expirou. O sistema está em <strong>Modo Leitura e Relatórios</strong>.</span>
                </div>
              )}

              {company?.subscription_status === "past_due" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 animate-pulse">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Acesso bloqueado por pendência financeira. Realize o pagamento de sua fatura em aberto para restabelecer o acesso.</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
              <span>Empresa: <strong>{company?.name}</strong></span>
              {company?.subscription_expires_at && (
                <span>Válido até: <strong>{formatDate(company.subscription_expires_at)}</strong></span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between">
            <h4 className="font-semibold text-sm">Resumo de Recursos</h4>
            <div className="space-y-3 mt-4 flex-1">
              <div className="flex justify-between text-xs py-1 border-b">
                <span className="text-muted-foreground">Equipamentos:</span>
                <span className="font-semibold">
                  {company?.subscription_plan === "essencial" ? "Até 50 itens" : "Ilimitados"}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b">
                <span className="text-muted-foreground">Colaboradores:</span>
                <span className="font-semibold">
                  {company?.subscription_plan === "essencial" ? "1 Usuário" : "Ilimitados"}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-muted-foreground">Suporte:</span>
                <span className="font-semibold">
                  {company?.subscription_plan === "essencial" ? "Email" : "WhatsApp / Prioritário"}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg mt-3 text-center">
              RentAllControl ERP Locadoras SaaS
            </div>
          </div>
        </div>

        {/* Formulário de Assinatura (Sempre visível para permitir renovações, alterações de plano ou de forma de pagamento a qualquer tempo) */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold font-display">
              {hasSubscription ? "Renovar ou Alterar Assinatura" : "Ativar Assinatura RentAllControl"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasSubscription 
                ? "Altere seu plano, mude a forma de pagamento ou gere uma nova fatura de renovação a qualquer momento."
                : "Selecione seu plano e insira os dados de cobrança para ativar a conta."}
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="space-y-6">
            {/* Seleção de Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setSelectedPlan("essencial")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                  selectedPlan === "essencial" ? "border-primary bg-primary/5 shadow-md" : "hover:border-muted-foreground/30"
                }`}
              >
                {selectedPlan === "essencial" && <Check className="w-5 h-5 text-primary absolute top-4 right-4" />}
                <h4 className="font-bold text-lg font-display">Plano Essencial</h4>
                <p className="text-xs text-muted-foreground mt-1">Para pequenas locadoras iniciando no mercado</p>
                <p className="text-2xl font-black font-display text-primary mt-4">
                  R$ 5,00 <span className="text-xs font-normal text-muted-foreground">/ mês</span>
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-1.5">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Até 50 equipamentos</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 1 usuário administrador</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Faturamento e Contratos básicos</li>
                </ul>
              </div>

              <div
                onClick={() => setSelectedPlan("pro")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                  selectedPlan === "pro" ? "border-primary bg-primary/5 shadow-md" : "hover:border-muted-foreground/30"
                }`}
              >
                {selectedPlan === "pro" && <Check className="w-5 h-5 text-primary absolute top-4 right-4" />}
                <h4 className="font-bold text-lg font-display flex items-center gap-2">
                  Plano Pro
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">Recomendado</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-1">Para locadoras com crescimento acelerado e equipes</p>
                <p className="text-2xl font-black font-display text-primary mt-4">
                  R$ 299,90 <span className="text-xs font-normal text-muted-foreground">/ mês</span>
                </p>
                <ul className="text-xs text-muted-foreground mt-4 space-y-1.5">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Equipamentos ilimitados</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Usuários e equipe ilimitados</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Relatórios gerenciais avançados</li>
                </ul>
              </div>
            </div>

            {/* Informações de Faturamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="md:col-span-2">
                <h4 className="text-sm font-semibold mb-3">Dados de Cobrança</h4>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">CPF ou CNPJ para Faturamento *</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email de Cobrança *</label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="financeiro@empresa.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Forma de Pagamento Preferencial</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-xl flex-1 hover:bg-muted/30">
                    <input
                      type="radio"
                      name="billingType"
                      checked={billingType === "PIX"}
                      onChange={() => setBillingType("PIX")}
                    />
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Pix</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-xl flex-1 hover:bg-muted/30">
                    <input
                      type="radio"
                      name="billingType"
                      checked={billingType === "BOLETO"}
                      onChange={() => setBillingType("BOLETO")}
                    />
                    <Landmark className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Boleto Bancário</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={subscribing}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando no Asaas...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    {hasSubscription ? "Renovar Assinatura" : `Ativar Plano com ${selectedPlan === "pro" ? "R$ 299,90" : "R$ 149,90"}/mês`}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Histórico de Mensalidades */}
        {hasSubscription && (
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold font-display">Histórico de Mensalidades</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Veja faturas e obtenha segunda via de pagamentos</p>
              </div>
              <button
                onClick={loadInvoices}
                disabled={invoicesLoading}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {invoicesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Atualizar"}
              </button>
            </div>

            {invoicesLoading && invoices.length === 0 ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Buscando faturas no Asaas...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhuma fatura encontrada. Caso tenha acabado de assinar, a primeira fatura aparecerá em instantes.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3">Valor</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium">{formatDate(inv.dueDate)}</td>
                      <td className="px-6 py-4 font-bold">{formatCurrency(inv.value)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === "pago" ? "bg-emerald-500/10 text-emerald-600" :
                          inv.status === "vencido" ? "bg-rose-500/10 text-rose-600 font-bold" :
                          "bg-amber-500/10 text-amber-600"
                        }`}>
                          {inv.status === "pago" ? "Pago" : inv.status === "vencido" ? "Vencido" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {inv.status !== "pago" && (
                            <>
                              <button
                                onClick={() => showPixModal(inv.id)}
                                disabled={pixLoading}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                Pix
                              </button>
                              <button
                                onClick={() => showBoletoModal(inv.id, inv.bankSlipUrl)}
                                disabled={boletoLoading}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Boleto
                              </button>
                            </>
                          )}
                          {inv.status === "pago" && (
                            <span className="text-xs text-muted-foreground py-1 font-medium flex items-center gap-1 text-emerald-600">
                              ✓ Pago via Asaas
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL PIX */}
      {pixModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
            <h3 className="font-bold text-lg text-center flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-500 animate-bounce" />
              Pagar com Pix
            </h3>
            <p className="text-xs text-center text-muted-foreground">Abra o app do seu banco, escolha &quot;Pagar com Pix&quot; e aponte a câmera para o QR Code abaixo:</p>

            <div className="w-48 h-48 border-2 border-primary/20 rounded-2xl mx-auto flex items-center justify-center p-2 bg-white">
              {pixModalData.qrCode ? (
                <img
                  src={`data:image/png;base64,${pixModalData.qrCode}`}
                  alt="Pix QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Pix Copia e Cola</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  className="input w-full pr-10 text-xs font-mono select-all truncate bg-muted"
                  value={pixModalData.payload}
                />
                <button
                  onClick={() => handleCopy(pixModalData.payload, "Pix Copia e Cola")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted-foreground/10 rounded-lg text-primary"
                  title="Copiar Código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPixModalData(null)}
                className="w-full py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BOLETO */}
      {boletoModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <h3 className="font-bold text-lg text-center flex items-center justify-center gap-2">
              <Landmark className="w-5 h-5 text-blue-500" />
              Pagar com Boleto
            </h3>
            <p className="text-xs text-center text-muted-foreground">Copie a linha digitável abaixo para pagar no internet banking, ou faça o download do PDF completo.</p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Linha Digitável</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  className="input w-full pr-10 text-xs font-mono select-all bg-muted py-3"
                  value={boletoModalData.barcode}
                />
                <button
                  onClick={() => handleCopy(boletoModalData.barcode, "Código de Barras")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted-foreground/10 rounded-lg text-primary"
                  title="Copiar Linha Digitável"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setBoletoModalData(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
              >
                Fechar
              </button>
              {boletoModalData.pdfUrl && (
                <a
                  href={boletoModalData.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  PDF do Boleto
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
