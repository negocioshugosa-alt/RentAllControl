// src/app/api/webhooks/asaas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createClient();

    await supabase.from("webhook_logs").insert({
      event: body.event,
      payload: body,
      processed: false,
    });

    const { event, payment } = body;
    if (!payment) return NextResponse.json({ ok: true });

    const { data: transaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("asaas_charge_id", payment.id)
      .single();

    if (!transaction) return NextResponse.json({ ok: true });

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await supabase.from("transactions").update({
        status: "pago",
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: payment.billingType?.toLowerCase() || "asaas",
      }).eq("id", transaction.id);
    }

    if (event === "PAYMENT_OVERDUE") {
      await supabase.from("transactions").update({ status: "vencido" }).eq("id", transaction.id);
    }

    if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      await supabase.from("transactions").update({ status: "cancelado" }).eq("id", transaction.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
