"use client";
// src/app/contratos/ContractActions.tsx — client component for contract row actions
import { useState } from "react";
import { Download, Zap, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateContractPdf } from "@/utils/contractPdf";
import { AsaasChargeModal } from "@/components/financeiro/AsaasChargeModal";
import { toast } from "sonner";

interface Props {
  contractId: string;
  hasClient: boolean;
  amount?: number;
}

export function ContractPdfButton({ contractId }: { contractId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePdf() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: contract } = await supabase
        .from("contracts")
        .select("*, clients(*), equipment(*)")
        .eq("id", contractId)
        .single();

      if (!contract) throw new Error("Contrato não encontrado");

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, companies(*)")
        .eq("user_id", user!.id)
        .single();

      await generateContractPdf(
        contract,
        (contract as any).clients,
        (contract as any).equipment,
        (profile as any).companies
      );
      toast.success("PDF gerado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePdf}
      disabled={loading}
      className="p-1.5 hover:bg-blue-500/10 rounded-lg text-muted-foreground hover:text-blue-600 transition-colors"
      title="Gerar PDF do contrato"
    >
      <Download className="w-4 h-4" />
    </button>
  );
}
