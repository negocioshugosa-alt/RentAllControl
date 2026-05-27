// src/utils/contractPdf.ts
import type { Contract, Client, Equipment, Company } from "@/types";
import { formatCurrency, formatDate, formatDocument, formatPhone } from "@/lib/utils";

export async function generateContractPdf(
  contract: Contract,
  client: Client,
  equipment: Equipment,
  company: Company
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  const addText = (text: string, x: number, yPos: number, opts?: any) => {
    doc.text(text, x, yPos, opts);
  };

  const line = () => {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y);
    y += 6;
  };

  const section = (title: string) => {
    y += 4;
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y - 4, W - margin * 2, 10, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    addText(title.toUpperCase(), margin + 3, y + 2);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
  };

  const field = (label: string, value: string, x = margin, width = (W - margin * 2) / 2) => {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    addText(label, x, y);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    addText(value || "—", x, y + 5);
    return y + 12;
  };

  // ---- HEADER ----
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  addText("CONTRATO DE LOCAÇÃO", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  addText(`Nº ${contract.contract_number}`, margin, 22);
  addText(company.name, W - margin, 14, { align: "right" });
  addText(company.cnpj ? formatDocument(company.cnpj) : "", W - margin, 22, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y = 44;

  // ---- PARTES ----
  section("LOCADOR (EMPRESA)");
  const half = (W - margin * 2) / 2;
  y = field("Razão Social", company.name, margin, half);
  y = field("CNPJ", company.cnpj ? formatDocument(company.cnpj) : "—", margin, half);
  y = field("Endereço", [company.address, company.city, company.state].filter(Boolean).join(", "), margin, half);
  y = field("Telefone", company.phone ? formatPhone(company.phone) : "—", margin, half);
  line();

  section("LOCATÁRIO (CLIENTE)");
  y = field("Nome / Razão Social", client.name, margin, half);
  y = field(client.type === "pf" ? "CPF" : "CNPJ", formatDocument(client.document), margin, half);
  y = field("Email", client.email || "—", margin, half);
  y = field("Telefone", client.mobile ? formatPhone(client.mobile) : client.phone ? formatPhone(client.phone) : "—", margin, half);
  y = field("Endereço", [client.address, client.city, client.state].filter(Boolean).join(", "), margin, half);
  line();

  // ---- EQUIPAMENTO ----
  section("EQUIPAMENTO LOCADO");
  y = field("Código", equipment.code, margin, half);
  y = field("Descrição", equipment.name, margin + half, half);
  y = field("Marca / Modelo", [equipment.brand, equipment.model].filter(Boolean).join(" / ") || "—", margin, half);
  if (equipment.plate) y = field("Placa", equipment.plate, margin + half, half);
  if (equipment.year) y = field("Ano", String(equipment.year), margin, half);
  line();

  // ---- CONDIÇÕES ----
  section("CONDIÇÕES DO CONTRATO");
  y = field("Data de Início", formatDate(contract.start_date), margin, half);
  y = field("Data de Término", contract.end_date ? formatDate(contract.end_date) : "Indeterminado", margin + half, half);
  y = field(
    "Valor",
    contract.monthly_rate
      ? `${formatCurrency(Number(contract.monthly_rate))} / mês`
      : contract.daily_rate
      ? `${formatCurrency(Number(contract.daily_rate))} / dia`
      : "—",
    margin, half
  );
  y = field("Frequência", contract.payment_frequency, margin + half, half);
  if (contract.deposit_value) {
    y = field("Caução", formatCurrency(Number(contract.deposit_value)), margin, half);
    y = field("Caução Pago", contract.deposit_paid ? "Sim" : "Não", margin + half, half);
  }
  if (contract.notes) {
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    addText("OBSERVAÇÕES", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(contract.notes, W - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  }
  line();

  // ---- SIGNATURE ----
  y += 20;
  if (y > 250) { doc.addPage(); y = margin + 10; }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const sigW = (W - margin * 2 - 20) / 2;
  doc.line(margin, y, margin + sigW, y);
  doc.line(margin + sigW + 20, y, W - margin, y);
  y += 5;
  addText(company.name, margin, y);
  addText("LOCATÁRIO", margin + sigW + 20, y);
  y += 4;
  addText("LOCADOR", margin, y);
  addText(client.name, margin + sigW + 20, y);

  y += 20;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  addText(`Documento gerado em ${formatDate(new Date(), "dd/MM/yyyy HH:mm")} via RentFlow`, W / 2, y, { align: "center" });

  doc.save(`contrato-${contract.contract_number}.pdf`);
}
