"use client";
// src/components/financeiro/AsaasChargeModal.tsx
import { useState } from "react";
import { X, QrCode, FileText, CreditCard, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Transaction } from "@/types";

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

interface ChargeResult {
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: { encodedImage: string; payload: string };
}

export function AsaasChargeModal({ transaction, onClose }: Props) {
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [result, setResult] = useState<ChargeResult | null>(null);

  const createChargeMutation = useMutation({
    mutationFn: async () => {
      const isSandbox = process.env.NEXT_PUBLIC_ASAAS_SANDBOX === "true";
      const ASAAS_BASE_URL = isSandbox
        ? "https://sandbox.asaas.com/api/v3"
        : "https://api.asaas.com/v3";

      const supabase = createClient();

      // Get company Asaas key
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, companies(asaas_api_key)")
        .eq("user_id", user!.id)
        .single();

      const apiKey = (profile as any)?.companies?.asaas_api_key;
      if (!apiKey) throw new Error("Chave Asaas não configurada. Configure em Configurações → Integração.");

      // Get or create Asaas customer
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", transaction.client_id)
        .single();

      if (!client) throw new Error("Cliente não encontrado");

      let asaasCustomerId = client.asaas_customer_id;

      if (!asaasCustomerId) {
        const res = await fetch(`${ASAAS_BASE_URL}/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "access_token": apiKey },
          body: JSON.stringify({ name: client.name, cpfCnpj: client.document, email: client.email, phone: client.mobile || client.phone }),
        });
        const customerData = await res.json();
        if (!res.ok) throw new Error(customerData.errors?.[0]?.description || "Erro ao criar cliente Asaas");
        asaasCustomerId = customerData.id;
        await supabase.from("clients").update({ asaas_customer_id: asaasCustomerId }).eq("id", client.id);
      }

      // Create charge
      const chargeRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": apiKey },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType,
          value: Number(transaction.amount),
          dueDate: transaction.due_date,
          description: transaction.description,
          externalReference: transaction.id,
        }),
      });

      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) throw new Error(chargeData.errors?.[0]?.description || "Erro ao criar cobrança");

      // Save charge ID
      await supabase.from("transactions").update({ asaas_charge_id: chargeData.id }).eq("id", transaction.id);

      const chargeResult: ChargeResult = {
        invoiceUrl: chargeData.invoiceUrl,
        bankSlipUrl: chargeData.bankSlipUrl,
      };

      // Fetch PIX QR code if needed
      if (billingType === "PIX") {
        const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${chargeData.id}/pixQrCode`, {
          headers: { "access_token": apiKey },
        });
        if (pixRes.ok) {
          const pixData = await pixRes.json();
          chargeResult.pixQrCode = { encodedImage: pixData.encodedImage, payload: pixData.payload };
        }
      }

      return chargeResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Cobrança criada com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const billingOptions = [
    { type: "PIX" as BillingType, label: "PIX", icon: QrCode, desc: "Aprovação imediata" },
    { type: "BOLETO" as BillingType, label: "Boleto", icon: FileText, desc: "Vencimento em 1-3 dias úteis" },
    { type: "CREDIT_CARD" as BillingType, label: "Cartão", icon: CreditCard, desc: "Link de pagamento" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg font-display">Gerar Cobrança Asaas</h2>
            <p className="text-sm text-muted-foreground">{formatCurrency(Number(transaction.amount))}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          {!result ? (
            <>
              <div>
                <p className="text-sm font-medium mb-3">Forma de cobrança</p>
                <div className="grid grid-cols-3 gap-3">
                  {billingOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setBillingType(opt.type)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        billingType === opt.type
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <opt.icon className={`w-5 h-5 mx-auto mb-1.5 ${billingType === opt.type ? "text-primary" : "text-muted-foreground"}`} />
                      <p className={`text-xs font-semibold ${billingType === opt.type ? "text-primary" : ""}`}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição</span>
                  <span className="font-medium truncate ml-4">{transaction.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold">{formatCurrency(Number(transaction.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span>{transaction.due_date}</span>
                </div>
              </div>

              <button
                onClick={() => createChargeMutation.mutate()}
                disabled={createChargeMutation.isPending}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createChargeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Criando cobrança…</>
                ) : (
                  `Gerar ${billingType === "PIX" ? "QR Code PIX" : billingType === "BOLETO" ? "Boleto" : "Link de Pagamento"}`
                )}
              </button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-lg">Cobrança criada!</p>
                <p className="text-sm text-muted-foreground">Compartilhe com o cliente</p>
              </div>

              {result.pixQrCode && (
                <div className="space-y-3">
                  {/* QR Code image */}
                  <div className="p-4 bg-white rounded-xl inline-block mx-auto">
                    <img
                      src={`data:image/png;base64,${result.pixQrCode.encodedImage}`}
                      alt="QR Code PIX"
                      className="w-40 h-40 mx-auto"
                    />
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.pixQrCode!.payload);
                      toast.success("Código PIX copiado!");
                    }}
                    className="w-full py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Copiar código Pix Copia e Cola
                  </button>
                </div>
              )}

              {result.bankSlipUrl && (
                <a
                  href={result.bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Boleto
                </a>
              )}

              {result.invoiceUrl && (
                <a
                  href={result.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Link de Pagamento
                </a>
              )}

              <button onClick={onClose} className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
