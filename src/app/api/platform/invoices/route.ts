// src/app/api/platform/invoices/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asaas } from "@/services/asaas";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, companies(asaas_customer_id, subscription_status)")
    .eq("user_id", user.id)
    .single();

  const asaasCustomerId = (profile?.companies as any)?.asaas_customer_id;
  const currentStatus = (profile?.companies as any)?.subscription_status;

  if (!asaasCustomerId) {
    return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada" }, { status: 404 });
  }

  try {
    // Busca o histórico de cobranças do Asaas
    const paymentsResponse = await asaas.listCharges({
      customer: asaasCustomerId,
    });

    const invoices = paymentsResponse.data.map((c: any) => ({
      id: c.id,
      dueDate: c.dueDate,
      value: c.value,
      status: c.status === "RECEIVED" || c.status === "CONFIRMED" ? "pago" : c.status === "OVERDUE" ? "vencido" : "pendente",
      paymentUrl: c.invoiceUrl,     // Tela completa de pagamento externa
      bankSlipUrl: c.bankSlipUrl,   // Link direto para PDF do Boleto
    }));

    // Mecanismo Auto-Healing: Se houver alguma fatura paga no Asaas mas o banco ainda diz
    // que o status não é ativo (ex: webhook falhou ou não foi configurado), sincroniza imediatamente!
    const hasPaidInvoice = invoices.some(inv => inv.status === "pago");
    if (hasPaidInvoice && currentStatus !== "active" && profile?.company_id) {
      await supabase
        .from("companies")
        .update({
          subscription_status: "active",
          subscription_expires_at: new Date(Date.now() + 35 * 86400000).toISOString(), // Tolerância de 35 dias
        })
        .eq("id", profile.company_id);
    }

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("Erro ao carregar faturas da plataforma:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

