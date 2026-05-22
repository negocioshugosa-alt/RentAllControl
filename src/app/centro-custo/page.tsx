"use client";
// src/app/centro-custo/page.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { formatCurrency, formatPercent, calculateROI } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Trophy, DollarSign, Wrench } from "lucide-react";

async function getCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  return data?.company_id;
}

async function fetchCostCenterData(companyId: string) {
  const supabase = createClient();

  // Tenta view primeiro
  const { data: viewData, error } = await supabase
    .from("equipment_financial_summary")
    .select("*")
    .eq("company_id", companyId)
    .order("net_profit", { ascending: false });

  if (!error && viewData && viewData.length > 0) {
    return viewData.map((row: any) => ({
      ...row,
      roi: calculateROI(Number(row.total_revenue), Number(row.total_costs)),
    }));
  }

  // Fallback manual
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

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, equipment_id")
    .eq("company_id", companyId);

  return equipment.map((eq) => {
    const txs = (transactions || []).filter((t) => t.equipment_id === eq.id);
    const total_revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
    const total_costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
    const net_profit = total_revenue - total_costs;
    const total_contracts = (contracts || []).filter((c) => c.equipment_id === eq.id).length;
    return {
      equipment_id: eq.id,
      equipment_name: eq.name,
      code: eq.code,
      status: eq.status,
      total_revenue,
      total_costs,
      net_profit,
      total_contracts,
      roi: calculateROI(total_revenue, total_costs),
    };
  }).sort((a, b) => b.net_profit - a.net_profit);
}

export default function CentroCustoPage() {
  const [sortBy, setSortBy] = useState<"profit" | "revenue" | "cost" | "roi">("profit");

  const { data: companyId } = useQuery({ queryKey: ["companyId"], queryFn: getCompanyId });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["centro-custo", companyId],
    queryFn: () => fetchCostCenterData(companyId!),
    enabled: !!companyId,
  });

  const sorted = [...items].sort((a: any, b: any) => {
    if (sortBy === "profit") return Number(b.net_profit) - Number(a.net_profit);
    if (sortBy === "revenue") return Number(b.total_revenue) - Number(a.total_revenue);
    if (sortBy === "cost") return Number(b.total_costs) - Number(a.total_costs);
    if (sortBy === "roi") return b.roi - a.roi;
    return 0;
  });

  const totalRevenue = items.reduce((s: number, i: any) => s + Number(i.total_revenue), 0);
  const totalCosts = items.reduce((s: number, i: any) => s + Number(i.total_costs), 0);
  const totalProfit = items.reduce((s: number, i: any) => s + Number(i.net_profit), 0);

  const chartData = sorted.slice(0, 10).map((i: any) => ({
    name: i.equipment_name?.split(" ").slice(0, 2).join(" "),
    lucro: Number(i.net_profit),
    receita: Number(i.total_revenue),
    custo: Number(i.total_costs),
  }));

  return (
    <div className="flex flex-col flex-1">
      <Header title="Centro de Custo" subtitle="Lucratividade por equipamento" />

      <div className="flex-1 p-6 space-y-6">
        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Receita Total", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-green-600", bg: "bg-green-500/10" },
            { label: "Custos Totais", value: formatCurrency(totalCosts), icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "Lucro Total", value: formatCurrency(totalProfit), icon: DollarSign, color: totalProfit >= 0 ? "text-blue-600" : "text-red-500", bg: totalProfit >= 0 ? "bg-blue-500/10" : "bg-red-500/10" },
          ].map((card) => (
            <div key={card.label} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Comparativo Financeiro (Top 10)</h3>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Wrench className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Nenhum dado ainda. Cadastre equipamentos e vincule transações.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ border: "1px solid hsl(var(--border))", borderRadius: "8px", background: "hsl(var(--card))", fontSize: "12px" }}
                />
                <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" name="Custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.lucro >= 0 ? "#3b82f6" : "#f97316"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <h3 className="font-semibold">Ranking de Lucratividade</h3>
            </div>
            <div className="flex gap-1">
              {[
                { value: "profit", label: "Lucro" },
                { value: "revenue", label: "Receita" },
                { value: "cost", label: "Custo" },
                { value: "roi", label: "ROI" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSortBy(s.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortBy === s.value ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <table className="data-table w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="w-8">#</th>
                <th>Equipamento</th>
                <th>Status</th>
                <th>Receita</th>
                <th>Custos</th>
                <th>Lucro</th>
                <th>ROI</th>
                <th className="hidden lg:table-cell">Contratos</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="skeleton h-5 w-full rounded" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum equipamento cadastrado</p>
                  </td>
                </tr>
              ) : (
                sorted.map((item: any, index: number) => {
                  const profit = Number(item.net_profit);
                  return (
                    <tr key={item.equipment_id}>
                      <td className="font-bold text-muted-foreground text-center">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </td>
                      <td>
                        <p className="font-medium">{item.equipment_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium badge-${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-green-600 font-medium tabular-nums">{formatCurrency(Number(item.total_revenue))}</td>
                      <td className="text-red-500 font-medium tabular-nums">{formatCurrency(Number(item.total_costs))}</td>
                      <td className={`font-bold tabular-nums ${profit >= 0 ? "text-blue-600" : "text-red-500"}`}>{formatCurrency(profit)}</td>
                      <td><span className={`font-medium ${item.roi >= 0 ? "text-green-600" : "text-red-500"}`}>{formatPercent(item.roi)}</span></td>
                      <td className="hidden lg:table-cell text-muted-foreground">{item.total_contracts}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
