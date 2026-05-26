"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Wrench } from "lucide-react";
import Link from "next/link";

async function fetchEquipmentProfit(companyId: string) {
  const supabase = createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, code, status")
    .eq("company_id", companyId)
    .neq("status", "inativo");

  if (!equipment?.length) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("equipment_id, type, amount, status")
    .eq("company_id", companyId)
    .eq("status", "pago");

  return equipment.map((eq) => {
    const txs = (transactions || []).filter((t) => t.equipment_id === eq.id);
    const revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
    const costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
    const profit = revenue - costs;
    return { ...eq, revenue, costs, profit };
  }).sort((a, b) => b.profit - a.profit);
}

const statusLabel: Record<string, string> = {
  disponivel: "Disponível", alugado: "Alugado",
  manutencao: "Manutenção", inativo: "Inativo",
};
const statusBadge: Record<string, string> = {
  disponivel: "badge-disponivel", alugado: "badge-alugado",
  manutencao: "badge-manutencao", inativo: "badge-inativo",
};

export function EquipmentProfitStatus() {
  const { companyId } = useCompanyId();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["equipment-profit-status", companyId],
    queryFn: () => fetchEquipmentProfit(companyId!),
    enabled: !!companyId,
  });

  return (
    <div className="rounded-xl border bg-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Resultado por Equipamento</h3>
          <p className="text-sm text-muted-foreground">Lucro ou prejuízo acumulado</p>
        </div>
        <Link href="/centro-custo" className="text-xs text-primary hover:underline font-medium">
          Ver detalhes
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <Wrench className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">Nenhum equipamento cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto max-h-72">
          {items.map((eq) => {
            const isProfit = eq.profit > 0;
            const isNeutral = eq.profit === 0;
            return (
              <div key={eq.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                {/* Icon */}
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isNeutral ? "bg-muted" : isProfit ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  {isNeutral
                    ? <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                    : isProfit
                    ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  }
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{eq.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge[eq.status]}`}>
                      {statusLabel[eq.status]}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{eq.code}</span>
                  </div>
                </div>

                {/* Profit value */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${isNeutral ? "text-muted-foreground" : isProfit ? "text-green-600" : "text-red-500"}`}>
                    {isProfit ? "+" : ""}{formatCurrency(eq.profit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isNeutral ? "Sem dados" : isProfit ? "Lucro" : "Prejuízo"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
