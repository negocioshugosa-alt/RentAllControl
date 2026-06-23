// src/hooks/useSubscription.ts
import { useCompanyContext } from "@/hooks/useCompanyId";
import type { Company } from "@/types";

export function useSubscription() {
  const { data: ctx, isLoading } = useCompanyContext();
  
  const company = ctx?.company as Company | undefined;
  
  const plan = company?.subscription_plan || "pro";
  const status = company?.subscription_status || "trialing";
  const trialEndsAt = company?.subscription_trial_ends_at || null;
  
  let isTrialExpired = false;
  let trialDaysLeft = 0;

  if (status === "trialing" && trialEndsAt) {
    const endsAt = new Date(trialEndsAt);
    const now = new Date();
    isTrialExpired = endsAt < now;
    
    const diffTime = endsAt.getTime() - now.getTime();
    trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  let isSubscriptionExpired = false;
  const expiresAt = company?.subscription_expires_at || null;
  if (status === "active" && expiresAt) {
    const end = new Date(expiresAt);
    const now = new Date();
    isSubscriptionExpired = end < now;
  }

  const isPastDue = status === "past_due" || isSubscriptionExpired;
  const isReadOnly = isTrialExpired || isPastDue;
  
  const purchasedConciliation = company?.has_conciliation_addon === true;
  // O módulo fica liberado se comprado ou se estiver no período de testes ativo.
  // Entretanto, se o sistema como um todo estiver bloqueado, o módulo também não pode ser usado para edições.
  const hasConciliationAddon = purchasedConciliation || (status === "trialing" && !isTrialExpired);

  return {
    plan,
    status,
    isTrialExpired,
    isPastDue,
    isReadOnly,
    trialDaysLeft,
    hasConciliationAddon,
    isLoading,
    company,
  };
}
