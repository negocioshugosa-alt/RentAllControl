"use client";
// src/components/shared/StatusBadge.tsx
import { cn } from "@/lib/utils";

type Status =
  | "disponivel" | "alugado" | "manutencao" | "inativo"
  | "ativo" | "encerrado" | "cancelado" | "pendente"
  | "pago" | "vencido"
  | "low" | "medium" | "high" | "critical";

const statusConfig: Record<Status, { label: string; className: string }> = {
  // Equipment
  disponivel: { label: "Disponível", className: "badge-disponivel" },
  alugado:    { label: "Alugado",    className: "badge-alugado" },
  manutencao: { label: "Manutenção", className: "badge-manutencao" },
  inativo:    { label: "Inativo",    className: "badge-inativo" },
  // Contract
  ativo:      { label: "Ativo",      className: "badge-ativo" },
  encerrado:  { label: "Encerrado",  className: "badge-encerrado" },
  cancelado:  { label: "Cancelado",  className: "badge-cancelado" },
  pendente:   { label: "Pendente",   className: "badge-pendente" },
  // Transaction
  pago:       { label: "Pago",       className: "badge-pago" },
  vencido:    { label: "Vencido",    className: "badge-vencido" },
  // Priority
  low:      { label: "Baixo",    className: "bg-blue-500/10 text-blue-600 border border-blue-500/20" },
  medium:   { label: "Médio",    className: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" },
  high:     { label: "Alto",     className: "bg-orange-500/10 text-orange-600 border border-orange-500/20" },
  critical: { label: "Crítico",  className: "bg-red-500/10 text-red-600 border border-red-500/20" },
};

interface Props {
  status: Status;
  label?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, size = "md" }: Props) {
  const config = statusConfig[status] ?? { label: status, className: "badge-inativo" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className
      )}
    >
      {label ?? config.label}
    </span>
  );
}
