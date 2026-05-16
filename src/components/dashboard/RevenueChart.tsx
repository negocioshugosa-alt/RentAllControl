"use client";
// src/components/dashboard/RevenueChart.tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
}

const DEMO_DATA = [
  { month: "Jul", revenue: 42000, expenses: 18000, profit: 24000 },
  { month: "Ago", revenue: 48500, expenses: 19500, profit: 29000 },
  { month: "Set", revenue: 45000, expenses: 17000, profit: 28000 },
  { month: "Out", revenue: 52000, expenses: 22000, profit: 30000 },
  { month: "Nov", revenue: 49000, expenses: 20000, profit: 29000 },
  { month: "Dez", revenue: 55000, expenses: 24000, profit: 31000 },
  { month: "Jan", revenue: 58000, expenses: 21000, profit: 37000 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card shadow-lg p-4 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: Props) {
  const chartData = data.length ? data : DEMO_DATA;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-5">
        <h3 className="font-semibold">Evolução Financeira</h3>
        <p className="text-sm text-muted-foreground">Receitas, despesas e lucro nos últimos meses</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
            formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>}
          />
          <Area type="monotone" dataKey="revenue" name="Receita" stroke="#3b82f6" strokeWidth={2} fill="url(#revenue)" />
          <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#expenses)" />
          <Area type="monotone" dataKey="profit" name="Lucro" stroke="#22c55e" strokeWidth={2} fill="url(#profit)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
