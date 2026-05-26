"use client";
// src/components/dashboard/MetricCards.tsx
import {
  TrendingUp, TrendingDown, DollarSign, Wrench,
  FileText, AlertTriangle, Percent, Activity,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface Metrics {
  monthRevenue: number;
  monthExpenses: number;
  netProfit: number;
  overdueReceivables: number;
  overduePayables: number;
  totalEquipment: number;
  rented: number;
  available: number;
  maintenance: number;
  occupationRate: number;
  activeContracts: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: "blue" | "green" | "red" | "orange" | "purple";
}

const colorMap = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

function MetricCard({ title, value, icon: Icon, trend, trendLabel, color = "blue" }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold tabular-nums truncate">{value}</p>
          {trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
              {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export function MetricCards({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Receita do Mês"
        value={formatCurrency(metrics.monthRevenue)}
        icon={TrendingUp}
        color="green"
        trendLabel="Este mês"
      />
      <MetricCard
        title="Despesas do Mês"
        value={formatCurrency(metrics.monthExpenses)}
        icon={TrendingDown}
        color="red"
        trendLabel="Este mês"
      />
      <MetricCard
        title="Lucro Líquido"
        value={formatCurrency(metrics.netProfit)}
        icon={DollarSign}
        color={metrics.netProfit >= 0 ? "green" : "red"}
        trendLabel="Receita − Despesas"
      />
      <MetricCard
        title="Taxa de Ocupação"
        value={formatPercent(metrics.occupationRate)}
        icon={Percent}
        color="blue"
        trendLabel={`${metrics.rented} de ${metrics.totalEquipment} equipamentos`}
      />
      <MetricCard
        title="Equipamentos"
        value={String(metrics.totalEquipment)}
        icon={Wrench}
        color="purple"
        trendLabel={`${metrics.available} disponíveis`}
      />
      <MetricCard
        title="Contratos Ativos"
        value={String(metrics.activeContracts)}
        icon={FileText}
        color="blue"
        trendLabel="Em andamento"
      />
      <MetricCard
        title="Inadimplência"
        value={formatCurrency(metrics.overdueReceivables)}
        icon={AlertTriangle}
        color="red"
        trendLabel="Contas a receber vencidas"
      />
      <MetricCard
        title="Contas a Pagar Vencidas"
        value={formatCurrency(metrics.overduePayables)}
        icon={Activity}
        color="orange"
        trendLabel="Pagamentos em atraso"
      />
    </div>
  );
}
