"use client";
// src/app/financeiro/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Upload, GitMerge } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { TransactionForm } from "@/components/financeiro/TransactionForm";
import { PaymentModal } from "@/components/financeiro/PaymentModal";
import { CsvImportModal } from "@/components/shared/CsvImportModal";
import { ConciliacaoBancaria } from "@/components/financeiro/ConciliacaoBancaria";
import { formatCurrency, formatDate, TRANSACTION_CATEGORIES, isOverdue } from "@/lib/utils";
import { toast } from "sonner";
import type { Transaction } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";

async function getCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  return data?.company_id;
}

async function fetchTransactions(companyId: string, type: string, status: string, search: string, start: string, end: string) {
  const supabase = createClient();
  let query = supabase
    .from("transactions")
    .select("*, clients(name), equipment(name, code), contracts(contract_number), bank_accounts(name)")
    .eq("company_id", companyId)
    .order("due_date", { ascending: false });

  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  const { data } = await query;
  let results = data || [];

  // Mark overdue
  const today = new Date().toISOString().split("T")[0];
  results = results.map((t) => ({
    ...t,
    status: t.status === "pendente" && t.due_date < today ? "vencido" : t.status,
    txDate: (t.status === "pago" || t.status === "recebido") && t.paid_date ? t.paid_date : t.due_date,
  }));

  // Filter by date range
  results = results.filter((t) => t.txDate >= start && t.txDate <= end);

  if (search) {
    const s = search.toLowerCase();
    results = results.filter((t) => t.description.toLowerCase().includes(s));
  }

  return results;
}

const statusBadge: Record<string, string> = {
  pendente: "badge-pendente",
  pago: "badge-pago",
  recebido: "badge-pago",
  vencido: "badge-vencido",
  cancelado: "badge-inativo",
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export default function FinanceiroPage() {
  const [type, setType] = useState<"" | "receita" | "despesa">("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [payModalItem, setPayModalItem] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<"receita" | "despesa">("receita");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isReadOnly } = useSubscription();

  const { companyId } = useCompanyId();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financeiro", companyId, type, status, search, startDate, endDate],
    queryFn: () => fetchTransactions(companyId!, type, status, search, startDate, endDate),
    enabled: !!companyId,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (payload: { id: string; status: "pago" | "recebido"; paid_date: string; amount: number; notes: string }) => {
      if (isReadOnly) {
        throw new Error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("transactions")
        .update({ 
          status: payload.status, 
          paid_date: payload.paid_date,
          amount: payload.amount,
          notes: payload.notes
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
      toast.success("Lançamento marcado como liquidado!");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar lançamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        throw new Error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      }
      const supabase = createClient();
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
      toast.success("Lançamento removido");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover lançamento"),
  });

  const totalReceita = transactions.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
  const totalDespesa = transactions.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
  const totalPendente = transactions.filter((t) => t.status === "pendente" || t.status === "vencido").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Financeiro"
        subtitle="Contas a receber e a pagar"
        actions={
          <div className="flex gap-2">
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Upload className="w-4 h-4" />
                  Importar Planilha
                </button>
                <button
                  onClick={() => { setDefaultType("receita"); setEditItem(null); setShowForm(true); }}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  + Receita
                </button>
                <button
                  onClick={() => { setDefaultType("despesa"); setEditItem(null); setShowForm(true); }}
                  className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <TrendingDown className="w-4 h-4" />
                  + Despesa
                </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">

            {/* Period filter */}
            <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl border bg-card items-end">
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Inicial</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Final</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Receitas</p>
                    <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCurrency(totalReceita)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Despesas</p>
                    <p className="text-2xl font-bold text-red-500 tabular-nums">{formatCurrency(totalDespesa)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </div>
              <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendente / Vencido</p>
                    <p className="text-2xl font-bold text-orange-500 tabular-nums">{formatCurrency(totalPendente)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orange-500/10">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Buscar lançamento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none">
                <option value="">Todos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none">
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="recebido">Recebido</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="data-table w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th className="hidden md:table-cell">Categoria</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th className="hidden lg:table-cell">Vinculado</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={8}><div className="skeleton h-5 w-full rounded" /></td></tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>Nenhum lançamento encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className={tx.status === "vencido" ? "bg-red-500/3" : ""}>
                        <td>
                          <p className="font-medium text-sm">{tx.description}</p>
                          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 items-center mt-0.5">
                            {tx.paid_date && (
                              <span className="text-xs text-muted-foreground">
                                {tx.type === "receita" ? "Recebido em " : "Pago em "}
                                {formatDate(tx.paid_date)}
                              </span>
                            )}
                            {tx.invoice_number && (
                              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                📄 NF: {tx.invoice_number}
                              </span>
                            )}
                            {(tx as any).bank_accounts?.name && (
                              <span className="text-xs font-semibold text-blue-500 dark:text-blue-400 flex items-center gap-1">
                                🏦 {(tx as any).bank_accounts.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`flex items-center gap-1 text-xs font-medium ${tx.type === "receita" ? "text-green-600" : "text-red-500"}`}>
                            {tx.type === "receita" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {tx.type === "receita" ? "Receita" : "Despesa"}
                          </span>
                        </td>
                        <td className="hidden md:table-cell text-muted-foreground text-xs">
                          {TRANSACTION_CATEGORIES.find((c) => c.value === tx.category)?.label || tx.category}
                        </td>
                        <td className={`text-sm ${tx.status === "vencido" ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          {formatDate(tx.due_date)}
                        </td>
                        <td className={`font-semibold tabular-nums ${tx.type === "receita" ? "text-green-600" : "text-red-500"}`}>
                          {tx.type === "receita" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                        </td>
                        <td>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[tx.status]}`}>
                            {statusLabel[tx.status]}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell text-xs text-muted-foreground">
                          {(tx as any).clients?.name || (tx as any).equipment?.name || "—"}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {tx.status !== "pago" && tx.status !== "recebido" && tx.status !== "cancelado" && (
                              <button
                                onClick={() => setPayModalItem(tx)}
                                className="p-1.5 hover:bg-green-500/10 rounded-lg text-muted-foreground hover:text-green-600 transition-colors"
                                title={tx.type === "receita" ? "Marcar como recebido" : "Marcar como pago"}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditItem(tx); setDefaultType(tx.type); setShowForm(true); }}
                              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => { if (confirm("Remover lançamento?")) deleteMutation.mutate(tx.id); }}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
      </div>

      {payModalItem && (
        <PaymentModal
          transaction={payModalItem}
          onClose={() => setPayModalItem(null)}
          onConfirm={(payload) => {
            markPaidMutation.mutate(payload);
            setPayModalItem(null);
          }}
        />
      )}

      {showForm && (
        <TransactionForm
          transaction={editItem}
          companyId={companyId!}
          defaultType={defaultType}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries();
            router.refresh();
            setShowForm(false);
          }}
        />
      )}

      {showImport && (
        <CsvImportModal
          type="finance"
          companyId={companyId!}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            queryClient.invalidateQueries();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
