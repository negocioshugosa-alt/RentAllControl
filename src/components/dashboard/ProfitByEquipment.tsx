"use client";
// src/components/dashboard/ProfitByEquipment.tsx
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, truncate } from "@/lib/utils";

interface Props {
  companyId?: string;
}

async function fetchProfitData(companyId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("equipment_financial_summary")
    .select("*")
    .eq("company_id", companyId)
    .order("net_profit", { ascending: false })
    .limit(10);
  return data || [];
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
        <div className="skeleton h-4 w-48 mb-4" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-5">
        <h3 className="font-semibold">Lucratividade por Equipamento</h3>
        <p className="text-sm text-muted-foreground">Ranking de lucro líquido (Top 10)</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="equipment_name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => truncate(v, 12)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value)]}
            contentStyle={{
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="net_profit" name="Lucro Líquido" radius={[6, 6, 0, 0]}>
            {data.map((entry: any, index: number) => (
              <Cell key={index} fill={entry.net_profit >= 0 ? "#3b82f6" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
