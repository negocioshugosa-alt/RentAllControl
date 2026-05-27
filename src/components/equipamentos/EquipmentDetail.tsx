"use client";
// src/components/equipamentos/EquipmentDetail.tsx
import { X, Pencil, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, EQUIPMENT_CATEGORIES } from "@/lib/utils";
import type { Equipment } from "@/types";

interface Props {
  equipment: Equipment;
  onClose: () => void;
  onEdit: () => void;
}

const statusLabel: Record<string, string> = {
  disponivel: "Disponível", alugado: "Alugado", manutencao: "Manutenção", inativo: "Inativo",
};
const statusBadge: Record<string, string> = {
  disponivel: "badge-disponivel", alugado: "badge-alugado", manutencao: "badge-manutencao", inativo: "badge-inativo",
};

export function EquipmentDetail({ equipment: eq, onClose, onEdit }: Props) {
  const { data: summary } = useQuery({
    queryKey: ["equipment-summary", eq.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("equipment_financial_summary")
        .select("*")
        .eq("equipment_id", eq.id)
        .single();
      return data;
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["equipment-contracts", eq.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("contracts")
        .select("*, clients(name)")
        .eq("equipment_id", eq.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold font-display">{eq.name}</h2>
            <p className="text-sm text-muted-foreground">{eq.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Status + Info */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[eq.status]}`}>
              {statusLabel[eq.status]}
            </span>
            {eq.category && (
              <span className="text-sm text-muted-foreground">
                {EQUIPMENT_CATEGORIES.find((c) => c.value === eq.category)?.label}
              </span>
            )}
            {eq.year && <span className="text-sm text-muted-foreground">{eq.year}</span>}
            {eq.plate && <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{eq.plate}</span>}
          </div>

          {/* Financial summary */}
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 text-center">
                <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-600">{formatCurrency(Number(summary.total_revenue))}</p>
                <p className="text-xs text-muted-foreground">Receita Total</p>
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-center">
                <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-500">{formatCurrency(Number(summary.total_costs))}</p>
                <p className="text-xs text-muted-foreground">Custo Total</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${Number(summary.net_profit) >= 0 ? "bg-blue-500/5 border-blue-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                <DollarSign className={`w-4 h-4 mx-auto mb-1 ${Number(summary.net_profit) >= 0 ? "text-blue-600" : "text-red-500"}`} />
                <p className={`text-lg font-bold ${Number(summary.net_profit) >= 0 ? "text-blue-600" : "text-red-500"}`}>
                  {formatCurrency(Number(summary.net_profit))}
                </p>
                <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              { label: "Marca", value: eq.brand },
              { label: "Modelo", value: eq.model },
              { label: "Quantidade Total", value: eq.quantity || 1 },
              { label: "Chassi", value: eq.chassis },
              { label: "Horímetro", value: eq.hourimeter ? `${eq.hourimeter}h` : null },
              { label: "KM", value: eq.km ? `${eq.km.toLocaleString("pt-BR")} km` : null },
              { label: "Valor de Compra", value: eq.purchase_value ? formatCurrency(Number(eq.purchase_value)) : null },
              { label: "Valor Diária", value: eq.daily_rate ? formatCurrency(Number(eq.daily_rate)) : null },
              { label: "Mensalidade", value: eq.monthly_rate ? formatCurrency(Number(eq.monthly_rate)) : null },
              { label: "Parcela Financ.", value: eq.monthly_installment ? formatCurrency(Number(eq.monthly_installment)) : null },
              { label: "Seguro Mensal", value: eq.monthly_insurance ? formatCurrency(Number(eq.monthly_insurance)) : null },
              { label: "IPVA Anual", value: eq.annual_ipva ? formatCurrency(Number(eq.annual_ipva)) : null },
              { label: "Depreciação/ano", value: eq.depreciation_rate ? `${eq.depreciation_rate}%` : null },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Recent contracts */}
          {contracts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Últimos Contratos
              </h3>
              <div className="space-y-2">
                {contracts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <div>
                      <p className="font-medium">{c.contract_number}</p>
                      <p className="text-xs text-muted-foreground">{c.clients?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium badge-${c.status}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(c.start_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {eq.notes && (
            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm">{eq.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
