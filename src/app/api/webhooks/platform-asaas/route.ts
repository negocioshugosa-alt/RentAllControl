// src/app/api/webhooks/platform-asaas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    // Log the webhook call
    await supabase.from("webhook_logs").insert({
      event: `platform_${body.event}`,
      payload: body,
      processed: false,
    });

    const { event, payment } = body;
    if (!payment) return NextResponse.json({ ok: true });

    // Encontra a empresa pelo externalReference (ID da empresa) ou customer ID do Asaas
    const companyId = payment.externalReference;
    const asaasCustomerId = payment.customer;

    let query = supabase.from("companies").select("id, subscription_plan");
    if (companyId) {
      query = query.eq("id", companyId);
    } else if (asaasCustomerId) {
      query = query.eq("asaas_customer_id", asaasCustomerId);
    } else {
      return NextResponse.json({ ok: true });
    }

    const { data: company, error: companyError } = await query.maybeSingle();

    if (companyError || !company) {
      console.warn("Empresa correspondente não encontrada para o webhook do Asaas:", companyError);
      return NextResponse.json({ ok: true });
    }

    const targetCompanyId = company.id;

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Ativa a assinatura
      await supabase
        .from("companies")
        .update({
          subscription_status: "active",
          subscription_expires_at: new Date(Date.now() + 35 * 86400000).toISOString(), // Estende por 35 dias (tolerância)
        })
        .eq("id", targetCompanyId);

      // Tratamento de excesso de usuários em caso de plano Essencial (Downgrade)
      if (company.subscription_plan === "essencial") {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, role, created_at")
          .eq("company_id", targetCompanyId)
          .order("created_at", { ascending: true });

        if (profiles && profiles.length > 1) {
          // Identifica o admin mais antigo
          const adminOwner = profiles.find((p) => p.role === "admin" || p.role === "owner") || profiles[0];

          // Desativa todos os outros
          const otherProfileIds = profiles
            .filter((p) => p.id !== adminOwner.id)
            .map((p) => p.id);

          if (otherProfileIds.length > 0) {
            await supabase
              .from("profiles")
              .update({ is_active: false })
              .in("id", otherProfileIds);
          }
        }
      }
    }

    if (event === "PAYMENT_OVERDUE") {
      // Marca como inadimplente
      await supabase
        .from("companies")
        .update({ subscription_status: "past_due" })
        .eq("id", targetCompanyId);
    }

    if (event === "SUBSCRIPTION_DELETED") {
      // Assinatura cancelada
      await supabase
        .from("companies")
        .update({ subscription_status: "canceled" })
        .eq("id", targetCompanyId);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro no processamento do webhook da plataforma:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
