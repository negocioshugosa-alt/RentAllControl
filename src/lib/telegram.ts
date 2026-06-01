// src/lib/telegram.ts
// Utilitário para enviar notificações ao Super Admin via Telegram Bot

const TELEGRAM_API = "https://api.telegram.org/bot";

interface TelegramMessage {
  title: string;
  body: string;
  emoji?: string;
}

export async function sendTelegramNotification({ title, body, emoji = "🔔" }: TelegramMessage) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] Bot token ou chat ID não configurados. Notificação ignorada.");
    return;
  }

  const text = `${emoji} *${escapeMarkdown(title)}*\n\n${escapeMarkdown(body)}\n\n_RentAllControl • ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}_`;

  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Telegram] Erro ao enviar mensagem:", err);
    }
  } catch (error) {
    console.error("[Telegram] Falha na conexão:", error);
  }
}

// Escapa caracteres especiais do MarkdownV2 do Telegram
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ─── Helpers de notificação pré-formatados ─────────────────────────

export async function notifyNewCompany(companyName: string, email: string, plan: string) {
  await sendTelegramNotification({
    title: "Nova Empresa Cadastrada",
    emoji: "🏢",
    body: `Empresa: ${companyName}\nEmail: ${email}\nPlano: ${plan}`,
  });
}

export async function notifyPaymentReceived(companyName: string, value: number, plan: string) {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  await sendTelegramNotification({
    title: "Pagamento Confirmado",
    emoji: "✅",
    body: `Empresa: ${companyName}\nValor: ${formatted}\nPlano: ${plan}`,
  });
}

export async function notifyPaymentOverdue(companyName: string, value: number) {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  await sendTelegramNotification({
    title: "Pagamento em Atraso",
    emoji: "⚠️",
    body: `Empresa: ${companyName}\nValor: ${formatted}\nStatus: Inadimplente`,
  });
}

export async function notifySubscriptionCanceled(companyName: string) {
  await sendTelegramNotification({
    title: "Assinatura Cancelada",
    emoji: "❌",
    body: `Empresa: ${companyName}\nA assinatura foi cancelada no Asaas.`,
  });
}

export async function notifyNewSubscription(companyName: string, plan: string, billingType: string) {
  await sendTelegramNotification({
    title: "Nova Assinatura Criada",
    emoji: "🎉",
    body: `Empresa: ${companyName}\nPlano: ${plan === "pro" ? "Pro" : "Essencial"}\nPagamento: ${billingType}`,
  });
}
