"use client";

// src/app/configuracoes/equipe/page.tsx
import { useState } from "react";
import { Header } from "@/components/shared/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import {
  Users, Plus, Trash2, Shield, UserX, UserCheck,
  Copy, ExternalLink, AlertTriangle, Loader2, Info
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  manager: "Gerente",
  operator: "Operador",
  viewer: "Visualizador (Apenas Leitura)",
};

export default function EquipePage() {
  const { companyId } = useCompanyId();
  const { plan, isReadOnly } = useSubscription();
  const queryClient = useQueryClient();

  const [inviteRole, setInviteRole] = useState<string>("operator");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

  // Queries
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["invites", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("company_invites")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const activeProfilesCount = profiles.filter((p: any) => p.is_active).length;
  const isEssencialLimitReached = plan === "essencial" && activeProfilesCount >= 1;

  // Mutations
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      if (isEssencialLimitReached) {
        throw new Error(
          "Limite atingido: O Plano Essencial permite apenas 1 usuário ativo na equipe. Faça o upgrade para o Plano Pro para convidar mais colaboradores."
        );
      }

      const supabase = createClient();
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 48 horas

      const { error } = await supabase.from("company_invites").insert({
        company_id: companyId!,
        role: inviteRole,
        token: token,
        expires_at: expiresAt,
      });

      if (error) throw error;

      const origin = typeof window !== "undefined" ? window.location.origin : "https://rentflow.com.br";
      return `${origin}/invite/${token}`;
    },
    onSuccess: (link) => {
      setCreatedInviteLink(link);
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Link de convite gerado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar link de convite.");
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("company_invites").delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite revogado.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateProfileStatusMutation = useMutation({
    mutationFn: async ({ profileId, active }: { profileId: string; active: boolean }) => {
      if (active && plan === "essencial" && activeProfilesCount >= 1) {
        throw new Error("Seu plano Essencial permite apenas 1 colaborador ativo. Faça o upgrade para o Plano Pro.");
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: active })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Status do colaborador atualizado.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateProfileRoleMutation = useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Função do colaborador atualizada.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  function copyLinkToClipboard(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  }

  if (profilesLoading) {
    return (
      <div className="flex flex-col flex-1 h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Carregando lista de equipe...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Gestão de Equipe" subtitle="Gerencie colaboradores e convites de acesso" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Banner informativo de Limites de Plano */}
        {plan === "essencial" && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Limitação de Usuários do Plano Essencial</h4>
              <p className="text-xs mt-1 leading-relaxed">
                Seu plano atual é o <strong>Essencial</strong>, que permite apenas <strong>1 usuário ativo</strong> por empresa.
                Para trabalhar com colaboradores, você deve fazer o upgrade para o <strong>Plano Pro</strong> na aba de faturamento.
              </p>
            </div>
          </div>
        )}

        {/* Gerador de Links de Convite */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-bold font-display">Convidar Membro para a Equipe</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie links exclusivos de convite para enviar via WhatsApp ou equipes. Sem custos de envio por e-mail!
            </p>
          </div>

          {isEssencialLimitReached ? (
            <div className="p-4 rounded-xl bg-muted border text-xs text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span>Para cadastrar novos colaboradores, faça o upgrade para o plano Pro.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold mb-1 block">Nível de Permissão (Função)</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input w-full"
                >
                  <option value="operator">Operador (Acesso padrão)</option>
                  <option value="manager">Gerente (Acesso administrativo)</option>
                  <option value="viewer">Visualizador (Apenas leitura)</option>
                  <option value="admin">Administrador (Permissões totais)</option>
                </select>
              </div>
              <button
                onClick={() => generateInviteMutation.mutate()}
                disabled={generateInviteMutation.isPending || isReadOnly}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {generateInviteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Gerar Link de Convite
              </button>
            </div>
          )}

          {/* Exibição do Link de Convite Criado */}
          {createdInviteLink && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 mt-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Link de Convite Gerado com Sucesso!</p>
              <p className="text-[10px] text-muted-foreground">Envie o link abaixo para o colaborador pelo WhatsApp. Ele expira em 48 horas.</p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  className="input flex-1 font-mono text-xs truncate bg-muted py-2"
                  value={createdInviteLink}
                />
                <button
                  onClick={() => copyLinkToClipboard(createdInviteLink)}
                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  title="Copiar Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Colaboradores Cadastrados */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="font-bold font-display">Equipe da Empresa</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Colaboradores associados à sua empresa e suas funções.</p>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                <th className="px-6 py-3">Nome / Email</th>
                <th className="px-6 py-3">Função</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((prof: any) => {
                const isOwner = prof.role === "owner";
                return (
                  <tr key={prof.id} className="border-t hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{prof.name}</p>
                      <p className="text-xs text-muted-foreground">{prof.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {isOwner ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Dono da Conta
                        </span>
                      ) : (
                        <select
                          value={prof.role}
                          onChange={(e) =>
                            updateProfileRoleMutation.mutate({
                              profileId: prof.id,
                              role: e.target.value,
                            })
                          }
                          disabled={isReadOnly}
                          className="text-xs font-medium bg-transparent border-b border-border py-1 px-1 focus:outline-none focus:border-primary"
                        >
                          <option value="operator">Operador</option>
                          <option value="manager">Gerente</option>
                          <option value="viewer">Visualizador</option>
                          <option value="admin">Administrador</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        prof.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      }`}>
                        {prof.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isOwner && (
                        <div className="flex justify-end gap-2">
                          {prof.is_active ? (
                            <button
                              onClick={() =>
                                updateProfileStatusMutation.mutate({
                                  profileId: prof.id,
                                  active: false,
                                })
                              }
                              disabled={isReadOnly}
                              className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                              title="Desativar Acesso"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                updateProfileStatusMutation.mutate({
                                  profileId: prof.id,
                                  active: true,
                                })
                              }
                              disabled={isEssencialLimitReached || isReadOnly}
                              className="p-1.5 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 rounded-lg transition-colors disabled:opacity-30"
                              title="Ativar Acesso"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Convites Ativos */}
        {invites.length > 0 && (
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b">
              <h3 className="font-bold font-display">Convites Pendentes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Links de convite gerados que ainda não foram aceitos.</p>
            </div>

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold">
                  <th className="px-6 py-3">Função Convidada</th>
                  <th className="px-6 py-3">Expiração</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv: any) => {
                  const isExpired = new Date(inv.expires_at) < new Date();
                  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : "https://rentflow.com.br"}/invite/${inv.token}`;
                  return (
                    <tr key={inv.id} className="border-t hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4 font-medium capitalize">
                        {roleLabels[inv.role] || inv.role}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs ${isExpired ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                          {isExpired ? "Expirado" : `Vence em ${formatDate(inv.expires_at, "dd/MM/yyyy HH:mm")}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!isExpired && (
                            <button
                              onClick={() => copyLinkToClipboard(inviteLink)}
                              className="p-1.5 hover:bg-muted text-muted-foreground rounded-lg transition-colors"
                              title="Copiar Link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => revokeInviteMutation.mutate(inv.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                            title="Excluir Convite"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
