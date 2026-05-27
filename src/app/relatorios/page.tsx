"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { useCompanyContext } from "@/hooks/useCompanyId";
import { BarChart3, Download, FileText, Users, Wrench, DollarSign, AlertTriangle, FileSpreadsheet, TrendingUp, Activity } from "lucide-react";
import { formatCurrency, formatDate, formatDocument } from "@/lib/utils";
import { toast } from "sonner";

type ReportType = "financeiro" | "equipamentos" | "equipamentos_resumido" | "clientes" | "contratos" | "inadimplencia" | "kpis_saude";
type ExportFormat = "pdf" | "excel";

const reports = [
  { id: "financeiro" as ReportType, title: "Relatório Financeiro", description: "Receitas, despesas e fluxo de caixa do período", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-500/10" },
  { id: "equipamentos" as ReportType, title: "Relatório por Equipamento", description: "Detalhamento de todos os lançamentos por equipamento", icon: Wrench, color: "text-purple-600", bg: "bg-purple-500/10" },
  { id: "equipamentos_resumido" as ReportType, title: "Resumo por Equipamento", description: "Tabela consolidada de faturamento, custo e ROI", icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-500/10" },
  { id: "clientes" as ReportType, title: "Relatório de Clientes", description: "Cadastro completo e histórico financeiro", icon: Users, color: "text-green-600", bg: "bg-green-500/10" },
  { id: "contratos" as ReportType, title: "Contratos Ativos", description: "Todos os contratos em andamento", icon: FileText, color: "text-orange-600", bg: "bg-orange-500/10" },
  { id: "inadimplencia" as ReportType, title: "Inadimplência", description: "Clientes e contas com pagamentos em atraso", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-500/10" },
  { id: "kpis_saude" as ReportType, title: "Saúde da Empresa (KPIs)", description: "Indicadores executivos, margens, ocupação e categorias", icon: Activity, color: "text-teal-600", bg: "bg-teal-500/10" },
];

const categoryLabels: Record<string, string> = {
  aluguel: "Aluguel",
  caucao: "Caução",
  multa_contrato: "Multa",
  combustivel: "Combustível",
  manutencao: "Manutenção",
  pneus: "Pneus",
  pecas: "Peças",
  seguro: "Seguro",
  ipva: "IPVA",
  lavagem: "Lavagem",
  multas: "Multas",
  salarios: "Salários",
  marketing: "Marketing",
  escritorio: "Escritório",
  financiamento: "Financiamento",
  impostos: "Impostos",
  outros: "Outros"
};

async function exportExcel(type: ReportType, companyId: string, companyName: string, start: string, end: string) {
  const ExcelJS = await import("exceljs");
  const supabase = createClient();
  let rows: any[] = [];
  let sheetName = "Relatório";

  const statusLabels: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    vencido: "Vencido",
    cancelado: "Cancelado"
  };

  if (type === "financeiro") {
    const { data } = await supabase
      .from("transactions").select("*, clients(name), suppliers(name), equipment(name)")
      .eq("company_id", companyId).neq("status", "cancelado");

    const filteredTxs = (data || [])
      .map((t) => ({
        ...t,
        txDate: t.status === "pago" && t.paid_date ? t.paid_date : t.due_date
      }))
      .filter((t) => t.txDate >= start && t.txDate <= end)
      .sort((a, b) => a.txDate.localeCompare(b.txDate));

    sheetName = "Financeiro";
    rows = filteredTxs.map((t) => ({
      Data: formatDate(t.txDate),
      Tipo: t.type === "receita" ? "Receita" : "Despesa",
      Descrição: t.description,
      Categoria: categoryLabels[t.category] || t.category,
      "Cliente/Fornecedor": t.type === "receita"
        ? ((t as any).clients?.name || "—")
        : ((t as any).suppliers?.name || "—"),
      Status: statusLabels[t.status] || t.status,
      "Valor (R$)": Number(t.amount),
    }));
  }
  if (type === "equipamentos") {
    // Fetch full transaction details for block-per-equipment format
    const { data: equipments } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    const { data: transactions } = await supabase.from("transactions")
      .select("equipment_id, contract_id, type, category, description, status, amount, client_id, supplier_id, due_date, paid_date, clients(name), suppliers(name), contracts(contract_number)")
      .eq("company_id", companyId).neq("status", "cancelado");
    const { data: contractsList } = await supabase.from("contracts").select("id, equipment_id").eq("company_id", companyId);

    const eqMap = new Map((contractsList || []).map((c) => [c.id, c.equipment_id]));
    const list = equipments || [];
    sheetName = "Equipamentos";

    // Map and filter transactions by calculated date
    const mappedTxs = (transactions || []).map((t) => ({
      ...t,
      txDate: t.status === "pago" && t.paid_date ? t.paid_date : t.due_date
    })).filter((t) => t.txDate >= start && t.txDate <= end);

    const eqWb = new ExcelJS.Workbook();
    const eqWs = eqWb.addWorksheet(sheetName);

    // Define columns
    const eqHeaders = ["Código", "Tipo", "Descrição", "Categoria", "Cliente/Fornecedor", "Contrato", "Status", "Valor (R$)"];
    eqWs.columns = eqHeaders.map((h) => ({ header: h, key: h, width: h === "Descrição" ? 30 : h === "Valor (R$)" ? 15 : h === "Cliente/Fornecedor" ? 22 : h === "Contrato" ? 18 : 16 }));
    eqWs.getRow(1).font = { bold: true };

    let currentRow = 2;
    let totalEquipments = 0;

    for (const eq of list) {
      const txs = mappedTxs.filter((t) => {
        const eqId = t.equipment_id || (t.contract_id ? eqMap.get(t.contract_id) : null);
        return eqId === eq.id;
      });

      if (txs.length === 0) continue;
      totalEquipments++;

      // Add each transaction row
      for (const tx of txs) {
        const row = eqWs.addRow({
          "Código": eq.code,
          "Tipo": tx.type === "receita" ? "Receita" : "Despesa",
          "Descrição": tx.description || "—",
          "Categoria": categoryLabels[tx.category] || tx.category,
          "Cliente/Fornecedor": tx.type === "receita"
            ? ((tx as any).clients?.name || "—")
            : ((tx as any).suppliers?.name || "—"),
          "Contrato": (tx as any).contracts?.contract_number || "—",
          "Status": statusLabels[tx.status] || tx.status,
          "Valor (R$)": Number(tx.amount),
        });
        // Color-code type column
        const typeCell = row.getCell("Tipo");
        if (tx.type === "receita") {
          typeCell.font = { color: { argb: "FF16A34A" }, bold: true };
        } else {
          typeCell.font = { color: { argb: "FFDC2626" }, bold: true };
        }
        currentRow++;
      }

      // Calculate totals for this equipment
      const revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
      const costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
      const profit = revenue - costs;
      const roi = costs > 0 ? (profit / costs) * 100 : (revenue > 0 ? 100 : 0);

      // Add summary labels row
      const labelsRow = eqWs.addRow({
        "Código": "",
        "Tipo": "",
        "Descrição": "",
        "Categoria": "",
        "Cliente/Fornecedor": "Total Receitas (R$)",
        "Contrato": "Total Despesas (R$)",
        "Status": "Lucro Líquido (R$)",
        "Valor (R$)": "ROI (%)" as any,
      });
      labelsRow.font = { bold: true, size: 9 };
      labelsRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      });
      currentRow++;

      // Add summary values row
      const valuesRow = eqWs.addRow({
        "Código": "",
        "Tipo": "",
        "Descrição": "",
        "Categoria": "",
        "Cliente/Fornecedor": revenue,
        "Contrato": costs,
        "Status": profit,
        "Valor (R$)": Number(roi.toFixed(1)),
      });
      valuesRow.font = { bold: true };
      valuesRow.getCell("Cliente/Fornecedor").numFmt = "#,##0.00";
      valuesRow.getCell("Contrato").numFmt = "#,##0.00";
      valuesRow.getCell("Status").numFmt = "#,##0.00";
      if (profit >= 0) {
        valuesRow.getCell("Status").font = { bold: true, color: { argb: "FF16A34A" } };
      } else {
        valuesRow.getCell("Status").font = { bold: true, color: { argb: "FFDC2626" } };
      }
      currentRow++;

      // Add separator row
      eqWs.addRow([]);
      currentRow++;
    }

    // Info sheet
    const eqInfo = eqWb.addWorksheet("Informações");
    eqInfo.addRows([
      ["RentAllControl — Relatório por Equipamento"],
      ["Empresa:", companyName],
      ["Período:", `${formatDate(start)} a ${formatDate(end)}`],
      ["Gerado em:", formatDate(new Date())],
      ["Equipamentos com lançamentos:", totalEquipments],
    ]);
    eqInfo.getColumn(1).width = 30;
    eqInfo.getColumn(2).width = 36;

    // Write and download
    const eqBuffer = await eqWb.xlsx.writeBuffer();
    const eqBlob = new Blob([eqBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const eqUrl = URL.createObjectURL(eqBlob);
    const eqLink = document.createElement("a");
    eqLink.href = eqUrl;
    eqLink.download = `rentallcontrol-equipamentos-${new Date().toISOString().split("T")[0]}.xlsx`;
    eqLink.click();
    URL.revokeObjectURL(eqUrl);
    return; // Early return — custom workbook already downloaded
  }
  if (type === "equipamentos_resumido") {
    const { data: equipments } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    const { data: transactions } = await supabase.from("transactions")
      .select("equipment_id, contract_id, type, amount, status, due_date, paid_date")
      .eq("company_id", companyId).neq("status", "cancelado");
    const { data: contractsList } = await supabase.from("contracts").select("id, equipment_id").eq("company_id", companyId);

    const eqMap = new Map((contractsList || []).map((c) => [c.id, c.equipment_id]));
    const list = equipments || [];
    sheetName = "Resumo Equipamentos";

    const mappedTxs = (transactions || []).map((t) => ({
      ...t,
      txDate: t.status === "pago" && t.paid_date ? t.paid_date : t.due_date
    })).filter((t) => t.txDate >= start && t.txDate <= end);

    const eqWb = new ExcelJS.Workbook();
    const eqWs = eqWb.addWorksheet(sheetName);

    const headers = ["Código", "Equipamento", "Categoria", "Status", "Receitas (R$)", "Custos (R$)", "Lucro Líquido (R$)", "ROI (%)", "Contratos Ativos"];
    eqWs.columns = headers.map((h) => ({ header: h, key: h, width: h === "Equipamento" ? 30 : 18 }));
    eqWs.getRow(1).font = { bold: true };
    eqWs.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
    eqWs.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    let totalRec = 0;
    let totalCst = 0;
    let totalContratosGeral = 0;

    for (const eq of list) {
      const txs = mappedTxs.filter((t) => {
        const eqId = t.equipment_id || (t.contract_id ? eqMap.get(t.contract_id) : null);
        return eqId === eq.id;
      });

      const revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
      const costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
      const profit = revenue - costs;
      const roi = costs > 0 ? (profit / costs) * 100 : (revenue > 0 ? 100 : 0);
      const activeContracts = (contractsList || []).filter((c) => c.equipment_id === eq.id).length;

      totalRec += revenue;
      totalCst += costs;
      totalContratosGeral += activeContracts;

      const row = eqWs.addRow({
        "Código": eq.code,
        "Equipamento": eq.name,
        "Categoria": categoryLabels[eq.category] || eq.category || "—",
        "Status": eq.status === "disponivel" ? "Disponível" : eq.status === "alugado" ? "Alugado" : eq.status === "manutencao" ? "Manutenção" : eq.status || "—",
        "Receitas (R$)": revenue,
        "Custos (R$)": costs,
        "Lucro Líquido (R$)": profit,
        "ROI (%)": Number(roi.toFixed(1)),
        "Contratos Ativos": activeContracts
      });

      row.getCell("Receitas (R$)").numFmt = "#,##0.00";
      row.getCell("Custos (R$)").numFmt = "#,##0.00";
      row.getCell("Lucro Líquido (R$)").numFmt = "#,##0.00";
      row.getCell("ROI (%)").numFmt = "0.0";

      if (profit >= 0) {
        row.getCell("Lucro Líquido (R$)").font = { bold: true, color: { argb: "FF16A34A" } };
      } else {
        row.getCell("Lucro Líquido (R$)").font = { bold: true, color: { argb: "FFDC2626" } };
      }
    }

    const totalProfitGeral = totalRec - totalCst;
    const totalRoiGeral = totalCst > 0 ? (totalProfitGeral / totalCst) * 100 : (totalRec > 0 ? 100 : 0);

    const totalRow = eqWs.addRow({
      "Código": "TOTAL GERAL",
      "Equipamento": "",
      "Categoria": "",
      "Status": "",
      "Receitas (R$)": totalRec,
      "Custos (R$)": totalCst,
      "Lucro Líquido (R$)": totalProfitGeral,
      "ROI (%)": Number(totalRoiGeral.toFixed(1)),
      "Contratos Ativos": totalContratosGeral
    });

    totalRow.font = { bold: true };
    totalRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "double" }
      };
      if (colNumber === 5 || colNumber === 6 || colNumber === 7) {
        cell.numFmt = "#,##0.00";
      }
      if (colNumber === 8) {
        cell.numFmt = "0.0";
      }
    });

    if (totalProfitGeral >= 0) {
      totalRow.getCell("Lucro Líquido (R$)").font = { bold: true, color: { argb: "FF16A34A" } };
    } else {
      totalRow.getCell("Lucro Líquido (R$)").font = { bold: true, color: { argb: "FFDC2626" } };
    }

    const eqInfo = eqWb.addWorksheet("Informações");
    eqInfo.addRows([
      ["RentAllControl — Resumo por Equipamento"],
      ["Empresa:", companyName],
      ["Período:", `${formatDate(start)} a ${formatDate(end)}`],
      ["Gerado em:", formatDate(new Date())],
    ]);
    eqInfo.getColumn(1).width = 30;
    eqInfo.getColumn(2).width = 36;

    const eqBuffer = await eqWb.xlsx.writeBuffer();
    const eqBlob = new Blob([eqBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const eqUrl = URL.createObjectURL(eqBlob);
    const eqLink = document.createElement("a");
    eqLink.href = eqUrl;
    eqLink.download = `rentallcontrol-resumo-equipamentos-${new Date().toISOString().split("T")[0]}.xlsx`;
    eqLink.click();
    URL.revokeObjectURL(eqUrl);
    return;
  }
  if (type === "kpis_saude") {
    const { data: transactions } = await supabase.from("transactions")
      .select("type, category, amount, status, due_date, paid_date")
      .eq("company_id", companyId);
    const { data: equipment } = await supabase.from("equipment").select("status").eq("company_id", companyId);
    const { data: activeContracts } = await supabase.from("contracts").select("id").eq("company_id", companyId).eq("status", "ativo");

    const todayStr = new Date().toISOString().split("T")[0];
    const txsList = transactions || [];

    const paidTxs = txsList.map((t) => ({
      ...t,
      txDate: t.paid_date || t.due_date
    })).filter((t) => t.status === "pago" && t.txDate >= start && t.txDate <= end);

    const revenue = paidTxs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
    const costs = paidTxs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
    const netProfit = revenue - costs;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const eqList = equipment || [];
    const totalEq = eqList.length;
    const rentedEq = eqList.filter((e) => e.status === "alugado").length;
    const maintenanceEq = eqList.filter((e) => e.status === "manutencao").length;
    const availableEq = eqList.filter((e) => e.status === "disponivel").length;
    const occupancyRate = totalEq > 0 ? (rentedEq / totalEq) * 100 : 0;

    const overdueAmt = txsList.filter((t) => 
      t.type === "receita" && 
      (t.status === "vencido" || (t.status === "pendente" && t.due_date < todayStr))
    ).reduce((s, t) => s + Number(t.amount), 0);

    const kpiWb = new ExcelJS.Workbook();
    const kpiWs = kpiWb.addWorksheet("Saúde da Empresa");

    kpiWs.views = [{ showGridLines: true }];

    kpiWs.mergeCells("A1:D1");
    kpiWs.getCell("A1").value = "RentAllControl — Diagnóstico de Saúde da Empresa";
    kpiWs.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    kpiWs.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    kpiWs.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    kpiWs.getRow(1).height = 40;

    kpiWs.addRow([]);

    kpiWs.addRow(["INDICADORES FINANCEIROS GERAIS DO PERÍODO"]).font = { bold: true, size: 12, color: { argb: "FF0F766E" } };
    kpiWs.addRow(["Indicador", "Valor (Período)", "Meta / Status", "Descrição"]);
    kpiWs.getRow(4).font = { bold: true };
    kpiWs.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    kpiWs.addRow(["Faturamento (Receitas)", revenue, "—", "Total de valores recebidos/pagos no período"]);
    kpiWs.addRow(["Custos Operacionais", costs, "—", "Total de despesas pagas no período"]);
    const profitRow = kpiWs.addRow(["Lucro Líquido", netProfit, netProfit >= 0 ? "Positivo" : "Prejuízo", "Faturamento líquido menos custos operacionais"]);
    profitRow.getCell("B").font = { bold: true, color: { argb: netProfit >= 0 ? "FF16A34A" : "FFDC2626" } };
    profitRow.getCell("C").font = { bold: true, color: { argb: netProfit >= 0 ? "FF16A34A" : "FFDC2626" } };

    const marginRow = kpiWs.addRow(["Margem de Lucro", Number(profitMargin.toFixed(1)), profitMargin >= 20 ? "Ótima" : "Abaixo da Meta", "Percentual de rentabilidade sobre receita"]);
    marginRow.getCell("B").numFmt = "0.0\"%\"";

    kpiWs.addRow([]);

    kpiWs.addRow(["MÉTRICAS OPERACIONAIS E PATRIMÔNIO"]).font = { bold: true, size: 12, color: { argb: "FF0F766E" } };
    kpiWs.addRow(["Indicador", "Valor Atual", "Percentual", "Descrição"]);
    kpiWs.getRow(11).font = { bold: true };
    kpiWs.getRow(11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    kpiWs.addRow(["Equipamentos Alugados", rentedEq, Number((totalEq > 0 ? rentedEq/totalEq*100 : 0).toFixed(1)), "Equipamentos em contratos ativos"]);
    kpiWs.addRow(["Equipamentos Disponíveis", availableEq, Number((totalEq > 0 ? availableEq/totalEq*100 : 0).toFixed(1)), "Equipamentos no pátio prontos para aluguel"]);
    kpiWs.addRow(["Equipamentos em Manutenção", maintenanceEq, Number((totalEq > 0 ? maintenanceEq/totalEq*100 : 0).toFixed(1)), "Equipamentos indisponíveis por reparos"]);
    const occRow = kpiWs.addRow(["Taxa de Ocupação Geral", Number(occupancyRate.toFixed(1)), "—", "Percentual de frota alugada sobre o total"]);
    occRow.getCell("B").numFmt = "0.0\"%\"";
    occRow.font = { bold: true };

    kpiWs.addRow(["Contratos Ativos", activeContracts?.length || 0, "—", "Número de contratos atualmente em vigor"]);
    kpiWs.addRow(["Inadimplência Geral (Atraso)", overdueAmt, "—", "Total de contas a receber vencidas/pendentes acumuladas"]);

    kpiWs.addRow([]);

    kpiWs.addRow(["DETALHAMENTO DE DESPESAS POR CATEGORIA DO PERÍODO"]).font = { bold: true, size: 12, color: { argb: "FF0F766E" } };
    kpiWs.addRow(["Categoria", "Despesa (R$)", "Participação (%)", "Descrição Categoria"]);
    kpiWs.getRow(21).font = { bold: true };
    kpiWs.getRow(21).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    const catDespMap: Record<string, number> = {};
    paidTxs.filter((t) => t.type === "despesa").forEach((t) => {
      catDespMap[t.category] = (catDespMap[t.category] || 0) + Number(t.amount);
    });

    let currentCostRow = 22;
    Object.entries(catDespMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, val]) => {
        const row = kpiWs.addRow([
          categoryLabels[cat] || cat,
          val,
          Number((costs > 0 ? (val / costs) * 100 : 0).toFixed(1)),
          `Custos operacionais com ${categoryLabels[cat]?.toLowerCase() || cat}`
        ]);
        row.getCell("B").numFmt = "#,##0.00";
        row.getCell("C").numFmt = "0.0\"%\"";
        currentCostRow++;
      });

    kpiWs.addRow([]);

    kpiWs.addRow(["DETALHAMENTO DE RECEITAS POR CATEGORIA DO PERÍODO"]).font = { bold: true, size: 12, color: { argb: "FF0F766E" } };
    kpiWs.addRow(["Categoria", "Receita (R$)", "Participação (%)", "Descrição Categoria"]);
    const headerRowIdx = currentCostRow + 2;
    kpiWs.getRow(headerRowIdx).font = { bold: true };
    kpiWs.getRow(headerRowIdx).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    const catRecMap: Record<string, number> = {};
    paidTxs.filter((t) => t.type === "receita").forEach((t) => {
      catRecMap[t.category] = (catRecMap[t.category] || 0) + Number(t.amount);
    });

    Object.entries(catRecMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, val]) => {
        const row = kpiWs.addRow([
          categoryLabels[cat] || cat,
          val,
          Number((revenue > 0 ? (val / revenue) * 100 : 0).toFixed(1)),
          `Receitas originadas de ${categoryLabels[cat]?.toLowerCase() || cat}`
        ]);
        row.getCell("B").numFmt = "#,##0.00";
        row.getCell("C").numFmt = "0.0\"%\"";
      });

    for (let rowIdx = 5; rowIdx <= 9; rowIdx++) {
      kpiWs.getCell(`B${rowIdx}`).numFmt = "#,##0.00";
    }
    kpiWs.getCell(`B18`).numFmt = "#,##0.00";

    kpiWs.getColumn(1).width = 32;
    kpiWs.getColumn(2).width = 20;
    kpiWs.getColumn(3).width = 20;
    kpiWs.getColumn(4).width = 45;

    const kpiBuffer = await kpiWb.xlsx.writeBuffer();
    const kpiBlob = new Blob([kpiBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const kpiUrl = URL.createObjectURL(kpiBlob);
    const kpiLink = document.createElement("a");
    kpiLink.href = kpiUrl;
    kpiLink.download = `rentallcontrol-saude-empresa-${new Date().toISOString().split("T")[0]}.xlsx`;
    kpiLink.click();
    URL.revokeObjectURL(kpiUrl);
    return;
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
        Status: statusLabels[t.status] || t.status, "Valor (R$)": Number(t.amount),
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

  const statusLabels: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    vencido: "Vencido",
    cancelado: "Cancelado"
  };

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
    const { data } = await supabase.from("transactions").select("*, clients(name), suppliers(name)")
      .eq("company_id", companyId).neq("status", "cancelado");

    const filteredTxs = (data || [])
      .map((t) => ({
        ...t,
        txDate: t.status === "pago" && t.paid_date ? t.paid_date : t.due_date
      }))
      .filter((t) => t.txDate >= start && t.txDate <= end)
      .sort((a, b) => a.txDate.localeCompare(b.txDate));

    autoTable(doc, {
      startY: 56,
      head: [["Data", "Tipo", "Descrição", "Cliente/Fornecedor", "Status", "Valor"]],
      body: filteredTxs.map((t) => [
        formatDate(t.txDate), t.type === "receita" ? "Receita" : "Despesa",
        t.description.substring(0, 40), t.type === "receita" ? ((t as any).clients?.name || "—") : ((t as any).suppliers?.name || "—"),
        statusLabels[t.status] || t.status, `R$ ${Number(t.amount).toFixed(2)}`,
      ]),
      theme: "striped", headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, bodyStyles: { fontSize: 7.5 },
    });
    const totals = filteredTxs.reduce((a, t) => { t.type === "receita" ? a.r += Number(t.amount) : a.d += Number(t.amount); return a; }, { r: 0, d: 0 });
    const fy = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
    doc.text(`Receitas: ${formatCurrency(totals.r)}   Despesas: ${formatCurrency(totals.d)}   Lucro: ${formatCurrency(totals.r - totals.d)}`, 14, fy);
  }
  if (type === "equipamentos") {
    const { data: equipments } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    const { data: transactions } = await supabase.from("transactions")
      .select("equipment_id, contract_id, type, category, description, status, amount, client_id, supplier_id, due_date, paid_date, clients(name), suppliers(name), contracts(contract_number)")
      .eq("company_id", companyId).neq("status", "cancelado");
    const { data: contracts } = await supabase.from("contracts").select("id, equipment_id").eq("company_id", companyId);
    
    const eqMap = new Map((contracts || []).map((c) => [c.id, c.equipment_id]));
    const list = equipments || [];

    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 56;

    const mappedTxs = (transactions || []).map((t) => ({
      ...t,
      txDate: t.status === "pago" && t.paid_date ? t.paid_date : t.due_date
    })).filter((t) => t.txDate >= start && t.txDate <= end);

    for (const eq of list) {
      const txs = mappedTxs.filter((t) => {
        const eqId = t.equipment_id || (t.contract_id ? eqMap.get(t.contract_id) : null);
        return eqId === eq.id;
      });

      if (txs.length === 0) continue;

      // Calculate totals for this equipment
      const revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
      const costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
      const profit = revenue - costs;
      const roi = costs > 0 ? (profit / costs) * 100 : (revenue > 0 ? 100 : 0);

      // Check if we need a new page for this equipment block
      if (currentY + 50 > pageHeight - 15) {
        doc.addPage();
        currentY = 20;
      }

      // Draw equipment header banner
      doc.setFillColor(243, 244, 246);
      doc.rect(14, currentY, W - 28, 10, "F");
      doc.setDrawColor(229, 231, 235);
      doc.rect(14, currentY, W - 28, 10, "S");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`Equipamento: ${eq.name} (${eq.code})`, 18, currentY + 7);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(`Categoria: ${eq.category || "—"}  |  Status: ${eq.status || "—"}`, W - 18, currentY + 7, { align: "right" });

      currentY += 13;

      autoTable(doc, {
        startY: currentY,
        head: [["Tipo", "Descrição", "Categoria", "Cliente/Fornecedor", "Contrato", "Status", "Valor"]],
        body: txs.map((tx) => [
          tx.type === "receita" ? "Receita" : "Despesa",
          tx.description || "—",
          categoryLabels[tx.category] || tx.category,
          tx.type === "receita" ? ((tx as any).clients?.name || "—") : ((tx as any).suppliers?.name || "—"),
          (tx as any).contracts?.contract_number || "—",
          statusLabels[tx.status] || tx.status,
          formatCurrency(Number(tx.amount))
        ]),
        foot: [
          ["", "", "", "Total Receitas", "Total Despesas", "Lucro Líquido", "ROI (%)"],
          ["", "", "", formatCurrency(revenue), formatCurrency(costs), formatCurrency(profit), `${roi.toFixed(1)}%`]
        ],
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
        footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5, valign: "middle" },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 0) {
            if (data.cell.raw === 'Receita') {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'Despesa') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.section === 'foot') {
            if (data.column.index < 3) {
              data.cell.styles.fillColor = [255, 255, 255];
            }
            if (data.row.index === 1 && data.column.index === 5) {
              if (profit >= 0) {
                data.cell.styles.textColor = [22, 163, 74];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }
  }
  if (type === "equipamentos_resumido") {
    const { data: equipments } = await supabase.from("equipment").select("*").eq("company_id", companyId).order("name");
    const { data: transactions } = await supabase.from("transactions")
      .select("equipment_id, contract_id, type, amount, status, due_date, paid_date")
      .eq("company_id", companyId).neq("status", "cancelado");
    const { data: contracts } = await supabase.from("contracts").select("id, equipment_id").eq("company_id", companyId);

    const eqMap = new Map((contracts || []).map((c) => [c.id, c.equipment_id]));
    const list = equipments || [];

    const mappedTxs = (transactions || []).map((t) => ({
      ...t,
      txDate: t.status === "pago" && t.paid_date ? t.paid_date : t.due_date
    })).filter((t) => t.txDate >= start && t.txDate <= end);

    let totalRec = 0;
    let totalCst = 0;
    let totalContratosGeral = 0;

    const tableRows = list.map((eq) => {
      const txs = mappedTxs.filter((t) => {
        const eqId = t.equipment_id || (t.contract_id ? eqMap.get(t.contract_id) : null);
        return eqId === eq.id;
      });

      const revenue = txs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
      const costs = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
      const profit = revenue - costs;
      const roi = costs > 0 ? (profit / costs) * 100 : (revenue > 0 ? 100 : 0);
      const activeContracts = (contracts || []).filter((c) => c.equipment_id === eq.id).length;

      totalRec += revenue;
      totalCst += costs;
      totalContratosGeral += activeContracts;

      return [
        eq.code || "—",
        eq.name || "—",
        categoryLabels[eq.category] || eq.category || "—",
        eq.status === "disponivel" ? "Disponível" : eq.status === "alugado" ? "Alugado" : eq.status === "manutencao" ? "Manutenção" : eq.status || "—",
        formatCurrency(revenue),
        formatCurrency(costs),
        formatCurrency(profit),
        `${roi.toFixed(1)}%`,
        activeContracts.toString()
      ];
    });

    const totalProfitGeral = totalRec - totalCst;
    const totalRoiGeral = totalCst > 0 ? (totalProfitGeral / totalCst) * 100 : (totalRec > 0 ? 100 : 0);

    autoTable(doc, {
      startY: 56,
      head: [["Código", "Equipamento", "Categoria", "Status", "Receitas", "Custos", "Lucro", "ROI", "Contratos"]],
      body: tableRows,
      foot: [
        ["TOTAL GERAL", "", "", "", formatCurrency(totalRec), formatCurrency(totalCst), formatCurrency(totalProfitGeral), `${totalRoiGeral.toFixed(1)}%`, totalContratosGeral.toString()]
      ],
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5 },
      didParseCell: function(data) {
        if (data.section === "body" && data.column.index === 6) {
          const valText = data.cell.text[0];
          if (valText.startsWith("-")) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          } else if (valText !== "R$ 0,00") {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = "bold";
          }
        }
        if (data.section === "foot") {
          if (data.column.index < 4) {
            data.cell.styles.fillColor = [255, 255, 255];
          }
          if (data.column.index === 6) {
            if (totalProfitGeral >= 0) {
              data.cell.styles.textColor = [22, 163, 74];
            } else {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      }
    });
  }
  if (type === "kpis_saude") {
    const { data: transactions } = await supabase.from("transactions")
      .select("type, category, amount, status, due_date, paid_date")
      .eq("company_id", companyId);
    const { data: equipment } = await supabase.from("equipment").select("status").eq("company_id", companyId);
    const { data: activeContracts } = await supabase.from("contracts").select("id").eq("company_id", companyId).eq("status", "ativo");

    const todayStr = new Date().toISOString().split("T")[0];
    const txsList = transactions || [];

    const paidTxs = txsList.map((t) => ({
      ...t,
      txDate: t.paid_date || t.due_date
    })).filter((t) => t.status === "pago" && t.txDate >= start && t.txDate <= end);

    const revenue = paidTxs.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0);
    const costs = paidTxs.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0);
    const netProfit = revenue - costs;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const eqList = equipment || [];
    const totalEq = eqList.length;
    const rentedEq = eqList.filter((e) => e.status === "alugado").length;
    const maintenanceEq = eqList.filter((e) => e.status === "manutencao").length;
    const availableEq = eqList.filter((e) => e.status === "disponivel").length;
    const occupancyRate = totalEq > 0 ? (rentedEq / totalEq) * 100 : 0;

    const overdueAmt = txsList.filter((t) => 
      t.type === "receita" && 
      (t.status === "vencido" || (t.status === "pendente" && t.due_date < todayStr))
    ).reduce((s, t) => s + Number(t.amount), 0);

    autoTable(doc, {
      startY: 56,
      head: [["Indicador / KPI da Empresa", "Valor Consolidado", "Status / Diagnóstico"]],
      body: [
        ["Faturamento Operacional (Receitas)", formatCurrency(revenue), "—"],
        ["Custos Operacionais (Despesas)", formatCurrency(costs), "—"],
        ["Lucro Líquido Real", formatCurrency(netProfit), netProfit >= 0 ? "Lucrativo (Positivo)" : "Prejuízo (Negativo)"],
        ["Margem de Lucro Geral", `${profitMargin.toFixed(1)}%`, profitMargin >= 20 ? "Excelente (>= 20%)" : "Requer Atenção (< 20%)"],
        ["Taxa de Ocupação da Frota", `${occupancyRate.toFixed(1)}%`, occupancyRate >= 70 ? "Alta Ocupação" : "Frota Subutilizada"],
        ["Contratos Ativos Atualmente", (activeContracts?.length || 0).toString(), "Operação em Andamento"],
        ["Inadimplência Geral Acumulada", formatCurrency(overdueAmt), overdueAmt > 0 ? "Atraso sob Risco" : "Zero Atrasos"],
      ],
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136], fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      didParseCell: function(data) {
        if (data.section === "body" && data.row.index === 2) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = netProfit >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
        if (data.section === "body" && data.row.index === 6 && overdueAmt > 0) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;

    const catDespMap: Record<string, number> = {};
    paidTxs.filter((t) => t.type === "despesa").forEach((t) => {
      catDespMap[t.category] = (catDespMap[t.category] || 0) + Number(t.amount);
    });

    const despesasRows = Object.entries(catDespMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => [
        categoryLabels[cat] || cat,
        formatCurrency(val),
        `${(costs > 0 ? (val / costs) * 100 : 0).toFixed(1)}%`
      ]);

    const catRecMap: Record<string, number> = {};
    paidTxs.filter((t) => t.type === "receita").forEach((t) => {
      catRecMap[t.category] = (catRecMap[t.category] || 0) + Number(t.amount);
    });

    const receitasRows = Object.entries(catRecMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => [
        categoryLabels[cat] || cat,
        formatCurrency(val),
        `${(revenue > 0 ? (val / revenue) * 100 : 0).toFixed(1)}%`
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Receitas por Categoria", "Valor (R$)", "Peso %"]],
      body: receitasRows,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    autoTable(doc, {
      startY: currentY,
      head: [["Despesas por Categoria", "Valor (R$)", "Peso %"]],
      body: despesasRows,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 }
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

  // Add page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${pageCount}`, W - 14, H - 8, { align: "right" });
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
                  disabled={generating === `${report.id}-pdf` || isLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-600 text-sm font-medium transition-colors ${
                    generating === `${report.id}-pdf` ? "opacity-50 cursor-not-allowed" : "hover:bg-red-500/20"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  {generating === `${report.id}-pdf` ? "Gerando…" : "PDF"}
                </button>
                <button
                  onClick={() => handleExport(report.id, "excel")}
                  disabled={generating === `${report.id}-excel` || isLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium transition-colors ${
                    generating === `${report.id}-excel` ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500/20"
                  }`}
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
