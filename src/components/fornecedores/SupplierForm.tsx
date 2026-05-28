"use client";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCpfCnpj, unformatDocument, formatPhone, formatCep } from "@/lib/utils";
import { toast } from "sonner";
import type { Supplier } from "@/types";
import { useSubscription } from "@/hooks/useSubscription";

const SUPPLIER_CATEGORIES = [
  "Combustível", "Manutenção", "Pneus", "Peças", "Seguro",
  "Lavagem", "Escritório", "Marketing", "Transportes", "Outros",
];

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  document: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const length = unformatDocument(data.document || "").length;
  if (length > 0 && length !== 11 && length !== 14) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["document"],
      message: "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos",
    });
  }
});

type FormData = z.infer<typeof schema>;

interface Props {
  supplier?: Supplier | null;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierForm({ supplier, companyId, onClose, onSuccess }: Props) {
  const isEdit = !!supplier;
  const { isReadOnly } = useSubscription();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: supplier?.name || "",
      document: supplier?.document || "",
      email: supplier?.email || "",
      phone: supplier?.phone || "",
      mobile: supplier?.mobile || "",
      category: supplier?.category || "",
      address: supplier?.address || "",
      city: supplier?.city || "",
      state: supplier?.state || "",
      zip_code: supplier?.zip_code || "",
      notes: supplier?.notes || "",
    },
  });

  async function onSubmit(data: FormData) {
    if (isReadOnly) {
      toast.error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      return;
    }

    const supabase = createClient();
    const payload = { ...data, document: data.document ? unformatDocument(data.document) : null, company_id: companyId, is_active: true };

    const { error } = isEdit
      ? await supabase.from("suppliers").update(payload).eq("id", supplier!.id)
      : await supabase.from("suppliers").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold font-display">{isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Campos com * são obrigatórios</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Nome / Razão Social *</label>
              <input {...register("name")} className="input w-full" placeholder="Ex: Posto ABC Ltda" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">CPF / CNPJ</label>
              <Controller
                name="document"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="input w-full font-mono"
                    inputMode="numeric"
                    maxLength={18}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={formatCpfCnpj(field.value || "")}
                    onChange={(e) => field.onChange(unformatDocument(e.target.value).slice(0, 14))}
                  />
                )}
              />
              {errors.document && <p className="text-xs text-destructive mt-1">{errors.document.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <select {...register("category")} className="input w-full">
                <option value="">Selecionar...</option>
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input {...register("email")} type="email" className="input w-full" placeholder="contato@fornecedor.com" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefone</label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="input w-full font-mono"
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="(00) 0000-0000"
                    value={formatPhone(field.value || "")}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                )}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Celular / WhatsApp</label>
              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="input w-full font-mono"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={formatPhone(field.value || "")}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  />
                )}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">CEP</label>
              <Controller
                name="zip_code"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="input w-full font-mono"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="00000-000"
                    value={formatCep(field.value || "")}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Endereço</label>
              <input {...register("address")} className="input w-full" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade</label>
              <input {...register("city")} className="input w-full" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">UF</label>
              <select {...register("state")} className="input w-full">
                <option value="">—</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Observações</label>
              <textarea {...register("notes")} rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || isReadOnly}
            title={isReadOnly ? "Regularize sua assinatura para liberar alterações" : undefined}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Cadastrar Fornecedor"}
          </button>
        </div>
      </div>
    </div>
  );
}
