"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { useCompanyContext } from "@/hooks/useCompanyId";
import { BarChart3, Download, FileText, Users, Wrench, DollarSign, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { formatCurrency, formatDate, formatDocument } from "@/lib/utils";
import { toast } from "sonner";

type ReportType = "financeiro" | "equipamentos" | "clientes" | "contratos" | "inadimplencia";
type ExportFormat = "pdf" | "excel";

const reports = [
  { id: "financeiro" as ReportType, title: "Relatório Financeiro", description: "Receitas, despesas e fluxo de caixa do período", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-500/10" },
  { id: "equipamentos" as ReportType, title: "Relatório por Equipamento", description: "Lucratividade e indicadores por equipamento", icon: Wrench, color: "text-purple-600", bg: "bg-purple-500/10" },
  { id: "clientes" as ReportType, title: "Relatório de Clientes", description: "Cadastro completo e histórico financeiro", icon: Users, color: "text-green-600", bg: "bg-green-500/10" },
  { id: "contratos" as ReportType, title: "Contratos Ativos", description: "Todos os contratos em andamento", icon: FileText, color: "text-orange-600", bg: "bg-orange-500/10" },
  { id: "inadimplencia" as ReportType, title: "Inadimplência", description: "Clientes e contas com pagamentos em atraso", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-500/10" },
];

async function exportExcel(type: ReportType, companyId: string, companyName: string, start: string, end: string) {
  const ExcelJS = await import("exceljs");
  const supabase = createClient();
  let rows: any[] = [];
  let sheetName = "Relatório";

  if (type === "financeiro") {
    const { data } = await supabase
      .from("transactions").select("*, clients(name), equipment(name)")
      .eq("company_id", companyId).gte("due_date", start).lte("due_date", end).order("due_date");
    sheetName = "Financeiro";
    rows = (data || []).map((t) => ({
      Data: formatDate(t.due_date),
      Tipo: t.type === "receita" ? "Receita" : "Despesa",
      Descrição: t.description,
      Categoria: t.category,
      Cliente: (t as any).clients?.name || "—",
      Status: t.status,
      "Valor (R$)": Number(t.amount),
    }));
  }
  if (type === "equipamentos") {
    const { data } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    sheetName = "Equipamentos";
    rows = (data || []).map((e) => ({
      Código: e.code, Nome: e.name, Categoria: e.category,
      Marca: e.brand || "—", Modelo: e.model || "—", Ano: e.year || "—", Status: e.status,
      "Diária (R$)": e.daily_rate ? Number(e.daily_rate) : 0,
      "Mensalidade (R$)": e.monthly_rate ? Number(e.monthly_rate) : 0,
    }));
  }
  if (type === "clientes") {
    const { data } = await supabase.from("clients").select("*").eq("company_id", companyId).order("name");
    sheetName = "Clientes";
    rows = (data || []).map((c) => ({
      Nome: c.name, Tipo: c.type === "pf" ? "Pessoa Física" : "Pessoa Jurídica",
      "CPF/CNPJ": formatDocument(c.document), Email: c.email || "—",
      Telefone: c.mobile || c.phone || "—", Cidade: c.city || "—", UF: c.state || "—",
    }));
  }
  if (type === "contratos") {
    const { data } = await supabase
      .from("contracts").select("*, clients(name), equipment(name, code)")
      .eq("company_id", companyId).eq("status", "ativo").order("start_date");
    sheetName = "Contratos";
    rows = (data || []).map((c: any) => ({
      Número: c.contract_number, Cliente: c.clients?.name || "—",
      Equipamento: c.equipment?.name || "—",
      Início: formatDate(c.start_date),
      Término: c.end_date ? formatDate(c.end_date) : "Indeterminado",
      "Mensalidade (R$)": c.monthly_rate ? Number(c.monthly_rate) : 0,
      "Diária (R$)": c.daily_rate ? Number(c.daily_rate) : 0,
      Status: c.status,
    }));
  }
  if (type === "inadimplencia") {
    const { data } = await supabase
      .from("transactions").select("*, clients(name)")
      .eq("company_id", companyId).eq("type", "receita")
      .in("status", ["pendente", "vencido"])
      .lt("due_date", new Date().toISOString().split("T")[0]).order("due_date");
    sheetName = "Inadimplência";
    rows = (data || []).map((t) => {
      const days = Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / 86400000);
      return {
        Cliente: (t as any).clients?.name || "—", Descrição: t.description,
        Vencimento: formatDate(t.due_date), "Dias em Atraso": days,
        Status: t.status, "Valor (R$)": Number(t.amount),
      };
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] || {});

  if (headers.length) {
    ws.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 2, 15),
    }));
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
  }

  const wsInfo = wb.addWorksheet("Informações");
  wsInfo.addRows([
    ["RentAllControl — " + reports.find((r) => r.id === type)?.title],
    ["Empresa:", companyName],
    ["Período:", `${formatDate(start)} a ${formatDate(end)}`],
    ["Gerado em:", formatDate(new Date())],
    ["Total de registros:", rows.length],
  ]);
  wsInfo.getColumn(1).width = 24;
  wsInfo.getColumn(2).width = 36;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rentallcontrol-${type}-${new Date().toISOString().split("T")[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(type: ReportType, companyId: string, companyName: string, start: string, end: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const supabase = createClient();
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RentAllControl", 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyName, W - 14, 13, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(reports.find((r) => r.id === type)?.title || "Relatório", 14, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${formatDate(new Date())} | Período: ${formatDate(start)} a ${formatDate(end)}`, 14, 49);

  if (type === "financeiro") {
    const { data } = await supabase.from("transactions").select("*, clients(name)")
      .eq("company_id", companyId).gte("due_date", start).lte("due_date", end).order("due_date");
    autoTable(doc, {
      startY: 56,
      head: [["Data", "Tipo", "Descrição", "Cliente", "Status", "Valor"]],
      body: (data || []).map((t) => [
        formatDate(t.due_date), t.type === "receita" ? "Receita" : "Despesa",
        t.description.substring(0, 40), (t as any).clients?.name || "—",
        t.status, `R$ ${Number(t.amount).toFixed(2)}`,
      ]),
      theme: "striped", headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
    });
    const totals = (data || []).reduce((a, t) => { t.type === "receita" ? a.r += Number(t.amount) : a.d += Number(t.amount); return a; }, { r: 0, d: 0 });
    const fy = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(`Receitas: ${formatCurrency(totals.r)}   Despesas: ${formatCurrency(totals.d)}   Lucro: ${formatCurrency(totals.r - totals.d)}`, 14, fy);
  }
  if (type === "equipamentos") {
    const { data } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    autoTable(doc, { startY: 56, head: [["Código", "Nome", "Categoria", "Marca", "Ano", "Status", "Diária"]],
      body: (data || []).map((e) => [e.code, e.name, e.category, e.brand || "—", e.year || "—", e.status, e.daily_rate ? `R$ ${Number(e.daily_rate).toFixed(2)}` : "—"]),
      theme: "striped", headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
    });
  }
  if (type === "clientes") {
    const { data } = await supabase.from("clients").select("*").eq("company_id", companyId).order("name");
    autoTable(doc, { startY: 56, head: [["Nome", "Tipo", "CPF/CNPJ", "Email", "Telefone", "Cidade/UF"]],
      body: (data || []).map((c) => [c.name, c.type === "pf" ? "PF" : "PJ", formatDocument(c.document), c.email || "—", c.mobile || c.phone || "—", c.city ? `${c.city}/${c.state}` : "—"]),
      theme: "striped", headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
    });
  }
  if (type === "contratos") {
    const { data } = await supabase.from("contracts").select("*, clients(name), equipment(name)")
      .eq("company_id", companyId).eq("status", "ativo").order("start_date");
    autoTable(doc, { startY: 56, head: [["Número", "Cliente", "Equipamento", "Início", "Término", "Valor"]],
      body: (data || []).map((c: any) => [c.contract_number, c.clients?.name || "—", c.equipment?.name || "—",
        formatDate(c.start_date), c.end_date ? formatDate(c.end_date) : "Indeterminado",
        c.monthly_rate ? `R$ ${Number(c.monthly_rate).toFixed(2)}/mês` : c.daily_rate ? `R$ ${Number(c.daily_rate).toFixed(2)}/dia` : "—"]),
      theme: "striped", headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
    });
  }
  if (type === "inadimplencia") {
    const { data } = await supabase.from("transactions").select("*, clients(name)")
      .eq("company_id", companyId).eq("type", "receita").in("status", ["pendente", "vencido"])
      .lt("due_date", new Date().toISOString().split("T")[0]).order("due_date");
    autoTable(doc, { startY: 56, head: [["Cliente", "Descrição", "Vencimento", "Atraso", "Status", "Valor"]],
      body: (data || []).map((t) => {
        const days = Math.floor((new Date().getTime() - new Date(t.due_date).getTime()) / 86400000);
        return [(t as any).clients?.name || "—", t.description, formatDate(t.due_date), `${days} dias`, t.status, `R$ ${Number(t.amount).toFixed(2)}`];
      }),
      theme: "striped", headStyles: { fillColor: [220, 38, 38], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
    });
  }

  doc.save(`rentallcontrol-${type}-${new Date().toISOString().split("T")[0]}.pdf`);
}

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: ctx, isLoading } = useCompanyContext();

  async function handleExport(type: ReportType, format: ExportFormat) {
    if (!ctx?.companyId) { toast.error("Aguarde carregar os dados da empresa..."); return; }
    const key = `${type}-${format}`;
    setGenerating(key);
    try {
      if (format === "excel") {
        await exportExcel(type, ctx.companyId, ctx.companyName, startDate, endDate);
      } else {
        await exportPdf(type, ctx.companyId, ctx.companyName, startDate, endDate);
      }
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} gerado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar: " + (err.message || "tente novamente"));
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Relatórios" subtitle="Exporte dados em PDF ou Excel" />
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
          <p className="text-sm text-muted-foreground pb-2">
            {isLoading ? "Carregando empresa…" : ctx ? `✓ ${ctx.companyName}` : ""}
          </p>
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
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleExport(report.id, "pdf")}
                  disabled={!!generating || isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-600 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {generating === `${report.id}-pdf` ? "Gerando…" : "PDF"}
                </button>
                <button
                  onClick={() => handleExport(report.id, "excel")}
                  disabled={!!generating || isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {generating === `${report.id}-excel` ? "Gerando…" : "Excel"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
