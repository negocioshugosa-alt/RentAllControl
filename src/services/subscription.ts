// src/services/subscription.ts
import { createClient } from "@/lib/supabase/server";

export interface SubscriptionStatus {
  plan: "essencial" | "pro";
  status: "trialing" | "active" | "past_due" | "canceled";
  isTrialExpired: boolean;
  isPastDue: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
}

export async function getSubscriptionStatus(companyId: string): Promise<SubscriptionStatus> {
  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("subscription_plan, subscription_status, subscription_trial_ends_at")
    .eq("id", companyId)
    .single();

  if (error || !company) {
    return {
      plan: "pro",
      status: "trialing",
      isTrialExpired: false,
      isPastDue: false,
      trialEndsAt: null,
      trialDaysLeft: 30,
    };
  }

  const plan = (company.subscription_plan || "pro") as "essencial" | "pro";
  const status = (company.subscription_status || "trialing") as "trialing" | "active" | "past_due" | "canceled";
  const trialEndsAt = company.subscription_trial_ends_at || null;

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

  return {
    plan,
    status,
    isTrialExpired,
    isPastDue,
    trialEndsAt,
    trialDaysLeft,
  };
}

export async function assertCanWrite(companyId: string): Promise<void> {
  const status = await getSubscriptionStatus(companyId);
  if (status.isPastDue) {
    throw new Error(
      "Acesso suspenso: Identificamos uma pendência financeira em sua assinatura. Regularize o pagamento para liberar o sistema."
    );
  }
  if (status.isTrialExpired) {
    throw new Error(
      "Período de testes expirado: Seu trial de 30 dias terminou. Ative uma assinatura para cadastrar, editar ou excluir dados."
    );
  }
}
