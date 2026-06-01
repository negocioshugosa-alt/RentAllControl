// src/app/api/platform/admin/test-telegram/route.ts
// Rota temporária de diagnóstico — REMOVER depois de confirmar que funciona
import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const diagnostics: Record<string, unknown> = {
    token_exists: !!token,
    token_length: token?.length || 0,
    token_preview: token ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : "NÃO CONFIGURADO",
    chat_id: chatId || "NÃO CONFIGURADO",
  };

  if (!token || !chatId) {
    return NextResponse.json({ error: "Variáveis não configuradas", diagnostics });
  }

  // Tenta enviar uma mensagem simples (sem MarkdownV2 para evitar problemas de escape)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Teste de conexão RentAllControl!\n\nSe você recebeu esta mensagem, o Telegram está funcionando perfeitamente.",
      }),
    });

    const data = await res.json();
    diagnostics.telegram_response_status = res.status;
    diagnostics.telegram_response = data;

    if (data.ok) {
      return NextResponse.json({ success: true, message: "Mensagem enviada com sucesso!", diagnostics });
    } else {
      return NextResponse.json({ success: false, message: "Telegram retornou erro", diagnostics });
    }
  } catch (err: any) {
    diagnostics.fetch_error = err.message;
    return NextResponse.json({ success: false, message: "Erro na conexão", diagnostics });
  }
}
