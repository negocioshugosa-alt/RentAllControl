// src/app/api/webhooks/asaas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // ── 1. VALIDAÇÃO DE AUTENTICIDADE ──────────────────────────────────────────
  const accessToken = req.headers.get("asaas-access-token");
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken || !accessToken || accessToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  let logId: string | null = null;

  try {
    const body = await req.json();

    // ── 2. REGISTRAR LOG ───────────────────────────────────────────────────
    const { data: log } = await supabase
      .from("webhook_logs")
      .insert({
        event: body.event,
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
    const { data: alreadyProcessed } = await supabase
      .from("webhook_logs")
      .select("id")
      .eq("event", event)
      .eq("processed", true)
      .filter("payload->payment->>id", "eq", payment.id)
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

    // ── 4. BUSCAR TRANSAÇÃO ──────────────────────────────────────────────────
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("asaas_charge_id", payment.id)
      .single();

    if (!transaction) {
      if (logId) {
        await supabase
          .from("webhook_logs")
          .update({ processed: true })
          .eq("id", logId);
      }
      return NextResponse.json({ ok: true });
    }

    // ── 5. PROCESSAR EVENTO ──────────────────────────────────────────────────
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await supabase
        .from("transactions")
        .update({
          status: "pago",
          paid_date: new Date().toISOString().split("T")[0],
          payment_method: payment.billingType?.toLowerCase() || "asaas",
        })
        .eq("id", transaction.id);
    }

    if (event === "PAYMENT_OVERDUE") {
      await supabase
        .from("transactions")
        .update({ status: "vencido" })
        .eq("id", transaction.id);
    }

    if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      await supabase
        .from("transactions")
        .update({ status: "cancelado" })
        .eq("id", transaction.id);
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
    console.error("Webhook error:", error);

    // ── 7. REGISTRAR ERRO ────────────────────────────────────────────────────
    if (logId) {
      await supabase
        .from("webhook_logs")
        .update({ error: error?.message ?? "unknown_error" })
        .eq("id", logId);
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
