"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { useCompanyId } from "@/hooks/useCompanyId";
import { formatCurrency, formatPercent, calculateROI } from "@/lib/utils";
import { TrendingUp, TrendingDown, Trophy, DollarSign, Wrench } from "lucide-react";

async function fetchCostCenterData(companyId: string, start: string, end: string) {
  const supabase = createClient();

  // Buscar equipamentos
  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, code, status")
    .eq("company_id", companyId);

  if (!equipment?.length) return [];

  // Buscar transações pagas
  const { data: transactions } = await supabase
    .from("transactions")
    .select("equipment_id, type, amount, status, due_date, paid_date")
    .eq("company_id", companyId)
    .eq("status", "pago");

  // Buscar contratos
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, equipment_id")
    .eq("company_id", companyId);

  // Mapear e filtrar transações por data
  const filteredTxs = (transactions || []).map((t) => ({
    ...t,
    txDate: t.paid_date || t.due_date
  })).filter((t) => t.txDate >= start && t.txDate <= end);

  return equipment.map((eq) => {
    const txs = filteredTxs.filter((t) => t.equipment_id === eq.id);
    const total_revenue = txs
      .filter((t) => t.type === "receita")
      .reduce((s, t) => s + Number(t.amount), 0);
    const total_costs = txs
      .filter((t) => t.type === "despesa")
      .reduce((s, t) => s + Number(t.amount), 0);
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
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const { companyId, isLoading: loadingCompany } = useCompanyId();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["centro-custo", companyId, startDate, endDate],
    queryFn: () => fetchCostCenterData(companyId!, startDate, endDate),
    enabled: !!companyId,
  });

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "profit") return b.net_profit - a.net_profit;
    if (sortBy === "revenue") return b.total_revenue - a.total_revenue;
    if (sortBy === "cost") return b.total_costs - a.total_costs;
    return b.roi - a.roi;
  });

  const totalRevenue = items.reduce((s, i) => s + i.total_revenue, 0);
  const totalCosts = items.reduce((s, i) => s + i.total_costs, 0);
  const totalProfit = items.reduce((s, i) => s + i.net_profit, 0);

  const loading = isLoading || loadingCompany;

  return (
    <div className="flex flex-col flex-1">
      <Header title="Centro de Custo" subtitle="Lucratividade por equipamento" />
      <div className="flex-1 p-6 space-y-6">

        {/* Period filter */}
        <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl border bg-card items-end">
          <div>
            <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Receita Total", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-green-600", bg: "bg-green-500/10" },
            { label: "Custos Totais", value: formatCurrency(totalCosts), icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "Lucro Total", value: formatCurrency(totalProfit), icon: DollarSign, color: totalProfit >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-500/10" },
          ].map((card) => (
            <div key={card.label} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  {loading ? <div className="skeleton h-7 w-32 mt-1" /> :
                    <p className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <h3 className="font-semibold">Lucratividade por Equipamento</h3>
            </div>
            <div className="flex gap-1">
              {[
                { value: "profit", label: "Lucro" },
                { value: "revenue", label: "Receita" },
                { value: "cost", label: "Custo" },
                { value: "roi", label: "ROI" },
              ].map((s) => (
                <button key={s.value} onClick={() => setSortBy(s.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortBy === s.value ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
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
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="skeleton h-5 w-full rounded" /></td></tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum equipamento encontrado</p>
                  </td>
                </tr>
              ) : (
                sorted.map((item, index) => (
                  <tr key={item.equipment_id}>
                    <td className="text-center">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td>
                    <td>
                      <p className="font-medium">{item.equipment_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                    </td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium badge-${item.status}`}>{item.status}</span></td>
                    <td className="text-green-600 font-medium tabular-nums">{formatCurrency(item.total_revenue)}</td>
                    <td className="text-red-500 font-medium tabular-nums">{formatCurrency(item.total_costs)}</td>
                    <td className={`font-bold tabular-nums ${item.net_profit >= 0 ? "text-blue-600" : "text-red-500"}`}>{formatCurrency(item.net_profit)}</td>
                    <td><span className={`font-medium ${item.roi >= 0 ? "text-green-600" : "text-red-500"}`}>{formatPercent(item.roi)}</span></td>
                    <td className="hidden lg:table-cell text-muted-foreground">{item.total_contracts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
