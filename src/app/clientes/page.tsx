"use client";
// src/app/clientes/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { ClientForm } from "@/components/clientes/ClientForm";
import { formatDocument, formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import type { Client } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";

async function fetchClients(companyId: string, search: string) {
  const supabase = createClient();
  let query = supabase
    .from("clients")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (search) query = query.ilike("name", `%${search}%`);
  const { data } = await query;
  return data || [];
}

async function getCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
  return data?.company_id;
}

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Client | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isReadOnly } = useSubscription();

  const { companyId } = useCompanyId();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clientes", companyId, search],
    queryFn: () => fetchClients(companyId!, search),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        throw new Error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      }
      const supabase = createClient();
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
      toast.success("Cliente removido");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover cliente"),
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
        actions={
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="data-table w-full">
            <thead className="bg-muted/30">
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th className="hidden md:table-cell">Telefone</th>
                <th className="hidden lg:table-cell">Email</th>
                <th className="hidden md:table-cell">Tipo</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}><div className="skeleton h-5 w-full rounded" /></td>
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum cliente encontrado</p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{client.name}</p>
                          {client.city && (
                            <p className="text-xs text-muted-foreground">{client.city}{client.state && `, ${client.state}`}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm text-muted-foreground">{formatDocument(client.document)}</td>
                    <td className="hidden md:table-cell text-muted-foreground">
                      {client.mobile ? formatPhone(client.mobile) : client.phone ? formatPhone(client.phone) : "—"}
                    </td>
                    <td className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                      {client.email || "—"}
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        {client.type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditItem(client); setShowForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Remover este cliente?")) deleteMutation.mutate(client.id);
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
        <ClientForm
          client={editItem}
          companyId={companyId!}
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
