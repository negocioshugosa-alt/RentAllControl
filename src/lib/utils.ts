// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: ptBR });
}

export function formatDatetime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

export function formatDocument(doc: string): string {
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function unformatDocument(doc: string): string {
  return doc.replace(/\D/g, "");
}

export function formatCpfCnpj(doc: string, type?: "pf" | "pj"): string {
  const maxLength = type === "pf" ? 11 : type === "pj" ? 14 : 14;
  const clean = unformatDocument(doc).slice(0, maxLength);
  const formatAsCpf = type === "pf" || (!type && clean.length <= 11);

  if (formatAsCpf) {
    return clean
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return clean
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").slice(0, 11);
  if (clean.length === 0) return "";
  if (clean.length <= 2) {
    return `(${clean}`;
  }
  if (clean.length <= 6) {
    return clean.replace(/^(\d{2})(\d)/, "($1) $2");
  }
  if (clean.length <= 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  }
  return clean.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

export function formatCep(cep: string): string {
  const clean = cep.replace(/\D/g, "").slice(0, 8);
  if (clean.length === 0) return "";
  return clean.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getDaysOverdue(dueDate: string): number {
  const due = parseISO(dueDate);
  const today = new Date();
  if (isBefore(due, today)) {
    return differenceInDays(today, due);
  }
  return 0;
}

export function isOverdue(dueDate: string): boolean {
  return isBefore(parseISO(dueDate), new Date());
}

export function isUpcoming(dueDate: string, days = 7): boolean {
  const due = parseISO(dueDate);
  const today = new Date();
  const future = addDays(today, days);
  return isAfter(due, today) && isBefore(due, future);
}

export function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
  return `LC-${year}-${rand}`;
}

export function generateEquipmentCode(): string {
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `EQ-${rand}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}

export function calculateROI(revenue: number, cost: number): number {
  if (cost === 0) return 0;
  return ((revenue - cost) / cost) * 100;
}

export function calculateDepreciation(purchaseValue: number, rate: number, months: number): number {
  return purchaseValue * (1 - Math.pow(1 - rate / 100, months / 12));
}

export const TRANSACTION_CATEGORIES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "caucao", label: "Caução" },
  { value: "multa_contrato", label: "Multa Contratual" },
  { value: "combustivel", label: "Combustível" },
  { value: "manutencao", label: "Manutenção" },
  { value: "pneus", label: "Pneus" },
  { value: "pecas", label: "Peças" },
  { value: "seguro", label: "Seguro" },
  { value: "ipva", label: "IPVA" },
  { value: "lavagem", label: "Lavagem" },
  { value: "multas", label: "Multas" },
  { value: "salarios", label: "Salários" },
  { value: "marketing", label: "Marketing" },
  { value: "escritorio", label: "Escritório" },
  { value: "financiamento", label: "Financiamento" },
  { value: "impostos", label: "Impostos" },
  { value: "outros", label: "Outros" },
] as const;

export const EQUIPMENT_CATEGORIES = [
  { value: "caminhao", label: "Caminhão" },
  { value: "veiculo", label: "Veículo" },
  { value: "maquina_pesada", label: "Máquina Pesada" },
  { value: "equipamento_construcao", label: "Equip. Construção" },
  { value: "empilhadeira", label: "Empilhadeira" },
  { value: "gerador", label: "Gerador" },
  { value: "compressor", label: "Compressor" },
  { value: "andaime", label: "Andaime" },
  { value: "outro", label: "Outro" },
] as const;

export const EQUIPMENT_STATUS = [
  { value: "disponivel", label: "Disponível", color: "success" },
  { value: "alugado", label: "Alugado", color: "primary" },
  { value: "manutencao", label: "Manutenção", color: "warning" },
  { value: "inativo", label: "Inativo", color: "muted" },
  { value: "vendido", label: "Vendido", color: "destructive" },
] as const;

export const CONTRACT_STATUS = [
  { value: "ativo", label: "Ativo", color: "success" },
  { value: "encerrado", label: "Encerrado", color: "muted" },
  { value: "cancelado", label: "Cancelado", color: "destructive" },
  { value: "pendente", label: "Pendente", color: "warning" },
] as const;

export const TRANSACTION_STATUS = [
  { value: "pendente", label: "Pendente", color: "warning" },
  { value: "pago", label: "Pago", color: "success" },
  { value: "recebido", label: "Recebido", color: "success" },
  { value: "vencido", label: "Vencido", color: "destructive" },
  { value: "cancelado", label: "Cancelado", color: "muted" },
] as const;
