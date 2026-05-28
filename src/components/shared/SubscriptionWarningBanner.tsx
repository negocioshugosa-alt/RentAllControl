// src/components/shared/SubscriptionWarningBanner.tsx
"use client";
import Link from "next/link";
import { Clock, CreditCard, X } from "lucide-react";
import { useState } from "react";

interface Props {
  daysRemaining: number;
  type: "trial" | "renewal";
}

export function SubscriptionWarningBanner({ daysRemaining, type }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUrgent = daysRemaining <= 2;

  const message =
    type === "trial"
      ? `Seu período de avaliação gratuita expira em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}. Assine agora para não perder acesso às funcionalidades.`
      : `Sua assinatura será renovada em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}. Verifique seus dados de pagamento para evitar interrupções.`;

  const ctaLabel =
    type === "trial" ? "Assinar Agora" : "Ver Assinatura";

  return (
    <div
      className={`w-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-3 relative z-50 transition-colors duration-300 ${
        isUrgent
          ? "bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white"
          : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 flex-shrink-0 ${isUrgent ? "animate-pulse" : ""}`} />
        <span className="hidden sm:inline">{message}</span>
        <span className="sm:hidden">
          {type === "trial" ? "Trial" : "Renovação"} em {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""}
        </span>
      </div>
      <Link
        href="/configuracoes/assinatura"
        className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 flex-shrink-0 ${
          isUrgent
            ? "bg-white text-rose-700 hover:bg-rose-50"
            : "bg-white text-indigo-700 hover:bg-indigo-50"
        }`}
      >
        <CreditCard className="w-3.5 h-3.5" />
        {ctaLabel}
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Fechar aviso"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
