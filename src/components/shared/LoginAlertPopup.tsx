"use client";
// src/components/shared/LoginAlertPopup.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  FileWarning,
  DollarSign,
  X,
  Bell,
  ArrowRight,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

interface ContractAlert {
  id: string;
  contract_number: string;
  end_date: string;
  client_name: string;
  days_until: number;
}

interface TransactionAlert {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  type: "receita" | "despesa";
  client_name?: string;
}

async function fetchLoginAlerts(companyId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const in10Days = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

  // Contratos com até 10 dias para vencimento
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contract_number, end_date, clients(name)")
    .eq("company_id", companyId)
    .eq("status", "ativo")
    .gte("end_date", today)
    .lte("end_date", in10Days)
    .order("end_date");

  // Contas a PAGAR (despesas pendentes) do dia
  const { data: payables } = await supabase
    .from("transactions")
    .select("id, description, amount, due_date, type, suppliers(name)")
    .eq("company_id", companyId)
    .eq("type", "despesa")
    .eq("status", "pendente")
    .eq("due_date", today);

  // Contas a RECEBER (receitas pendentes) do dia
  const { data: receivables } = await supabase
    .from("transactions")
    .select("id, description, amount, due_date, type, clients(name)")
    .eq("company_id", companyId)
    .eq("type", "receita")
    .eq("status", "pendente")
    .eq("due_date", today);

  const contractAlerts: ContractAlert[] = (contracts || []).map((c: any) => {
    const endDate = new Date(c.end_date + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");
    const days = Math.ceil((endDate.getTime() - todayDate.getTime()) / 86400000);
    return {
      id: c.id,
      contract_number: c.contract_number,
      end_date: c.end_date,
      client_name: c.clients?.name || "—",
      days_until: days,
    };
  });

  const payableAlerts: TransactionAlert[] = (payables || []).map((t: any) => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    due_date: t.due_date,
    type: "despesa" as const,
    client_name: t.suppliers?.name || undefined,
  }));

  const receivableAlerts: TransactionAlert[] = (receivables || []).map((t: any) => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    due_date: t.due_date,
    type: "receita" as const,
    client_name: t.clients?.name || undefined,
  }));

  return { contractAlerts, payableAlerts, receivableAlerts };
}

async function generateAutoAlerts(companyId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const in10Days = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

  // Check for existing alerts generated today to avoid duplicates
  const todayStart = today + "T00:00:00";
  const todayEnd = today + "T23:59:59";
  const { data: existingToday } = await supabase
    .from("alerts")
    .select("entity_id, type")
    .eq("company_id", companyId)
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  const existingSet = new Set(
    (existingToday || []).map((a) => `${a.type}_${a.entity_id}`)
  );

  // Contratos com até 10 dias para vencimento
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contract_number, end_date, clients(name)")
    .eq("company_id", companyId)
    .eq("status", "ativo")
    .gte("end_date", today)
    .lte("end_date", in10Days);

  // Contas vencidas
  const { data: overdue } = await supabase
    .from("transactions")
    .select("id, description, amount, due_date, type")
    .eq("company_id", companyId)
    .eq("status", "pendente")
    .lt("due_date", today);

  // Contas do dia
  const { data: todayTxs } = await supabase
    .from("transactions")
    .select("id, description, amount, due_date, type")
    .eq("company_id", companyId)
    .eq("status", "pendente")
    .eq("due_date", today);

  const newAlerts: any[] = [];

  for (const c of contracts || []) {
    const key = `contrato_vencer_${c.id}`;
    if (existingSet.has(key)) continue;
    const endDate = new Date(c.end_date + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");
    const days = Math.ceil((endDate.getTime() - todayDate.getTime()) / 86400000);
    newAlerts.push({
      company_id: companyId,
      type: "contrato_vencer",
      priority: days <= 3 ? "high" : "medium",
      title: `Contrato ${c.contract_number} vence em ${days} dia${days !== 1 ? "s" : ""}`,
      message: `Cliente: ${(c as any).clients?.name || "—"} — Vencimento em ${formatDate(c.end_date)}`,
      entity_type: "contract",
      entity_id: c.id,
    });
  }

  for (const tx of overdue || []) {
    const key = `conta_vencida_${tx.id}`;
    if (existingSet.has(key)) continue;
    newAlerts.push({
      company_id: companyId,
      type: "conta_vencida",
      priority: "high",
      title: `${tx.type === "receita" ? "Recebimento" : "Pagamento"} vencido`,
      message: `${tx.description} — venceu em ${formatDate(tx.due_date)}`,
      entity_type: "transaction",
      entity_id: tx.id,
    });
  }

  for (const tx of todayTxs || []) {
    const key = `conta_vencer_${tx.id}`;
    if (existingSet.has(key)) continue;
    newAlerts.push({
      company_id: companyId,
      type: "conta_vencer",
      priority: "medium",
      title: `${tx.type === "receita" ? "Recebimento" : "Pagamento"} vence hoje`,
      message: `${tx.description} — ${formatCurrency(Number(tx.amount))}`,
      entity_type: "transaction",
      entity_id: tx.id,
    });
  }

  if (newAlerts.length > 0) {
    await supabase.from("alerts").insert(newAlerts);
  }

  return newAlerts.length;
}

export function LoginAlertPopup() {
  const [open, setOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  // Generate auto alerts mutation
  const autoGenerateMutation = useMutation({
    mutationFn: () => generateAutoAlerts(companyId!),
    onSuccess: (count) => {
      queryClient.invalidateQueries();
      if (count > 0) {
        console.log(`[LoginAlertPopup] ${count} novos alertas gerados automaticamente.`);
      }
    },
  });

  // Check sessionStorage to see if popup was already shown to prevent fetching and showing again
  const popupShownKey = companyId ? `alerts_popup_shown_${companyId}` : "";
  const isPopupAlreadyShown = typeof window !== "undefined" && !!companyId && !!sessionStorage.getItem(popupShownKey);

  // Fetch login-specific data
  const { data, isLoading } = useQuery({
    queryKey: ["login-alerts", companyId],
    queryFn: () => fetchLoginAlerts(companyId!),
    enabled: !!companyId && hasChecked && !isPopupAlreadyShown,
  });

  // Auto-generate alerts on mount (once per session)
  useEffect(() => {
    if (!companyId || hasChecked) return;

    // Check sessionStorage to avoid running on every navigation
    const sessionKey = `alerts_generated_${companyId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) {
      setHasChecked(true);
      return;
    }

    autoGenerateMutation.mutate(undefined, {
      onSettled: () => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(sessionKey, "true");
        }
        setHasChecked(true);
      },
    });
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show popup when data arrives and there are items
  useEffect(() => {
    if (!data || isPopupAlreadyShown) return;
    const total =
      data.contractAlerts.length +
      data.payableAlerts.length +
      data.receivableAlerts.length;
    if (total > 0) {
      setOpen(true);
      if (typeof window !== "undefined" && popupShownKey) {
        sessionStorage.setItem(popupShownKey, "true");
      }
    }
  }, [data, isPopupAlreadyShown, popupShownKey]);

  if (!open || !data) return null;

  const { contractAlerts, payableAlerts, receivableAlerts } = data;
  const totalPayable = payableAlerts.reduce((s, t) => s + t.amount, 0);
  const totalReceivable = receivableAlerts.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Atenção!</h3>
              <p className="text-sm text-white/80">Resumo de pendências do dia</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Contracts expiring */}
          {contractAlerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileWarning className="w-4 h-4 text-orange-500" />
                <h4 className="font-semibold text-sm">
                  Contratos com vencimento em até 10 dias
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold">
                    {contractAlerts.length}
                  </span>
                </h4>
              </div>
              <div className="space-y-2">
                {contractAlerts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10"
                  >
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.contract_number} — {c.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vence em{" "}
                        <span className="font-bold text-orange-500">
                          {c.days_until} dia{c.days_until !== 1 ? "s" : ""}
                        </span>{" "}
                        ({formatDate(c.end_date)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payables today */}
          {payableAlerts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <h4 className="font-semibold text-sm">
                    Contas a Pagar — Hoje
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
                      {payableAlerts.length}
                    </span>
                  </h4>
                </div>
                <span className="text-sm font-bold text-red-500 tabular-nums">
                  {formatCurrency(totalPayable)}
                </span>
              </div>
              <div className="space-y-1.5">
                {payableAlerts.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description}</p>
                      {tx.client_name && (
                        <p className="text-xs text-muted-foreground">{tx.client_name}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-red-500 tabular-nums ml-3 flex-shrink-0">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receivables today */}
          {receivableAlerts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <h4 className="font-semibold text-sm">
                    Contas a Receber — Hoje
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-bold">
                      {receivableAlerts.length}
                    </span>
                  </h4>
                </div>
                <span className="text-sm font-bold text-green-600 tabular-nums">
                  {formatCurrency(totalReceivable)}
                </span>
              </div>
              <div className="space-y-1.5">
                {receivableAlerts.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-green-500/5 border border-green-500/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description}</p>
                      {tx.client_name && (
                        <p className="text-xs text-muted-foreground">{tx.client_name}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-green-600 tabular-nums ml-3 flex-shrink-0">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            Fechar
          </button>
          <Link
            href="/alertas"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver Todos os Alertas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
