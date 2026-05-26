"use client";
// src/components/financeiro/CashFlowChart.tsx
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { companyId: string }

async function fetchCashFlowData(companyId: string) {
  const supabase = createClient();
  const start = subMonths(new Date(), 11);
  const { data } = await supabase
    .from("transactions")
    .select("type, amount, due_date, paid_date, status")
    .eq("company_id", companyId)
    .gte("due_date", start.toISOString().split("T")[0]);

  const months = eachMonthOfInterval({ start, end: new Date() });

  return months.map((month) => {
    const key = format(month, "yyyy-MM");
    const txs = (data || []).filter((t) => t.due_date?.startsWith(key));
    const revenue = txs.filter((t) => t.type === "receita" && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txs.filter((t) => t.type === "despesa" && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0);
    return {
      month: format(month, "MMM/yy", { locale: ptBR }),
      revenue,
      expenses,
      balance: revenue - expenses,
    };
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card shadow-lg p-4 text-sm min-w-[180px]">
      <p className="font-semibold mb-2 capitalize">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4 py-0.5">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ companyId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["cash-flow", companyId],
    queryFn: () => fetchCashFlowData(companyId),
    enabled: !!companyId,
  });

  if (isLoading) return <div className="skeleton h-72 rounded-xl" />;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-5">
        <h3 className="font-semibold">Fluxo de Caixa</h3>
        <p className="text-sm text-muted-foreground">Últimos 12 meses — receitas, despesas e saldo</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
          <Bar dataKey="revenue" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
          <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.85} />
          <Line type="monotone" dataKey="balance" name="Saldo" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
