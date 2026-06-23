// src/app/financeiro/conciliacao/page.tsx
"use client";

import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { ConciliacaoBancaria } from "@/components/financeiro/ConciliacaoBancaria";
import { useSubscription } from "@/hooks/useSubscription";
import { Lock, RefreshCw, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ConciliacaoPage() {
  const { companyId } = useCompanyId();
  const { hasConciliationAddon, isReadOnly, isTrialExpired, isLoading } = useSubscription();

  if (isLoading) return null;

  // Se o sistema está em modo leitura (expirado/inadimplente/trial expirado), bloquear tudo
  const isBlocked = isReadOnly || isTrialExpired;
  // Só liberar se não está bloqueado E tem o addon (comprado ou trial ativo)
  const canUseConciliation = !isBlocked && hasConciliationAddon;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Conciliação Bancária"
        subtitle="Sincronize seu extrato bancário com os lançamentos do sistema"
      />

      <div className="flex-1 p-6 space-y-4">
        {companyId && canUseConciliation ? (
          <ConciliacaoBancaria companyId={companyId} />
        ) : (
          /* Landing Page de vendas do módulo */
          <div className="max-w-3xl mx-auto mt-8 bg-card border rounded-2xl p-8 md:p-12 text-center shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${isBlocked ? 'from-rose-500 to-red-500' : 'from-emerald-500 to-teal-500'}`} />
            

            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <RefreshCw className="w-10 h-10 text-emerald-600" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-full border-4 border-card flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-black font-display text-foreground mb-4">
              Módulo de Conciliação Bancária
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Automatize o seu financeiro! Economize horas de trabalho manual sincronizando seus extratos bancários diretamente com o RentAllControl.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto mb-10">
              <div className="flex items-start gap-3 bg-muted/30 p-4 rounded-xl border">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Identificação automática de pagamentos pelo valor e data</span>
              </div>
              <div className="flex items-start gap-3 bg-muted/30 p-4 rounded-xl border">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Baixa em lote de múltiplas faturas em poucos cliques</span>
              </div>
              <div className="flex items-start gap-3 bg-muted/30 p-4 rounded-xl border">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Visualização lado a lado do extrato com o sistema</span>
              </div>
              <div className="flex items-start gap-3 bg-muted/30 p-4 rounded-xl border">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Redução a zero dos erros de digitação financeira</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Módulo Adicional por apenas
              </div>
              <div className="text-4xl font-black font-display text-primary">
                R$ 59,90 <span className="text-sm font-normal text-muted-foreground">/ mês</span>
              </div>
              <Link 
                href="/configuracoes/assinatura"
                className={`mt-4 px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-105 shadow-sm text-lg ${
                  isBlocked 
                    ? 'bg-rose-500 text-white hover:bg-rose-600' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isBlocked ? 'Renovar Assinatura' : 'Liberar Módulo Agora'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

