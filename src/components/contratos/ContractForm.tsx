"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Upload, FileText, ExternalLink } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateContractNumber } from "@/lib/utils";
import { toast } from "sonner";
import type { Contract } from "@/types";

const schema = z.object({
  contract_number: z.string().min(1),
  client_id: z.string().uuid("Selecione um cliente"),
  equipment_id: z.string().uuid("Selecione um equipamento"),
  status: z.enum(["ativo", "encerrado", "cancelado", "pendente"]),
  start_date: z.string().min(1, "Data de início obrigatória"),
  end_date: z.string().optional(),
  daily_rate: z.number().optional().nullable(),
  monthly_rate: z.number().optional().nullable(),
  contract_value: z.number().optional().nullable(),
  payment_frequency: z.enum(["diario", "semanal", "quinzenal", "mensal", "unica"]),
  payment_day: z.number().min(1).max(31).optional().nullable(),
  deposit_value: z.number().optional().nullable(),
  deposit_paid: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  contract?: Contract | null;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractForm({ contract, companyId, onClose, onSuccess }: Props) {
  const isEdit = !!contract;
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(contract?.file_url || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-select", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients").select("id, name").eq("company_id", companyId).eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment-select", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("equipment").select("id, name, code, status, daily_rate, monthly_rate")
        .eq("company_id", companyId).in("status", ["disponivel", "alugado"]).order("name");
      return data || [];
    },
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contract_number: contract?.contract_number || generateContractNumber(),
      client_id: contract?.client_id || "",
      equipment_id: contract?.equipment_id || "",
      status: contract?.status || "ativo",
      start_date: contract?.start_date || new Date().toISOString().split("T")[0],
      end_date: contract?.end_date || "",
      daily_rate: contract?.daily_rate ? Number(contract.daily_rate) : null,
      monthly_rate: contract?.monthly_rate ? Number(contract.monthly_rate) : null,
      contract_value: (contract as any)?.contract_value ? Number((contract as any).contract_value) : null,
      payment_frequency: contract?.payment_frequency || "mensal",
      payment_day: contract?.payment_day || 5,
      deposit_value: contract?.deposit_value ? Number(contract.deposit_value) : null,
      deposit_paid: contract?.deposit_paid || false,
      notes: contract?.notes || "",
    },
  });

  const frequency = watch("payment_frequency");
  const isUnica = frequency === "unica";

  function handleEquipmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const eq = equipment.find((eq: any) => eq.id === e.target.value);
    if (eq) {
      if (eq.daily_rate) setValue("daily_rate", Number(eq.daily_rate));
      if (eq.monthly_rate) setValue("monthly_rate", Number(eq.monthly_rate));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const contractNum = watch("contract_number").replace(/[^a-zA-Z0-9]/g, "-");
      const fileName = `${companyId}/${contractNum}-${Date.now()}.pdf`;

      const { error } = await supabase.storage.from("contract-files").upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("contract-files").getPublicUrl(fileName);
      setFileUrl(publicUrl);
      toast.success("PDF anexado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = {
      ...data,
      company_id: companyId,
      daily_rate: data.daily_rate || null,
      monthly_rate: data.monthly_rate || null,
      contract_value: data.contract_value || null,
      deposit_value: data.deposit_value || null,
      file_url: fileUrl || null,
    };

    const { error } = isEdit
      ? await supabase.from("contracts").update(payload).eq("id", contract!.id)
      : await supabase.from("contracts").insert(payload);

    if (error) { toast.error(error.message); return; }

    if (!isEdit && data.status === "ativo") {
      await supabase.from("equipment").update({ status: "alugado" }).eq("id", data.equipment_id);
    }

    toast.success(isEdit ? "Contrato atualizado!" : "Contrato criado!");
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold font-display">
            {isEdit ? "Editar Contrato" : "Novo Contrato"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

          {/* Identificação */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Número do Contrato *</label>
                <input {...register("contract_number")} className="input w-full font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status *</label>
                <select {...register("status")} className="input w-full">
                  <option value="pendente">Pendente</option>
                  <option value="ativo">Ativo</option>
                  <option value="encerrado">Encerrado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cliente *</label>
                <select {...register("client_id")} className="input w-full">
                  <option value="">Selecionar cliente...</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.client_id && <p className="text-xs text-destructive mt-1">{errors.client_id.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Equipamento *</label>
                <select
                  {...register("equipment_id")}
                  className="input w-full"
                  onChange={(e) => { register("equipment_id").onChange(e); handleEquipmentChange(e); }}
                >
                  <option value="">Selecionar equipamento...</option>
                  {equipment.map((eq: any) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code}) — {eq.status === "alugado" ? "⚠ Alugado" : "✓ Disponível"}
                    </option>
                  ))}
                </select>
                {errors.equipment_id && <p className="text-xs text-destructive mt-1">{errors.equipment_id.message}</p>}
              </div>
            </div>
          </section>

          {/* Período */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Período</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Data de Início *</label>
                <input {...register("start_date")} type="date" className="input w-full" />
                {errors.start_date && <p className="text-xs text-destructive mt-1">{errors.start_date.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Data de Término</label>
                <input {...register("end_date")} type="date" className="input w-full" />
              </div>
            </div>
          </section>

          {/* Financeiro */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financeiro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frequência de Cobrança */}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">Frequência de Cobrança</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "unica", label: "Única" },
                    { value: "diario", label: "Diário" },
                    { value: "semanal", label: "Semanal" },
                    { value: "quinzenal", label: "Quinzenal" },
                    { value: "mensal", label: "Mensal" },
                  ].map((f) => (
                    <label key={f.value}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${frequency === f.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>
                      <input {...register("payment_frequency")} type="radio" value={f.value} className="hidden" />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Pagamento Único */}
              {isUnica ? (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Valor do Contrato (R$)</label>
                  <Controller
                    name="contract_value"
                    control={control}
                    render={({ field }) => (
                      <NumericFormat
                        className="input w-full"
                        thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale
                        prefix="R$ " placeholder="R$ 0,00"
                        value={field.value ?? ""}
                        onValueChange={(vals) => field.onChange(vals.floatValue ?? null)}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Valor total para contrato com pagamento único</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Valor Diária (R$)</label>
                    <Controller name="daily_rate" control={control} render={({ field }) => (
                      <NumericFormat className="input w-full" thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale prefix="R$ " placeholder="R$ 0,00"
                        value={field.value ?? ""} onValueChange={(vals) => field.onChange(vals.floatValue ?? null)} />
                    )} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Mensalidade (R$)</label>
                    <Controller name="monthly_rate" control={control} render={({ field }) => (
                      <NumericFormat className="input w-full" thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale prefix="R$ " placeholder="R$ 0,00"
                        value={field.value ?? ""} onValueChange={(vals) => field.onChange(vals.floatValue ?? null)} />
                    )} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Dia de Pagamento</label>
                    <input {...register("payment_day", { valueAsNumber: true })} type="number" min={1} max={31} className="input w-full" placeholder="5" />
                  </div>
                </>
              )}

              {/* Caução */}
              <div>
                <label className="text-sm font-medium mb-1 block">Valor Caução (R$)</label>
                <Controller name="deposit_value" control={control} render={({ field }) => (
                  <NumericFormat className="input w-full" thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale prefix="R$ " placeholder="R$ 0,00"
                    value={field.value ?? ""} onValueChange={(vals) => field.onChange(vals.floatValue ?? null)} />
                )} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input {...register("deposit_paid")} type="checkbox" id="deposit_paid" className="w-4 h-4 rounded border accent-primary" />
                <label htmlFor="deposit_paid" className="text-sm font-medium">Caução já pago</label>
              </div>
            </div>
          </section>

          {/* Anexo PDF */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Documento do Contrato</h3>
            <div className="rounded-xl border border-dashed border-border p-4">
              {fileUrl ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">PDF anexado</p>
                      <p className="text-xs text-muted-foreground">Clique para visualizar</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button type="button" onClick={() => setFileUrl(null)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                  <FileText className="w-8 h-8 text-muted-foreground opacity-30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Arraste um PDF ou clique para selecionar</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Enviando…" : "Selecionar PDF"}
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">Máximo 10MB</p>
                </div>
              )}
            </div>
          </section>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <textarea {...register("notes")} rows={3} className="input w-full resize-none" />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || uploading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar Contrato"}
          </button>
        </div>
      </div>
    </div>
  );
}
