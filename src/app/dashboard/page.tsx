// src/app/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { EquipmentStatus } from "@/components/dashboard/EquipmentStatus";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { ProfitByEquipment } from "@/components/dashboard/ProfitByEquipment";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

async function getDashboardData(companyId: string) {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [
    { data: transactions },
    { data: equipment },
    { data: contracts },
    { data: alerts },
    { data: revenueChart },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("company_id", companyId)
      .order("due_date", { ascending: false })
      .limit(200),
    supabase.from("equipment").select("*").eq("company_id", companyId),
    supabase
      .from("contracts")
      .select("*, clients(name), equipment(name)")
      .eq("company_id", companyId)
      .eq("status", "ativo"),
    supabase
      .from("alerts")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.rpc("get_monthly_chart", { p_company_id: companyId }).limit(12),
  ]);

  const txs = transactions || [];

  const monthRevenue = txs
    .filter((t) => t.type === "receita" && t.status === "pago" && t.paid_date >= monthStart)
    .reduce((s, t) => s + Number(t.amount), 0);

  const monthExpenses = txs
    .filter((t) => t.type === "despesa" && t.status === "pago" && t.paid_date >= monthStart)
    .reduce((s, t) => s + Number(t.amount), 0);

  const overdueReceivables = txs
    .filter((t) => t.type === "receita" && t.status === "vencido")
    .reduce((s, t) => s + Number(t.amount), 0);

  const overduePayables = txs
    .filter((t) => t.type === "despesa" && t.status === "vencido")
    .reduce((s, t) => s + Number(t.amount), 0);

  const eq = equipment || [];
  const rented = eq.filter((e) => e.status === "alugado").length;
  const available = eq.filter((e) => e.status === "disponivel").length;
  const maintenance = eq.filter((e) => e.status === "manutencao").length;
  const occupationRate = eq.length > 0 ? (rented / eq.length) * 100 : 0;

  return {
    metrics: {
      monthRevenue,
      monthExpenses,
      netProfit: monthRevenue - monthExpenses,
      overdueReceivables,
      overduePayables,
      totalEquipment: eq.length,
      rented,
      available,
      maintenance,
      occupationRate,
      activeContracts: contracts?.length || 0,
    },
    equipment: eq,
    recentTransactions: txs.slice(0, 8),
    alerts: alerts || [],
    revenueChart: revenueChart || [],
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  const data = await getDashboardData(profile?.company_id);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle={`Resumo — ${formatDate(new Date(), "MMMM yyyy")}`}
      />
      <div className="flex-1 p-6 space-y-6">
        <MetricCards metrics={data.metrics} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RevenueChart data={data.revenueChart} />
          </div>
          <div>
            <EquipmentStatus metrics={data.metrics} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentTransactions transactions={data.recentTransactions} />
          </div>
          <div className="space-y-6">
            <AlertsWidget alerts={data.alerts} />
          </div>
        </div>

        <ProfitByEquipment companyId={profile?.company_id} />
      </div>
    </div>
  );
}
