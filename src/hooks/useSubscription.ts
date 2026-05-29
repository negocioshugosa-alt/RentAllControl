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

  const isPastDue = status === "past_due";
  const isReadOnly = isTrialExpired || isPastDue;

  return {
    plan,
    status,
    isTrialExpired,
    isPastDue,
    isReadOnly,
    trialDaysLeft,
    isLoading,
    company,
  };
}
