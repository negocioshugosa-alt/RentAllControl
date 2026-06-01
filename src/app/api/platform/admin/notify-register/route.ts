// src/app/api/platform/admin/notify-register/route.ts
// Notifica o Super Admin via Telegram quando uma nova empresa se cadastra
import { NextResponse } from "next/server";
import { notifyNewCompany } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const { companyName, email, plan } = await req.json();

    if (!companyName || !email) {
      return NextResponse.json({ ok: true }); // Silenciosamente ignora se dados incompletos
    }

    // Dispara a notificação de forma assíncrona (não bloqueia)
    notifyNewCompany(companyName, email, plan || "essencial").catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Nunca falha — notificação é best-effort
  }
}
