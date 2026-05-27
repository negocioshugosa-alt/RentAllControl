// src/components/shared/TrialExpiredBanner.tsx
import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";

export function TrialExpiredBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white px-4 py-3 text-center text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-3 shadow-md border-b border-orange-500/20 relative z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
        <span>
          Seu período de testes de 30 dias terminou. O <strong>RentAllControl</strong> está em <strong>Modo Leitura e Relatórios</strong>.
        </span>
      </div>
      <Link
        href="/configuracoes/assinatura"
        className="flex items-center gap-1.5 bg-white text-orange-700 px-3.5 py-1 rounded-full text-xs font-bold hover:bg-orange-50 transition-all shadow-sm hover:scale-105 active:scale-95"
      >
        <CreditCard className="w-3.5 h-3.5" />
        Ativar Assinatura
      </Link>
    </div>
  );
}
