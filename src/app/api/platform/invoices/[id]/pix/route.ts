// src/app/api/platform/invoices/[id]/pix/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asaas } from "@/services/asaas";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const pixData = await asaas.getPixQrCode(id);
    return NextResponse.json({
      qrCodeImage: pixData.encodedImage, // Imagem em formato base64
      payload: pixData.payload,         // Pix Copia e Cola
      expirationDate: pixData.expirationDate,
    });
  } catch (error: any) {
    console.error("Erro ao carregar Pix:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
