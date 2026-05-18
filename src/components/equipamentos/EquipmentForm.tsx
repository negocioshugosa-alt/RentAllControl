"use client";
// src/components/equipamentos/EquipmentForm.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { createClient } from "@/lib/supabase/client";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS, generateEquipmentCode } from "@/lib/utils";
import { toast } from "sonner";
import type { Equipment } from "@/types";

const schema = z.object({
  // Obrigatórios
  code: z.string().min(1, "Código obrigatório"),
  name: z.string().min(2, "Nome obrigatório"),
  category: z.string().min(1, "Categoria obrigatória"),
  status: z.enum(["disponivel", "alugado", "manutencao", "inativo"]),
  // Opcionais identificação
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional().nullable(),
  plate: z.string().optional(),
  chassis: z.string().optional(),
  hourimeter: z.number().optional().nullable(),
  km: z.number().optional().nullable(),
  // Opcionais financeiro
  purchase_value: z.number().optional().nullable(),
  financing_value: z.number().optional().nullable(),
  monthly_installment: z.number().optional().nullable(),
  monthly_insurance: z.number().optional().nullable(),
  annual_ipva: z.number().optional().nullable(),
  depreciation_rate: z.number().optional().nullable(),
  daily_rate: z.number().optional().nullable(),
  monthly_rate: z.number().optional().nullable(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  equipment?: Equipment | null;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Componente de campo monetário com formatação BRL
function CurrencyInput({ name, control, label }: { name: any; control: any; label: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <NumericFormat
            className="input w-full"
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="R$ "
            placeholder="R$ 0,00"
            value={field.value ?? ""}
            onValueChange={(vals) => field.onChange(vals.floatValue ?? null)}
          />
        )}
      />
    </div>
  );
}

export function EquipmentForm({ equipment, companyId, onClose, onSuccess }: Props) {
  const isEdit = !!equipment;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: equipment?.code || generateEquipmentCode(),
      name: equipment?.name || "",
      category: equipment?.category || "",
      brand: equipment?.brand || "",
      model: equipment?.model || "",
      year: equipment?.year || null,
      plate: equipment?.plate || "",
      chassis: equipment?.chassis || "",
      hourimeter: equipment?.hourimeter ? Number(equipment.hourimeter) : null,
      km: equipment?.km ? Number(equipment.km) : null,
      status: equipment?.status || "disponivel",
      purchase_value: equipment?.purchase_value ? Number(equipment.purchase_value) : null,
      financing_value: equipment?.financing_value ? Number(equipment.financing_value) : null,
      monthly_installment: equipment?.monthly_installment ? Number(equipment.monthly_installment) : null,
      monthly_insurance: equipment?.monthly_insurance ? Number(equipment.monthly_insurance) : null,
      annual_ipva: equipment?.annual_ipva ? Number(equipment.annual_ipva) : null,
      depreciation_rate: equipment?.depreciation_rate ? Number(equipment.depreciation_rate) : 20,
      daily_rate: equipment?.daily_rate ? Number(equipment.daily_rate) : null,
      monthly_rate: equipment?.monthly_rate ? Number(equipment.monthly_rate) : null,
      notes: equipment?.notes || "",
    },
  });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    // Remove nulls to avoid DB issues
    const payload = Object.fromEntries(
      Object.entries({ ...data, company_id: companyId }).filter(([_, v]) => v !== null && v !== "")
    );

    const { error } = isEdit
      ? await supabase.from("equipment").update(payload).eq("id", equipment!.id)
      : await supabase.from("equipment").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Equipamento atualizado!" : "Equipamento cadastrado!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold font-display">
              {isEdit ? "Editar Equipamento" : "Novo Equipamento"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Campos com * são obrigatórios</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

          {/* Identificação - OBRIGATÓRIOS */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Identificação
              </h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Obrigatório</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Código do Equipamento *</label>
                <input
                  {...register("code")}
                  className="input w-full font-mono"
                  placeholder="EQ-0001"
                />
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
                <label className="text-sm font-medium mb-1 block">Nome / Descrição *</label>
                <input
                  {...register("name")}
                  className="input w-full"
                  placeholder="Ex: Retroescavadeira Volvo EC220"
                />
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
            </div>
          </section>

          {/* Dados Complementares - OPCIONAIS */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Dados Complementares
              </h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Opcional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Marca</label>
                <input {...register("brand")} className="input w-full" placeholder="Ex: Volvo, CAT, John Deere" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Modelo</label>
                <input {...register("model")} className="input w-full" placeholder="Ex: EC220" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ano</label>
                <input
                  {...register("year", { valueAsNumber: true, setValueAs: v => v === "" ? null : Number(v) })}
                  type="number"
                  className="input w-full"
                  placeholder="2024"
                  min="1950"
                  max="2030"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Placa</label>
                <input {...register("plate")} className="input w-full" placeholder="ABC-1234" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Chassi</label>
                <input {...register("chassis")} className="input w-full" placeholder="9BWZZZ377VT004251" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Horímetro (h)</label>
                <Controller
                  name="hourimeter"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      className="input w-full"
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={1}
                      suffix=" h"
                      placeholder="0,0 h"
                      value={field.value ?? ""}
                      onValueChange={(vals) => field.onChange(vals.floatValue ?? null)}
                    />
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">KM</label>
                <Controller
                  name="km"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      className="input w-full"
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={0}
                      suffix=" km"
                      placeholder="0 km"
                      value={field.value ?? ""}
                      onValueChange={(vals) => field.onChange(vals.floatValue ?? null)}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          {/* Dados Financeiros - OPCIONAIS */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Dados Financeiros
              </h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Opcional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CurrencyInput name="purchase_value" control={control} label="Valor de Compra" />
              <CurrencyInput name="financing_value" control={control} label="Valor Financiado" />
              <CurrencyInput name="monthly_installment" control={control} label="Parcela Mensal" />
              <CurrencyInput name="monthly_insurance" control={control} label="Seguro Mensal" />
              <CurrencyInput name="annual_ipva" control={control} label="IPVA Anual" />
              <div>
                <label className="text-sm font-medium mb-1 block">Depreciação Anual (%)</label>
                <Controller
                  name="depreciation_rate"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      className="input w-full"
                      decimalSeparator=","
                      decimalScale={1}
                      suffix="%"
                      placeholder="20,0%"
                      value={field.value ?? ""}
                      onValueChange={(vals) => field.onChange(vals.floatValue ?? null)}
                    />
                  )}
                />
              </div>
              <CurrencyInput name="daily_rate" control={control} label="Valor Diária" />
              <CurrencyInput name="monthly_rate" control={control} label="Valor Mensalidade" />
            </div>
          </section>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="input w-full resize-none"
              placeholder="Informações adicionais sobre o equipamento..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
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
