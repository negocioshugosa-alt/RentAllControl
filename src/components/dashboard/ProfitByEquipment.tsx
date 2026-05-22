"use client";
// src/components/dashboard/ProfitByEquipment.tsx
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, truncate } from "@/lib/utils";
import { Wrench } from "lucide-react";

interface Props {
  companyId?: string;
}

async function fetchProfitData(companyId: string) {
  const supabase = createClient();

  // Tenta usar a view primeiro
  const { data: viewData, error } = await supabase
    .from("equipment_financial_summary")
    .select("*")
    .eq("company_id", companyId)
    .order("net_profit", { ascending: false })
    .limit(10);

  if (!error && viewData && viewData.length > 0) return viewData;

  // Fallback: calcular manualmente via transactions
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, code, status")
    .eq("company_id", companyId);

  if (!equipment?.length) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("equipment_id, type, amount, status")
    .eq("company_id", companyId)
    .eq("status", "pago");

  return equipment.map((eq) => {
    const txs = (transactions || []).filter((t) => t.equipment_id === eq.id);
    const total_revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
    const total_costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
    return {
      equipment_id: eq.id,
      equipment_name: eq.name,
      code: eq.code,
      status: eq.status,
      total_revenue,
      total_costs,
      net_profit: total_revenue - total_costs,
      total_contracts: 0,
    };
  }).sort((a, b) => b.net_profit - a.net_profit);
}

export function ProfitByEquipment({ companyId }: Props) {
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

  const chartData = data.slice(0, 10).map((i: any) => ({
    name: truncate(i.equipment_name || "", 12),
    lucro: Number(i.net_profit),
  }));

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-5">
        <h3 className="font-semibold">Lucratividade por Equipamento</h3>
        <p className="text-sm text-muted-foreground">Ranking de lucro líquido (Top 10)</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Wrench className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">Nenhum dado de lucratividade ainda.</p>
          <p className="text-xs mt-1">Vincule receitas e despesas a equipamentos.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            <Bar dataKey="lucro" name="Lucro Líquido" radius={[6, 6, 0, 0]}>
              {chartData.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.lucro >= 0 ? "#3b82f6" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
