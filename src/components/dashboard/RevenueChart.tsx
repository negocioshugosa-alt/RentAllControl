"use client";
// src/components/dashboard/RevenueChart.tsx
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

async function fetchChartData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.company_id) return [];

  // Buscar últimos 6 meses
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      date,
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM/yy", { locale: ptBR }),
      start: startOfMonth(date).toISOString().split("T")[0],
      end: endOfMonth(date).toISOString().split("T")[0],
    };
  });

  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, amount, status, paid_date, due_date")
    .eq("company_id", profile.company_id)
    .gte("due_date", months[0].start)
    .lte("due_date", months[5].end);

  return months.map((m) => {
    const txs = (transactions || []).filter((t) =>
      t.due_date >= m.start && t.due_date <= m.end
    );
    const revenue = txs
      .filter((t) => t.type === "receita" && t.status === "pago")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txs
      .filter((t) => t.type === "despesa" && t.status === "pago")
      .reduce((s, t) => s + Number(t.amount), 0);
    // Também incluir pendentes/vencidos para ter visão completa
    const revenueTotal = txs
      .filter((t) => t.type === "receita" && t.status !== "cancelado")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expensesTotal = txs
      .filter((t) => t.type === "despesa" && t.status !== "cancelado")
      .reduce((s, t) => s + Number(t.amount), 0);

    return {
      month: m.label,
      receita: revenueTotal,
      despesas: expensesTotal,
      lucro: revenueTotal - expensesTotal,
    };
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card shadow-lg p-4 text-sm min-w-[200px]">
      <p className="font-semibold mb-2 capitalize">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: fetchChartData,
    staleTime: 1000 * 60 * 5,
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

  const hasData = data.some((d) => d.receita > 0 || d.despesas > 0);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-5">
        <h3 className="font-semibold">Evolução Financeira</h3>
        <p className="text-sm text-muted-foreground">Receitas, despesas e lucro — últimos 6 meses</p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-sm">Nenhuma movimentação financeira registrada ainda.</p>
          <p className="text-xs mt-1">Cadastre receitas e despesas no módulo Financeiro.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
              formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>}
            />
            <Area type="monotone" dataKey="receita" name="Receita" stroke="#22c55e" strokeWidth={2} fill="url(#gradReceita)" />
            <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#gradDespesas)" />
            <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradLucro)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
