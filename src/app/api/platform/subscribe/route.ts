// src/app/api/platform/subscribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asaas } from "@/services/asaas";
import { notifyNewSubscription } from "@/lib/telegram";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { plan, billingType, name, cnpj, email } = await req.json();

    if (!plan || !billingType || !name || !cnpj || !email) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, companies(asaas_customer_id, subscription_status, subscription_expires_at)")
      .eq("user_id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    const companyId = profile.company_id;
    const companyData = profile.companies as any;
    let customerId = companyData?.asaas_customer_id;

    if (!customerId) {
      // 1. Cadastra como cliente no Asaas da plataforma
      const customer = await asaas.createCustomer({
        name,
        cpfCnpj: cnpj.replace(/\D/g, ""),
        email,
      });
      customerId = (customer as any).id;
    }

    const price = plan === "pro" ? 299.90 : 5.00;

    // Vencimento em 3 dias para a primeira fatura
    const nextDueDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    // 2. Cria a assinatura recorrente mensal
    const subscription = await asaas.createSubscription({
      customer: customerId,
      billingType: billingType,
      value: price,
      cycle: "MONTHLY",
      nextDueDate: nextDueDate,
      description: `Assinatura Plano ${plan === "pro" ? "Pro" : "Essencial"} - RentAllControl`,
      externalReference: companyId,
    });

    // 3. Atualiza os dados da empresa no banco
    const updatePayload: any = {
      asaas_customer_id: customerId,
      asaas_subscription_id: (subscription as any).id,
      subscription_plan: plan,
    };

    // Se a empresa ainda não está ativa, mantém/inicia em trialing
    if (companyData?.subscription_status !== "active") {
      updatePayload.subscription_status = "trialing";
      updatePayload.subscription_expires_at = new Date(Date.now() + 33 * 86400000).toISOString();
    }

    const { error: updateError } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", companyId);

    if (updateError) {
      throw updateError;
    }
    // 🔔 Notificação Telegram
    await notifyNewSubscription(name, plan, billingType).catch(() => {});

    return NextResponse.json({ success: true, customerId: customerId, subscriptionId: (subscription as any).id });
  } catch (error: any) {
    console.error("Erro na ativação da assinatura:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
