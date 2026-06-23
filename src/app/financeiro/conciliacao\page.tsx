// src/app/financeiro/conciliacao/page.tsx
"use client";

import { useCompanyId } from "@/hooks/useCompanyId";
import { Header } from "@/components/shared/Header";
import { ConciliacaoBancaria } from "@/components/financeiro/ConciliacaoBancaria";

export default function ConciliacaoPage() {
  const { companyId } = useCompanyId();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Conciliação Bancária"
        subtitle="Sincronize seu extrato bancário com os lançamentos do sistema"
      />

      <div className="flex-1 p-6 space-y-4">
        {companyId && <ConciliacaoBancaria companyId={companyId} />}
      </div>
    </div>
  );
}
