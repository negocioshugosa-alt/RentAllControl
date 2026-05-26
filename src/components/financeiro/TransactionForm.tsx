"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Search } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TRANSACTION_CATEGORIES } from "@/lib/utils";
import { useCompanyId } from "@/hooks/useCompanyId";
import { toast } from "sonner";
import type { Transaction } from "@/types";

const schema = z.object({
  type: z.enum(["receita", "despesa"]),
  category: z.string().min(1, "Categoria obrigatória"),
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.number({ required_error: "Valor obrigatório" }).min(0.01, "Valor deve ser maior que zero"),
  due_date: z.string().min(1, "Data obrigatória"),
  paid_date: z.string().optional(),
  status: z.enum(["pendente", "pago", "vencido", "cancelado"]),
  client_id: z.string().optional(),
  supplier_id: z.string().optional(),
  equipment_id: z.string().optional(),
  contract_id: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  transaction?: Transaction | null;
  companyId: string;
  defaultType?: "receita" | "despesa";
  onClose: () => void;
  onSuccess: () => void;
}

// Autocomplete search component
function SearchSelect({
  placeholder,
  items,
  value,
  onChange,
  displayKey = "name",
  secondaryKey,
}: {
  placeholder: string;
  items: any[];
  value: string;
  onChange: (id: string) => void;
  displayKey?: string;
  secondaryKey?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((i) => i.id === value);

  const filtered = query.length > 0
    ? items.filter((i) => i[displayKey]?.toLowerCase().includes(query.toLowerCase()))
    : items;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          className="input w-full pl-8 pr-8"
          placeholder={placeholder}
          value={selectedItem ? selectedItem[displayKey] : query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setQuery(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <div
            className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer border-b"
            onMouseDown={() => { onChange(""); setQuery(""); setOpen(false); }}
          >
            Nenhum
          </div>
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors ${value === item.id ? "bg-primary/5 text-primary font-medium" : ""}`}
              onMouseDown={() => { onChange(item.id); setQuery(""); setOpen(false); }}
            >
              <p className="text-sm">{item[displayKey]}</p>
              {secondaryKey && item[secondaryKey] && (
                <p className="text-xs text-muted-foreground">{item[secondaryKey]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TransactionForm({ transaction, companyId, defaultType = "receita", onClose, onSuccess }: Props) {
  const isEdit = !!transaction;

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-select", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("clients").select("id, name, document").eq("company_id", companyId).order("name");
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-select", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("suppliers").select("id, name, category").eq("company_id", companyId).eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment-select-min", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("equipment").select("id, name, code").eq("company_id", companyId).order("name");
      return data || [];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts-select", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("contracts").select("id, contract_number, clients(name)").eq("company_id", companyId).eq("status", "ativo").order("contract_number");
      return data || [];
    },
  });

  const { register, handleSubmit, watch, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: transaction?.type || defaultType,
      category: transaction?.category || (defaultType === "receita" ? "aluguel" : "manutencao"),
      description: transaction?.description || "",
      amount: transaction?.amount ? Number(transaction.amount) : undefined,
      due_date: transaction?.due_date || new Date().toISOString().split("T")[0],
      paid_date: transaction?.paid_date || "",
      status: transaction?.status || "pendente",
      client_id: transaction?.client_id || "",
      supplier_id: (transaction as any)?.supplier_id || "",
      equipment_id: transaction?.equipment_id || "",
      contract_id: transaction?.contract_id || "",
      payment_method: transaction?.payment_method || "",
      notes: transaction?.notes || "",
    },
  });

  const txType = watch("type");
  const txStatus = watch("status");
  const clientId = watch("client_id");
  const supplierId = watch("supplier_id");

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = {
      ...data,
      company_id: companyId,
      client_id: data.client_id || null,
      supplier_id: data.supplier_id || null,
      equipment_id: data.equipment_id || null,
      contract_id: data.contract_id || null,
      paid_date: data.paid_date || null,
    };

    const { error } = isEdit
      ? await supabase.from("transactions").update(payload).eq("id", transaction!.id)
      : await supabase.from("transactions").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Lançamento atualizado!" : "Lançamento criado!");
    onSuccess();
  }

  const receita_cats = TRANSACTION_CATEGORIES.filter((c) =>
    ["aluguel", "caucao", "multa_contrato", "outros"].includes(c.value)
  );
  const despesa_cats = TRANSACTION_CATEGORIES.filter((c) =>
    !["aluguel", "caucao", "multa_contrato"].includes(c.value)
  );
  const cats = txType === "receita" ? receita_cats : despesa_cats;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold font-display">{isEdit ? "Editar Lançamento" : "Novo Lançamento"}</h2>
            <p className={`text-sm font-medium ${txType === "receita" ? "text-green-600" : "text-red-500"}`}>
              {txType === "receita" ? "Conta a Receber" : "Conta a Pagar"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Type toggle */}
          {!isEdit && (
            <div className="flex gap-3">
              {(["receita", "despesa"] as const).map((t) => (
                <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                  watch("type") === t
                    ? t === "receita" ? "border-green-500 bg-green-500/5 text-green-600" : "border-red-500 bg-red-500/5 text-red-500"
                    : "hover:bg-muted"
                }`}>
                  <input {...register("type")} type="radio" value={t} className="hidden" />
                  {t === "receita" ? "↑ Receita" : "↓ Despesa"}
                </label>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Descrição *</label>
              <input {...register("description")} className="input w-full" placeholder="Ex: Manutenção preventiva caminhão" />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria *</label>
              <select {...register("category")} className="input w-full">
                {cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$) *</label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <NumericFormat
                    className="input w-full"
                    thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale
                    prefix="R$ " placeholder="R$ 0,00"
                    value={field.value ?? ""}
                    onValueChange={(vals) => field.onChange(vals.floatValue)}
                  />
                )}
              />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vencimento *</label>
              <input {...register("due_date")} type="date" className="input w-full" />
              {errors.due_date && <p className="text-xs text-destructive mt-1">{errors.due_date.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status *</label>
              <select {...register("status")} className="input w-full">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            {txStatus === "pago" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Data de Pagamento</label>
                <input {...register("paid_date")} type="date" className="input w-full" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Forma de Pagamento</label>
              <select {...register("payment_method")} className="input w-full">
                <option value="">—</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="cartao">Cartão</option>
                <option value="transferencia">Transferência</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Vinculações */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Vinculações (opcional)
            </h3>
            <div className="space-y-3">
              {/* Receita → Cliente | Despesa → Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {txType === "receita" ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cliente</label>
                    <SearchSelect
                      placeholder="Buscar cliente..."
                      items={clients}
                      value={clientId || ""}
                      onChange={(id) => setValue("client_id", id)}
                      secondaryKey="document"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fornecedor</label>
                    <SearchSelect
                      placeholder="Buscar fornecedor..."
                      items={suppliers}
                      value={supplierId || ""}
                      onChange={(id) => setValue("supplier_id", id)}
                      secondaryKey="category"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">Equipamento</label>
                  <SearchSelect
                    placeholder="Buscar equipamento..."
                    items={equipment.map((e: any) => ({ ...e, name: `${e.name} (${e.code})` }))}
                    value={watch("equipment_id") || ""}
                    onChange={(id) => setValue("equipment_id", id)}
                  />
                </div>
              </div>

              {/* Contrato (full width) */}
              <div>
                <label className="text-sm font-medium mb-1 block">Contrato</label>
                <SearchSelect
                  placeholder="Buscar contrato..."
                  items={contracts.map((c: any) => ({ id: c.id, name: `${c.contract_number} — ${c.clients?.name || ""}` }))}
                  value={watch("contract_id") || ""}
                  onChange={(id) => setValue("contract_id", id)}
                />
              </div>
            </div>
          </section>

          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <textarea {...register("notes")} rows={2} className="input w-full resize-none" />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 ${txType === "receita" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar Lançamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
