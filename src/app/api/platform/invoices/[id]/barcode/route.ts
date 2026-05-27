// src/app/api/platform/invoices/[id]/barcode/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ASAAS_BASE_URL = process.env.NEXT_PUBLIC_ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/api/v3";

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Chave Asaas não configurada" }, { status: 500 });
  }

  try {
    const res = await fetch(`${ASAAS_BASE_URL}/payments/${id}/identificationField`, {
      headers: {
        "Content-Type": "application/json",
        "access_token": key,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || `Erro Asaas: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      barCode: data.barCode,
      identificationField: data.identificationField, // Linha digitável formatada
    });
  } catch (error: any) {
    console.error("Erro ao carregar código de barras:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
