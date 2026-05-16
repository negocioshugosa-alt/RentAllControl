"use client";
// src/app/relatorios/page.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { BarChart3, Download, FileText, Users, Wrench, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate, formatDocument } from "@/lib/utils";
import { toast } from "sonner";

async function getCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id, companies(name)").eq("user_id", user.id).single();
  return { companyId: data?.company_id, companyName: (data as any)?.companies?.name };
}

type ReportType = "financeiro" | "equipamentos" | "clientes" | "contratos" | "inadimplencia";

const reports = [
  {
    id: "financeiro" as ReportType,
    title: "Relatório Financeiro",
    description: "Receitas, despesas e fluxo de caixa do período",
    icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    id: "equipamentos" as ReportType,
    title: "Relatório por Equipamento",
    description: "Lucratividade e indicadores por equipamento",
    icon: Wrench,
    color: "text-purple-600",
    bg: "bg-purple-500/10",
  },
  {
    id: "clientes" as ReportType,
    title: "Relatório de Clientes",
    description: "Cadastro completo e histórico financeiro",
    icon: Users,
    color: "text-green-600",
    bg: "bg-green-500/10",
  },
  {
    id: "contratos" as ReportType,
    title: "Contratos Ativos",
    description: "Todos os contratos em andamento",
    icon: FileText,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  {
    id: "inadimplencia" as ReportType,
    title: "Relatório de Inadimplência",
    description: "Clientes e contas com pagamentos em atraso",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-500/10",
  },
];

async function generateReport(type: ReportType, companyId: string, companyName: string, start: string, end: string) {
  const supabase = createClient();
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RentAllControl", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(companyName, pageWidth - 14, 18, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const reportTitle = reports.find((r) => r.id === type)?.title || "Relatório";
  doc.text(reportTitle, 14, 44);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${formatDate(new Date())} | Período: ${formatDate(start)} a ${formatDate(end)}`, 14, 51);

  if (type === "financeiro") {
    const { data: txs } = await supabase
      .from("transactions")
      .select("*, clients(name), equipment(name)")
      .eq("company_id", companyId)
      .gte("due_date", start)
      .lte("due_date", end)
      .order("due_date");

    const rows = (txs || []).map((tx) => [
      formatDate(tx.due_date),
      tx.type === "receita" ? "Receita" : "Despesa",
      tx.description,
      (tx as any).clients?.name || "—",
      tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
      `R$ ${Number(tx.amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Data", "Tipo", "Descrição", "Cliente", "Status", "Valor"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    const totals = (txs || []).reduce(
      (acc, tx) => {
        if (tx.type === "receita") acc.receita += Number(tx.amount);
        else acc.despesa += Number(tx.amount);
        return acc;
      },
      { receita: 0, despesa: 0 }
    );

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Receitas: ${formatCurrency(totals.receita)}`, 14, finalY);
    doc.text(`Despesas: ${formatCurrency(totals.despesa)}`, 80, finalY);
    doc.text(`Lucro: ${formatCurrency(totals.receita - totals.despesa)}`, 150, finalY);
  }

  if (type === "equipamentos") {
    const { data: eqs } = await supabase
      .from("equipment_financial_summary")
      .select("*")
      .eq("company_id", companyId)
      .order("net_profit", { ascending: false });

    const rows = (eqs || []).map((eq: any, i: number) => [
      i + 1,
      eq.equipment_name,
      eq.code,
      eq.status,
      `R$ ${Number(eq.total_revenue).toFixed(2)}`,
      `R$ ${Number(eq.total_costs).toFixed(2)}`,
      `R$ ${Number(eq.net_profit).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["#", "Nome", "Código", "Status", "Receita", "Custo", "Lucro"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  if (type === "contratos") {
    const { data: contracts } = await supabase
      .from("contracts")
      .select("*, clients(name), equipment(name, code)")
      .eq("company_id", companyId)
      .eq("status", "ativo")
      .order("start_date");

    const rows = (contracts || []).map((c: any) => [
      c.contract_number,
      c.clients?.name,
      c.equipment?.name,
      formatDate(c.start_date),
      c.end_date ? formatDate(c.end_date) : "Indeterminado",
      c.monthly_rate ? `R$ ${Number(c.monthly_rate).toFixed(2)}/mês` : c.daily_rate ? `R$ ${Number(c.daily_rate).toFixed(2)}/dia` : "—",
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Número", "Cliente", "Equipamento", "Início", "Término", "Valor"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  if (type === "inadimplencia") {
    const { data: txs } = await supabase
      .from("transactions")
      .select("*, clients(name)")
      .eq("company_id", companyId)
      .eq("type", "receita")
      .in("status", ["pendente", "vencido"])
      .lt("due_date", new Date().toISOString().split("T")[0])
      .order("due_date");

    const rows = (txs || []).map((tx) => [
      (tx as any).clients?.name || "—",
      tx.description,
      formatDate(tx.due_date),
      tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
      `R$ ${Number(tx.amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Cliente", "Descrição", "Vencimento", "Status", "Valor"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  if (type === "clientes") {
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name");

    const rows = (clients || []).map((c) => [
      c.name,
      c.type === "pf" ? "Pessoa Física" : "Pessoa Jurídica",
      formatDocument(c.document),
      c.email || "—",
      c.mobile || c.phone || "—",
      c.city ? `${c.city}/${c.state}` : "—",
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Nome", "Tipo", "CPF/CNPJ", "Email", "Telefone", "Cidade/UF"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  doc.save(`rentallcontrol-${type}-${new Date().toISOString().split("T")[0]}.pdf`);
}

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [generating, setGenerating] = useState<ReportType | null>(null);

  const { data: companyData } = useQuery({ queryKey: ["companyId"], queryFn: getCompanyId });

  async function handleGenerate(type: ReportType) {
    if (!companyData?.companyId) return;
    setGenerating(type);
    try {
      await generateReport(type, companyData.companyId, companyData.companyName || "Empresa", startDate, endDate);
      toast.success("Relatório gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Relatórios" subtitle="Exporte dados em PDF" />

      <div className="flex-1 p-6 space-y-6">
        {/* Date filter */}
        <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl border bg-card">
          <div>
            <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-muted-foreground pb-2.5">
              Os relatórios financeiros usarão este período de referência.
            </p>
          </div>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${report.bg}`}>
                  <report.icon className={`w-5 h-5 ${report.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{report.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleGenerate(report.id)}
                disabled={generating === report.id}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {generating === report.id ? "Gerando PDF…" : "Exportar PDF"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
