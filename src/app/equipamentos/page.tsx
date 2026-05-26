// src/app/equipamentos/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Wrench, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { EquipmentForm } from "@/components/equipamentos/EquipmentForm";
import { EquipmentDetail } from "@/components/equipamentos/EquipmentDetail";
import { formatCurrency, EQUIPMENT_STATUS, EQUIPMENT_CATEGORIES } from "@/lib/utils";
import { toast } from "sonner";
import type { Equipment } from "@/types";

async function fetchEquipment(companyId: string, search: string, status: string) {
  const supabase = createClient();
  let query = supabase
    .from("equipment")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("name", `%${search}%`);
  if (status) query = query.eq("status", status);

  const { data } = await query;
  return data || [];
}

// getCompanyId replaced by useCompanyId hook
async function _getCompanyId_UNUSED() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  return data?.company_id;
}

const statusBadge: Record<string, string> = {
  disponivel: "badge-disponivel",
  alugado: "badge-alugado",
  manutencao: "badge-manutencao",
  inativo: "badge-inativo",
};

const statusLabel: Record<string, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

export default function EquipamentosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Equipment | null>(null);
  const [detailItem, setDetailItem] = useState<Equipment | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { companyId } = useCompanyId();

  const { data: equipments = [], isLoading } = useQuery({
    queryKey: ["equipamentos", companyId, search, statusFilter],
    queryFn: () => fetchEquipment(companyId!, search, statusFilter),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
      toast.success("Equipamento removido");
    },
    onError: () => toast.error("Erro ao remover equipamento"),
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Equipamentos"
        subtitle={`${equipments.length} equipamentos cadastrados`}
        actions={
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Equipamento
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Buscar equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            {EQUIPMENT_STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EQUIPMENT_STATUS.map((s) => {
            const count = equipments.filter((e) => e.status === s.value).length;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(statusFilter === s.value ? "" : s.value)}
                className={`p-3 rounded-xl border text-left transition-colors hover:bg-muted/50 ${statusFilter === s.value ? "ring-2 ring-primary" : ""}`}
              >
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="data-table w-full">
            <thead className="bg-muted/30">
              <tr>
                <th>Código / Nome</th>
                <th className="hidden md:table-cell">Categoria</th>
                <th className="hidden lg:table-cell">Ano</th>
                <th>Status</th>
                <th className="hidden xl:table-cell">Valor Diária</th>
                <th className="hidden xl:table-cell">Mensalidade</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}><div className="skeleton h-5 w-full rounded" /></td>
                  </tr>
                ))
              ) : equipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum equipamento encontrado</p>
                    <button
                      onClick={() => { setEditItem(null); setShowForm(true); }}
                      className="mt-3 text-primary text-sm hover:underline"
                    >
                      Cadastrar primeiro equipamento
                    </button>
                  </td>
                </tr>
              ) : (
                equipments.map((eq) => (
                  <tr key={eq.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{eq.name}</p>
                          <p className="text-xs text-muted-foreground">{eq.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-muted-foreground capitalize">
                      {EQUIPMENT_CATEGORIES.find((c) => c.value === eq.category)?.label || eq.category}
                    </td>
                    <td className="hidden lg:table-cell text-muted-foreground">{eq.year || "—"}</td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[eq.status]}`}>
                        {statusLabel[eq.status]}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell text-muted-foreground">
                      {eq.daily_rate ? formatCurrency(Number(eq.daily_rate)) : "—"}
                    </td>
                    <td className="hidden xl:table-cell text-muted-foreground">
                      {eq.monthly_rate ? formatCurrency(Number(eq.monthly_rate)) : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailItem(eq)}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditItem(eq); setShowForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Remover este equipamento?")) deleteMutation.mutate(eq.id);
                          }}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <EquipmentForm
          equipment={editItem}
          companyId={companyId!}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries();
            router.refresh();
            setShowForm(false);
          }}
        />
      )}

      {detailItem && (
        <EquipmentDetail
          equipment={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); setShowForm(true); }}
        />
      )}
    </div>
  );
}
