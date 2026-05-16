"use client";
// src/app/configuracoes/page.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { toast } from "sonner";
import { Building2, Key, User, Save, Eye, EyeOff } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

const asaasSchema = z.object({
  asaas_api_key: z.string().optional(),
  asaas_wallet_id: z.string().optional(),
});

type CompanyData = z.infer<typeof companySchema>;
type AsaasData = z.infer<typeof asaasSchema>;

async function getProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("user_id", user.id)
    .single();
  return data;
}

export default function ConfiguracoesPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"empresa" | "integracao" | "perfil">("empresa");
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const company = (profile as any)?.companies;

  const companyForm = useForm<CompanyData>({
    resolver: zodResolver(companySchema),
    values: {
      name: company?.name || "",
      cnpj: company?.cnpj || "",
      email: company?.email || "",
      phone: company?.phone || "",
      address: company?.address || "",
      city: company?.city || "",
      state: company?.state || "",
      zip_code: company?.zip_code || "",
    },
  });

  const asaasForm = useForm<AsaasData>({
    resolver: zodResolver(asaasSchema),
    values: {
      asaas_api_key: company?.asaas_api_key || "",
      asaas_wallet_id: company?.asaas_wallet_id || "",
    },
  });

  const saveCompany = useMutation({
    mutationFn: async (data: CompanyData) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Empresa atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAsaas = useMutation({
    mutationFn: async (data: AsaasData) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Integração Asaas salva!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs = [
    { id: "empresa", label: "Empresa", icon: Building2 },
    { id: "integracao", label: "Integração Asaas", icon: Key },
    { id: "perfil", label: "Meu Perfil", icon: User },
  ] as const;

  return (
    <div className="flex flex-col flex-1">
      <Header title="Configurações" subtitle="Gerencie empresa, integrações e perfil" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Empresa */}
        {activeTab === "empresa" && (
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-lg">Dados da Empresa</h2>
            <form onSubmit={companyForm.handleSubmit((d) => saveCompany.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Nome / Razão Social *</label>
                  <input {...companyForm.register("name")} className="input w-full" />
                  {companyForm.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">{companyForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CNPJ</label>
                  <input {...companyForm.register("cnpj")} className="input w-full font-mono" placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <input {...companyForm.register("email")} type="email" className="input w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telefone</label>
                  <input {...companyForm.register("phone")} className="input w-full" placeholder="(00) 0000-0000" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CEP</label>
                  <input {...companyForm.register("zip_code")} className="input w-full" placeholder="00000-000" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Endereço</label>
                  <input {...companyForm.register("address")} className="input w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Cidade</label>
                  <input {...companyForm.register("city")} className="input w-full" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">UF</label>
                  <input {...companyForm.register("state")} className="input w-full" maxLength={2} placeholder="SP" />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saveCompany.isPending}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saveCompany.isPending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Asaas */}
        {activeTab === "integracao" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold">Integração Asaas</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configure sua chave de API para emitir cobranças via PIX, boleto e cartão.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 mb-6">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Como obter sua chave Asaas?</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                  <li>Acesse <a href="https://asaas.com" target="_blank" className="text-primary hover:underline">asaas.com</a> e faça login</li>
                  <li>Vá em <strong>Configurações → Integrações → Chave de API</strong></li>
                  <li>Copie a chave e cole abaixo</li>
                </ol>
              </div>

              <form onSubmit={asaasForm.handleSubmit((d) => saveAsaas.mutate(d))} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Chave de API (access_token)</label>
                  <div className="relative">
                    <input
                      {...asaasForm.register("asaas_api_key")}
                      type={showApiKey ? "text" : "password"}
                      className="input w-full pr-10 font-mono text-xs"
                      placeholder="$aas_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ambiente: use sandbox para testes, produção para cobranças reais.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Wallet ID (opcional)</label>
                  <input
                    {...asaasForm.register("asaas_wallet_id")}
                    className="input w-full font-mono text-xs"
                    placeholder="ID da subconta Asaas"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saveAsaas.isPending}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saveAsaas.isPending ? "Salvando…" : "Salvar Configuração"}
                  </button>
                </div>
              </form>
            </div>

            {/* Webhook info */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-2">Configurar Webhook no Asaas</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Configure o webhook no Asaas para receber baixas automáticas quando uma cobrança for paga.
              </p>
              <div className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-xs break-all">
                {typeof window !== "undefined" ? window.location.origin : "https://seu-app.vercel.app"}/api/webhooks/asaas
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                No painel Asaas: <strong>Configurações → Webhooks → Adicionar URL</strong>
              </p>
            </div>
          </div>
        )}

        {/* Perfil */}
        {activeTab === "perfil" && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4">Meu Perfil</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-lg">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium capitalize">{profile?.role}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Email</span>
                <span>{profile?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Empresa</span>
                <span>{company?.name}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Função</span>
                <span className="capitalize">{profile?.role}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-3">Segurança</p>
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.resetPasswordForEmail(profile?.email || "", {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  toast.success("Email de redefinição de senha enviado!");
                }}
                className="text-sm text-primary hover:underline"
              >
                Alterar senha →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
