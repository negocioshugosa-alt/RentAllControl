"use client";
// src/components/equipamentos/EquipmentForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS, generateEquipmentCode } from "@/lib/utils";
import { toast } from "sonner";
import type { Equipment } from "@/types";

const schema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  name: z.string().min(2, "Nome obrigatório"),
  category: z.string().min(1, "Categoria obrigatória"),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  plate: z.string().optional(),
  chassis: z.string().optional(),
  hourimeter: z.number().optional(),
  km: z.number().optional(),
  status: z.enum(["disponivel", "alugado", "manutencao", "inativo"]),
  purchase_value: z.number().optional(),
  financing_value: z.number().optional(),
  monthly_installment: z.number().optional(),
  monthly_insurance: z.number().optional(),
  annual_ipva: z.number().optional(),
  depreciation_rate: z.number().optional(),
  daily_rate: z.number().optional(),
  monthly_rate: z.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  equipment?: Equipment | null;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EquipmentForm({ equipment, companyId, onClose, onSuccess }: Props) {
  const isEdit = !!equipment;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: equipment?.code || generateEquipmentCode(),
      name: equipment?.name || "",
      category: equipment?.category || "",
      brand: equipment?.brand || "",
      model: equipment?.model || "",
      year: equipment?.year || undefined,
      plate: equipment?.plate || "",
      chassis: equipment?.chassis || "",
      hourimeter: equipment?.hourimeter ? Number(equipment.hourimeter) : undefined,
      km: equipment?.km ? Number(equipment.km) : undefined,
      status: equipment?.status || "disponivel",
      purchase_value: equipment?.purchase_value ? Number(equipment.purchase_value) : undefined,
      financing_value: equipment?.financing_value ? Number(equipment.financing_value) : undefined,
      monthly_installment: equipment?.monthly_installment ? Number(equipment.monthly_installment) : undefined,
      monthly_insurance: equipment?.monthly_insurance ? Number(equipment.monthly_insurance) : undefined,
      annual_ipva: equipment?.annual_ipva ? Number(equipment.annual_ipva) : undefined,
      depreciation_rate: equipment?.depreciation_rate ? Number(equipment.depreciation_rate) : 20,
      daily_rate: equipment?.daily_rate ? Number(equipment.daily_rate) : undefined,
      monthly_rate: equipment?.monthly_rate ? Number(equipment.monthly_rate) : undefined,
      notes: equipment?.notes || "",
    },
  });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = { ...data, company_id: companyId };

    const { error } = isEdit
      ? await supabase.from("equipment").update(payload).eq("id", equipment!.id)
      : await supabase.from("equipment").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Equipamento atualizado!" : "Equipamento cadastrado!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold font-display">
            {isEdit ? "Editar Equipamento" : "Novo Equipamento"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* Identificação */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Identificação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Código *</label>
                <input {...register("code")} className="input w-full" placeholder="EQ-0001" />
                {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status *</label>
                <select {...register("status")} className="input w-full">
                  {EQUIPMENT_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">Nome *</label>
                <input {...register("name")} className="input w-full" placeholder="Ex: Retroescavadeira Volvo EC220" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria *</label>
                <select {...register("category")} className="input w-full">
                  <option value="">Selecionar...</option>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Marca</label>
                <input {...register("brand")} className="input w-full" placeholder="Ex: Volvo, CAT, John Deere" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Modelo</label>
                <input {...register("model")} className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ano</label>
                <input {...register("year", { valueAsNumber: true })} type="number" className="input w-full" placeholder="2024" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Placa</label>
                <input {...register("plate")} className="input w-full" placeholder="ABC-1234" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Chassi</label>
                <input {...register("chassis")} className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Horímetro (h)</label>
                <input {...register("hourimeter", { valueAsNumber: true })} type="number" step="0.1" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">KM</label>
                <input {...register("km", { valueAsNumber: true })} type="number" className="input w-full" />
              </div>
            </div>
          </section>

          {/* Financeiro */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Dados Financeiros
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Valor de Compra (R$)</label>
                <input {...register("purchase_value", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valor Financiado (R$)</label>
                <input {...register("financing_value", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Parcela Mensal (R$)</label>
                <input {...register("monthly_installment", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Seguro Mensal (R$)</label>
                <input {...register("monthly_insurance", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">IPVA Anual (R$)</label>
                <input {...register("annual_ipva", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Depreciação Anual (%)</label>
                <input {...register("depreciation_rate", { valueAsNumber: true })} type="number" step="0.1" className="input w-full" placeholder="20" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valor Diária (R$)</label>
                <input {...register("daily_rate", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valor Mensalidade (R$)</label>
                <input {...register("monthly_rate", { valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
              </div>
            </div>
          </section>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <textarea {...register("notes")} rows={3} className="input w-full resize-none" placeholder="Informações adicionais..." />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar Alterações" : "Cadastrar Equipamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
