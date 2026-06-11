// src/app/api/webhooks/platform-asaas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPaymentReceived, notifyPaymentOverdue, notifySubscriptionCanceled } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  // ── 1. VALIDAÇÃO DE AUTENTICIDADE ──────────────────────────────────────────
  const accessToken = req.headers.get("asaas-access-token");
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken || !accessToken || accessToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let logId: string | null = null;

  try {
    const body = await req.json();

    // ── 2. REGISTRAR LOG ───────────────────────────────────────────────────
    const { data: log } = await supabase
      .from("webhook_logs")
      .insert({
        event: `platform_${body.event}`,
        payload: body,
        processed: false,
      })
      .select("id")
      .single();

    logId = log?.id ?? null;

    const { event, payment } = body;

    if (!payment) {
      if (logId) {
        await supabase
          .from("webhook_logs")
          .update({ processed: true })
          .eq("id", logId);
      }
      return NextResponse.json({ ok: true });
    }

    // ── 3. IDEMPOTÊNCIA ─────────────────────────────────────────────────────
    const idempotencyKey = payment.id ?? payment.subscription ?? null;

    if (idempotencyKey) {
      const { data: alreadyProcessed } = await supabase
        .from("webhook_logs")
        .select("id")
        .eq("event", `platform_${event}`)
        .eq("processed", true)
        .filter("payload->payment->>id", "eq", idempotencyKey)
        .maybeSingle();

      if (alreadyProcessed) {
        if (logId) {
          await supabase
            .from("webhook_logs")
            .update({ processed: true, error: "duplicate_ignored" })
            .eq("id", logId);
        }
        return NextResponse.json({ ok: true });
      }
    }

    // ── 4. ENCONTRAR A EMPRESA ───────────────────────────────────────────────
    const companyId = payment.externalReference;
    const asaasCustomerId = payment.customer;

    let query = supabase.from("companies").select("id, subscription_plan, name");
    if (companyId) {
      query = query.eq("id", companyId);
    } else if (asaasCustomerId) {
      query = query.eq("asaas_customer_id", asaasCustomerId);
    } else {
      if (logId) {
        await supabase
          .from("webhook_logs")
          .update({ processed: true, error: "no_company_reference" })
          .eq("id", logId);
      }
      return NextResponse.json({ ok: true });
    }

    const { data: company, error: companyError } = await query.maybeSingle();

    if (companyError || !company) {
      console.warn("Empresa não encontrada:", companyError);
      if (logId) {
        await supabase
          .from("webhook_logs")
          .update({ error: companyError?.message ?? "company_not_found" })
          .eq("id", logId);
      }
      return NextResponse.json({ ok: true });
    }

    const targetCompanyId = company.id;

    // ── 5. PROCESSAR EVENTO ──────────────────────────────────────────────────
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await supabase
        .from("companies")
        .update({
          subscription_status: "active",
          subscription_expires_at: new Date(Date.now() + 35 * 86400000).toISOString(),
        })
        .eq("id", targetCompanyId);

      await notifyPaymentReceived(
        company.name || "Empresa sem nome",
        payment.value || 0,
        company.subscription_plan || "essencial"
      ).catch(() => {});

      if (company.subscription_plan === "essencial") {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, role, created_at")
          .eq("company_id", targetCompanyId)
          .order("created_at", { ascending: true });

        if (profiles && profiles.length > 1) {
          const adminOwner =
            profiles.find((p) => p.role === "admin" || p.role === "owner") || profiles[0];

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
      await supabase
        .from("companies")
        .update({ subscription_status: "past_due" })
        .eq("id", targetCompanyId);

      await notifyPaymentOverdue(
        company.name || "Empresa sem nome",
        payment.value || 0
      ).catch(() => {});
    }

    if (event === "SUBSCRIPTION_DELETED") {
      await supabase
        .from("companies")
        .update({ subscription_status: "canceled" })
        .eq("id", targetCompanyId);

      await notifySubscriptionCanceled(company.name || "Empresa sem nome").catch(() => {});
    }

    // ── 6. MARCAR COMO PROCESSADO ────────────────────────────────────────────
    if (logId) {
      await supabase
        .from("webhook_logs")
        .update({ processed: true })
        .eq("id", logId);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro no webhook da plataforma:", error);

    // ── 7. REGISTRAR ERRO ────────────────────────────────────────────────────
    if (logId) {
      await supabase
        .from("webhook_logs")
        .update({ error: error?.message ?? "unknown_error" })
        .eq("id", logId);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
