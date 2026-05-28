"use client";
// src/app/configuracoes/page.tsx
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/shared/Header";
import { formatCpfCnpj, unformatDocument } from "@/lib/utils";
import { toast } from "sonner";
import { Building2, Key, User, Save, Eye, EyeOff, Upload, X, ImageIcon, CreditCard, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const companySchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
}).superRefine((data, ctx) => {
  const length = unformatDocument(data.cnpj || "").length;
  if (length > 0 && length !== 14) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: "CNPJ deve ter 14 dígitos",
    });
  }
});

type CompanyData = z.infer<typeof companySchema>;

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
  const [activeTab, setActiveTab] = useState<"empresa" | "perfil">("empresa");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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



  // Upload de logo
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `${company.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", company.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Logo atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    const supabase = createClient();
    await supabase.from("companies").update({ logo_url: null }).eq("id", company.id);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Logo removida");
  }

  const saveCompany = useMutation({
    mutationFn: async (data: CompanyData) => {
      const supabase = createClient();
      const payload = { ...data, cnpj: data.cnpj ? unformatDocument(data.cnpj) : null };
      const { error } = await supabase.from("companies").update(payload).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Empresa atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const tabs = [
    { id: "empresa", label: "Empresa", icon: Building2, href: null },
    { id: "perfil", label: "Meu Perfil", icon: User, href: null },
    { id: "assinatura", label: "Plano / Assinatura", icon: CreditCard, href: "/configuracoes/assinatura" },
    { id: "equipe", label: "Minha Equipe", icon: Users, href: "/configuracoes/equipe" },
  ] as const;

  const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <div className="flex flex-col flex-1">
      <Header title="Configurações" subtitle="Gerencie empresa, integrações e perfil" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
          {tabs.map((tab) => {
            const className = `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`;
            if (tab.href) {
              return (
                <Link key={tab.id} href={tab.href} className={className}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={className}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "empresa" && (
          <div className="space-y-4">
            {/* Logo Upload */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-4">Logo da Empresa</h3>
              <div className="flex items-center gap-6">
                {/* Preview */}
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 flex-shrink-0 overflow-hidden">
                  {company?.logo_url ? (
                    <Image
                      src={company.logo_url}
                      alt="Logo"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1 opacity-40" />
                      <p className="text-xs text-muted-foreground">Sem logo</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 2MB.<br />
                    Recomendado: imagem quadrada com pelo menos 200×200px.
                  </p>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingLogo ? "Enviando…" : "Enviar Logo"}
                    </button>
                    {company?.logo_url && (
                      <button
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Company Data */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Dados da Empresa</h3>
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
                    <Controller
                      name="cnpj"
                      control={companyForm.control}
                      render={({ field }) => (
                        <input
                          {...field}
                          className="input w-full font-mono"
                          inputMode="numeric"
                          maxLength={18}
                          placeholder="00.000.000/0000-00"
                          value={formatCpfCnpj(field.value || "", "pj")}
                          onChange={(e) => field.onChange(unformatDocument(e.target.value).slice(0, 14))}
                        />
                      )}
                    />
                    {companyForm.formState.errors.cnpj && (
                      <p className="text-xs text-destructive mt-1">{companyForm.formState.errors.cnpj.message}</p>
                    )}
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
                    <select {...companyForm.register("state")} className="input w-full">
                      <option value="">—</option>
                      {STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
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
