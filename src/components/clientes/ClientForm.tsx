"use client";
// src/components/clientes/ClientForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Client } from "@/types";

const schema = z.object({
  type: z.enum(["pf", "pj"]),
  name: z.string().min(2, "Nome obrigatório"),
  document: z.string().min(11, "CPF/CNPJ obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zip_code: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  client?: Client | null;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function ClientForm({ client, companyId, onClose, onSuccess }: Props) {
  const isEdit = !!client;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: client?.type || "pj",
      name: client?.name || "",
      document: client?.document || "",
      email: client?.email || "",
      phone: client?.phone || "",
      mobile: client?.mobile || "",
      address: client?.address || "",
      city: client?.city || "",
      state: client?.state || "",
      zip_code: client?.zip_code || "",
      notes: client?.notes || "",
    },
  });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = { ...data, company_id: companyId };

    const { error } = isEdit
      ? await supabase.from("clients").update(payload).eq("id", client!.id)
      : await supabase.from("clients").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Cliente atualizado!" : "Cliente cadastrado!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold font-display">{isEdit ? "Editar Cliente" : "Novo Cliente"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Type selector */}
          <div className="flex gap-3">
            {(["pj", "pf"] as const).map((t) => (
              <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${watch("type") === t ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}>
                <input {...register("type")} type="radio" value={t} className="hidden" />
                {t === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Nome / Razão Social *</label>
              <input {...register("name")} className="input w-full" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{watch("type") === "pf" ? "CPF" : "CNPJ"} *</label>
              <input {...register("document")} className="input w-full font-mono" placeholder={watch("type") === "pf" ? "000.000.000-00" : "00.000.000/0000-00"} />
              {errors.document && <p className="text-xs text-destructive mt-1">{errors.document.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input {...register("email")} type="email" className="input w-full" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefone</label>
              <input {...register("phone")} className="input w-full" placeholder="(00) 0000-0000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Celular</label>
              <input {...register("mobile")} className="input w-full" placeholder="(00) 00000-0000" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Endereço</label>
              <input {...register("address")} className="input w-full" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade</label>
              <input {...register("city")} className="input w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">UF</label>
                <select {...register("state")} className="input w-full">
                  <option value="">—</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">CEP</label>
                <input {...register("zip_code")} className="input w-full" placeholder="00000-000" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Observações</label>
              <textarea {...register("notes")} rows={3} className="input w-full resize-none" />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
