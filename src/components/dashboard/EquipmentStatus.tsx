"use client";
// src/components/dashboard/EquipmentStatus.tsx
// Renomeado internamente para EquipmentProfitLoss — mantém o nome do arquivo
// para não quebrar o import existente no dashboard/page.tsx.
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { formatCurrency, truncate } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Wrench } from "lucide-react";

interface ProfitRow {
  id: string;
  name: string;
  code: string;
  revenue: number;
  costs: number;
  profit: number;
}

async function fetchEquipmentProfit(companyId: string): Promise<ProfitRow[]> {
  const supabase = createClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, code")
    .eq("company_id", companyId)
    .order("name");

  if (!equipment?.length) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("equipment_id, contract_id, type, amount, status")
    .eq("company_id", companyId)
    .in("status", ["pago", "recebido"]);

  const contractIds = Array.from(
    new Set((transactions || []).map((t) => t.contract_id).filter(Boolean))
  );

  const { data: contracts } = contractIds.length
    ? await supabase
        .from("contracts")
        .select("id, equipment_id")
        .in("id", contractIds)
    : { data: [] };

  const equipmentByContract = new Map(
    (contracts || []).map((c) => [c.id, c.equipment_id])
  );

  return equipment
    .map((eq) => {
      const txs = (transactions || []).filter((t) => {
        const eqId =
          t.equipment_id ||
          (t.contract_id ? equipmentByContract.get(t.contract_id) : null);
        return eqId === eq.id;
      });
      const revenue = txs
        .filter((t) => t.type === "receita")
        .reduce((s, t) => s + Number(t.amount), 0);
      const costs = txs
        .filter((t) => t.type === "despesa")
        .reduce((s, t) => s + Number(t.amount), 0);
      return { id: eq.id, name: eq.name, code: eq.code, revenue, costs, profit: revenue - costs };
    })
    .sort((a, b) => b.profit - a.profit);
}

// Props kept for compatibility with dashboard/page.tsx which passes `metrics`
export function EquipmentStatus(_props: any) {
  const { companyId } = useCompanyId();

  const { data = [], isLoading } = useQuery({
    queryKey: ["equipment-profit-status", companyId],
    queryFn: () => fetchEquipmentProfit(companyId!),
    enabled: !!companyId,
  });

  return (
    <div className="rounded-xl border bg-card p-5 h-[390px] flex flex-col">
      <div className="mb-4">
        <h3 className="font-semibold">Resultado por Equipamento</h3>
        <p className="text-sm text-muted-foreground">Lucro / Prejuízo acumulado</p>
      </div>

      {isLoading ? (
        <div className="space-y-2 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <Wrench className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm text-center">
            Nenhum dado ainda. Vincule receitas e despesas a equipamentos no
            módulo Financeiro.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {data.map((eq) => {
            const isProfit = eq.profit > 0;
            const isBreakEven = eq.profit === 0;

            return (
              <div
                key={eq.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 border bg-background/50 hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isBreakEven
                      ? "bg-muted text-muted-foreground"
                      : isProfit
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {isBreakEven ? (
                    <Minus className="w-4 h-4" />
                  ) : isProfit ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {truncate(eq.name, 20)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {eq.code}
                  </p>
                </div>

                {/* Values */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-semibold ${
                      isBreakEven
                        ? "text-muted-foreground"
                        : isProfit
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {isProfit ? "+" : ""}
                    {formatCurrency(eq.profit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R$ {(eq.revenue / 1000).toFixed(1)}k / {(eq.costs / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {data.length > 0 && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Lucro
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Prejuízo
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
            Neutro
          </div>
          <span>{data.length} equipamentos</span>
        </div>
      )}
    </div>
  );
}
