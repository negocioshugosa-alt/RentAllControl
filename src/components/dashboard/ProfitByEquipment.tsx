"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { formatCurrency, truncate } from "@/lib/utils";
import { Wrench } from "lucide-react";

async function fetchProfitData(companyId: string) {
  const supabase = createClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, code, status")
    .eq("company_id", companyId);

  if (!equipment?.length) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("equipment_id, contract_id, type, amount, status")
    .eq("company_id", companyId)
    .in("status", ["pago", "recebido"]);

  const contractIds = Array.from(new Set((transactions || [])
    .map((t) => t.contract_id)
    .filter(Boolean)));

  const { data: contracts } = contractIds.length
    ? await supabase
      .from("contracts")
      .select("id, equipment_id")
      .in("id", contractIds)
    : { data: [] };

  const equipmentByContract = new Map((contracts || []).map((contract) => [
    contract.id,
    contract.equipment_id,
  ]));

  return equipment
    .map((eq) => {
      const txs = (transactions || []).filter((t) => {
        const equipmentId = t.equipment_id || (t.contract_id ? equipmentByContract.get(t.contract_id) : null);
        return equipmentId === eq.id;
      });
      const revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
      const costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
      return {
        equipment_name: eq.name,
        code: eq.code,
        net_profit: revenue - costs,
        revenue,
        costs,
      };
    })
    .sort((a, b) => b.net_profit - a.net_profit)
    .slice(0, 10);
}

export function ProfitByEquipment() {
  const { companyId } = useCompanyId();

  const { data = [], isLoading } = useQuery({
    queryKey: ["equipment-profit", companyId],
    queryFn: () => fetchProfitData(companyId!),
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="skeleton h-4 w-48 mb-2" />
        <div className="skeleton h-3 w-64 mb-6" />
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    );
  }

  // Pad with empty entries if fewer than 3 items so bars aren't huge
  const chartData = data.map((i) => ({
    name: truncate(i.equipment_name || i.code || "", 14),
    lucro: i.net_profit,
  }));

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm max-h-[420px] overflow-y-auto">
      <div className="mb-5">
        <h3 className="font-semibold">Lucratividade por Equipamento</h3>
        <p className="text-sm text-muted-foreground">Ranking de lucro líquido (Top 10)</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Wrench className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">Nenhum dado ainda.</p>
          <p className="text-xs mt-1 text-center">Vincule receitas e despesas a equipamentos no módulo Financeiro.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="40%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Lucro Líquido"]}
              contentStyle={{
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                background: "hsl(var(--card))",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="lucro" name="Lucro Líquido" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.lucro >= 0 ? "#3b82f6" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
