"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { SupplierForm } from "@/components/fornecedores/SupplierForm";
import { useCompanyId } from "@/hooks/useCompanyId";
import { formatDocument, formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import type { Supplier } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";

async function fetchSuppliers(companyId: string, search: string) {
  const supabase = createClient();
  let query = supabase
    .from("suppliers")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (search) query = query.ilike("name", `%${search}%`);
  const { data } = await query;
  return data || [];
}

const SUPPLIER_CATEGORIES = [
  "Combustível", "Manutenção", "Pneus", "Peças", "Seguro",
  "Lavagem", "Escritório", "Marketing", "Outros",
];

export default function FornecedoresPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const queryClient = useQueryClient();
  const { companyId } = useCompanyId();
  const router = useRouter();
  const { isReadOnly } = useSubscription();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["fornecedores", companyId, search],
    queryFn: () => fetchSuppliers(companyId!, search),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        throw new Error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      }
      const supabase = createClient();
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
      toast.success("Fornecedor removido");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover fornecedor"),
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Fornecedores"
        subtitle={`${suppliers.length} fornecedores cadastrados`}
        actions={
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="data-table w-full">
            <thead className="bg-muted/30">
              <tr>
                <th>Fornecedor</th>
                <th className="hidden md:table-cell">Documento</th>
                <th className="hidden md:table-cell">Categoria</th>
                <th className="hidden lg:table-cell">Telefone</th>
                <th className="hidden lg:table-cell">Email</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="skeleton h-5 w-full rounded" /></td></tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Truck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum fornecedor cadastrado</p>
                    <button
                      onClick={() => { setEditItem(null); setShowForm(true); }}
                      className="mt-3 text-primary text-sm hover:underline"
                    >
                      Cadastrar primeiro fornecedor
                    </button>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-orange-600 font-semibold text-sm">
                          {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{supplier.name}</p>
                          {supplier.city && (
                            <p className="text-xs text-muted-foreground">{supplier.city}{supplier.state && `, ${supplier.state}`}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                      {supplier.document ? formatDocument(supplier.document) : "—"}
                    </td>
                    <td className="hidden md:table-cell">
                      {supplier.category ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600">
                          {supplier.category}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="hidden lg:table-cell text-muted-foreground">
                      {supplier.mobile ? formatPhone(supplier.mobile) : supplier.phone ? formatPhone(supplier.phone) : "—"}
                    </td>
                    <td className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[180px]">
                      {supplier.email || "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditItem(supplier); setShowForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Remover este fornecedor?")) deleteMutation.mutate(supplier.id);
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

      {showForm && companyId && (
        <SupplierForm
          supplier={editItem}
          companyId={companyId}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries();
            router.refresh();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
