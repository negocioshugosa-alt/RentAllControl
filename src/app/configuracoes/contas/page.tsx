"use client";

// src/app/configuracoes/contas/page.tsx
import { useState } from "react";
import { Header } from "@/components/shared/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import {
  Landmark, Plus, Trash2, Edit2, Save, X, Loader2, CreditCard, Building2, User, Users, Info
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface BankAccount {
  id: string;
  name: string;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  type: "corrente" | "poupanca" | "outra";
  balance: number;
}

export default function ContasBancariasPage() {
  const { companyId } = useCompanyId();
  const { isReadOnly } = useSubscription();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [type, setType] = useState<"corrente" | "poupanca" | "outra">("corrente");
  const [balance, setBalance] = useState<number>(0);

  // Fetch Accounts
  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", companyId!)
        .order("name", { ascending: true });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isReadOnly) {
        throw new Error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      }

      if (!name.trim()) throw new Error("Nome da conta é obrigatório.");

      const supabase = createClient();
      const payload = {
        company_id: companyId!,
        name: name.trim(),
        bank_name: bankName.trim() || null,
        agency: agency.trim() || null,
        account_number: accountNumber.trim() || null,
        type,
        balance: Number(balance) || 0,
      };

      const { error } = editingAccount
        ? await supabase.from("bank_accounts").update(payload).eq("id", editingAccount.id)
        : await supabase.from("bank_accounts").insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-select"] });
      toast.success(editingAccount ? "Conta bancária atualizada!" : "Conta bancária cadastrada com sucesso!");
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar conta bancária.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) {
        throw new Error("Sua assinatura ou período de testes expirou. Ative ou regularize sua assinatura para realizar alterações.");
      }

      const supabase = createClient();
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-select"] });
      toast.success("Conta bancária removida.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover conta bancária.");
    },
  });

  function handleOpenAdd() {
    setEditingAccount(null);
    setName("");
    setBankName("");
    setAgency("");
    setAccountNumber("");
    setType("corrente");
    setBalance(0);
    setShowModal(true);
  }

  function handleOpenEdit(acc: BankAccount) {
    setEditingAccount(acc);
    setName(acc.name);
    setBankName(acc.bank_name || "");
    setAgency(acc.agency || "");
    setAccountNumber(acc.account_number || "");
    setType(acc.type);
    setBalance(acc.balance);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingAccount(null);
  }

  const tabs = [
    { id: "empresa", label: "Empresa", icon: Building2, href: "/configuracoes" },
    { id: "perfil", label: "Meu Perfil", icon: User, href: "/configuracoes" },
    { id: "assinatura", label: "Plano / Assinatura", icon: CreditCard, href: "/configuracoes/assinatura" },
    { id: "equipe", label: "Minha Equipe", icon: Users, href: "/configuracoes/equipe" },
    { id: "contas", label: "Contas Bancárias", icon: Landmark, href: "/configuracoes/contas" },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Carregando contas bancárias...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Configurações" subtitle="Gerencie as contas bancárias para lançamentos financeiros" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
          {tabs.map((tab) => {
            const isActive = tab.id === "contas";
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Action Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold font-display">Contas Bancárias</h3>
            <p className="text-xs text-muted-foreground">Cadastre suas contas corrente, poupança ou caixas internos.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            disabled={isReadOnly}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>

        {/* Grid/Table of Accounts */}
        {accounts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
            <Landmark className="w-12 h-12 mx-auto mb-3 opacity-20 text-primary" />
            <p className="text-sm font-medium">Nenhuma conta bancária cadastrada.</p>
            <p className="text-xs mt-1">Cadastre uma conta para organizar suas movimentações de entradas e saídas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-display text-foreground">{acc.name}</h4>
                      {acc.bank_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{acc.bank_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      disabled={isReadOnly}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar Conta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente remover a conta "${acc.name}"? Lançamentos associados a esta conta não serão excluídos, mas perderão o vínculo.`)) {
                          deleteMutation.mutate(acc.id);
                        }
                      }}
                      disabled={isReadOnly}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                      title="Remover Conta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground">Agência / Conta</span>
                    <p className="font-medium mt-0.5">
                      {acc.agency || "—"} / {acc.account_number || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Saldo Atual</span>
                    <p className="font-bold text-sm text-foreground tabular-nums mt-0.5">
                      {formatCurrency(acc.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Formulário */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="font-bold font-display text-base">
                  {editingAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}
                </h3>
                <button onClick={handleCloseModal} className="p-1.5 hover:bg-muted rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Nome Identificador *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: Banco do Brasil Principal, Caixa Físico"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Nome do Banco (Opcional)</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Ex: Banco do Brasil S.A."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Agência (Opcional)</label>
                    <input
                      type="text"
                      className="input w-full font-mono"
                      placeholder="Ex: 1234-5"
                      value={agency}
                      onChange={(e) => setAgency(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Nº da Conta (Opcional)</label>
                    <input
                      type="text"
                      className="input w-full font-mono"
                      placeholder="Ex: 54321-0"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Tipo de Conta</label>
                    <select
                      className="input w-full font-medium"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                    >
                      <option value="corrente">Corrente</option>
                      <option value="poupanca">Poupança</option>
                      <option value="outra">Outra / Caixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Saldo Inicial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full font-mono"
                      placeholder="0,00"
                      value={balance}
                      onChange={(e) => setBalance(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/20">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
