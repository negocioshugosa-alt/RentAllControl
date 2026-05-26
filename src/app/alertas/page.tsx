"use client";
// src/app/alertas/page.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, AlertTriangle, Clock, FileWarning, Filter, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { formatDate, isOverdue, isUpcoming } from "@/lib/utils";
import { toast } from "sonner";
import type { Alert } from "@/types";

async function getCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  return data?.company_id;
}

async function fetchAlerts(companyId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("alerts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data || [];
}

const alertIcons: Record<string, React.ElementType> = {
  conta_vencer: Clock,
  conta_vencida: AlertTriangle,
  contrato_vencer: FileWarning,
  inadimplencia: AlertTriangle,
  manutencao: Zap,
};

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
  high: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/20" },
  low: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
};

const priorityLabel: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export default function AlertasPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const queryClient = useQueryClient();

  const { companyId } = useCompanyId();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alertas", companyId],
    queryFn: () => fetchAlerts(companyId!),
    enabled: !!companyId,
  });

  const markReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const supabase = createClient();
      await supabase.from("alerts").update({ is_read: true }).in("id", ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Alertas marcados como lidos");
    },
  });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

      // Contas vencidas
      const { data: overdue } = await supabase
        .from("transactions")
        .select("id, description, amount, due_date, type")
        .eq("company_id", companyId)
        .eq("status", "pendente")
        .lt("due_date", today);

      // Contas a vencer em 7 dias
      const { data: upcoming } = await supabase
        .from("transactions")
        .select("id, description, amount, due_date, type")
        .eq("company_id", companyId)
        .eq("status", "pendente")
        .gte("due_date", today)
        .lte("due_date", in7);

      // Contratos a vencer
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, contract_number, end_date, clients(name)")
        .eq("company_id", companyId)
        .eq("status", "ativo")
        .lte("end_date", in7)
        .gte("end_date", today);

      const newAlerts = [];

      for (const tx of overdue || []) {
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

      for (const tx of upcoming || []) {
        newAlerts.push({
          company_id: companyId,
          type: "conta_vencer",
          priority: "medium",
          title: `${tx.type === "receita" ? "Recebimento" : "Pagamento"} a vencer`,
          message: `${tx.description} — vence em ${formatDate(tx.due_date)}`,
          entity_type: "transaction",
          entity_id: tx.id,
        });
      }

      for (const c of contracts || []) {
        newAlerts.push({
          company_id: companyId,
          type: "contrato_vencer",
          priority: "medium",
          title: "Contrato próximo do vencimento",
          message: `Contrato ${c.contract_number} (${(c as any).clients?.name}) vence em ${formatDate(c.end_date!)}`,
          entity_type: "contract",
          entity_id: c.id,
        });
      }

      if (newAlerts.length > 0) {
        await supabase.from("alerts").insert(newAlerts);
      }

      return newAlerts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries();
      toast.success(`${count} alertas gerados!`);
    },
    onError: () => toast.error("Erro ao gerar alertas"),
  });

  const filtered = alerts.filter((a: Alert) => {
    if (filter === "unread") return !a.is_read;
    if (filter === "critical") return a.priority === "critical" || a.priority === "high";
    return true;
  });

  const unreadCount = alerts.filter((a: Alert) => !a.is_read).length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Alertas"
        subtitle={`${unreadCount} não lidos`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => generateAlertsMutation.mutate()}
              disabled={generateAlertsMutation.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {generateAlertsMutation.isPending ? "Gerando…" : "Gerar Alertas"}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={() => markReadMutation.mutate(alerts.filter((a: Alert) => !a.is_read).map((a: Alert) => a.id))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todos como lidos
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { value: "all", label: `Todos (${alerts.length})` },
            { value: "unread", label: `Não lidos (${unreadCount})` },
            { value: "critical", label: "Críticos / Altos" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Alerts list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum alerta</p>
            <p className="text-sm mt-1">Clique em Gerar Alertas para verificar pendências</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert: Alert) => {
              const Icon = alertIcons[alert.type] || Bell;
              const colors = priorityColors[alert.priority];
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                    !alert.is_read ? "bg-card" : "bg-muted/20"
                  } ${colors.border}`}
                >
                  <div className={`p-2 rounded-xl flex-shrink-0 ${colors.bg}`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold ${!alert.is_read ? "" : "text-muted-foreground"}`}>
                        {alert.title}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                        {priorityLabel[alert.priority]}
                      </span>
                      {!alert.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(alert.created_at, "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  {!alert.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate([alert.id])}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      title="Marcar como lido"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
