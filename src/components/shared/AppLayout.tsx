// src/components/shared/AppLayout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
import { TrialExpiredBanner } from "./TrialExpiredBanner";
import { SubscriptionWarningBanner } from "./SubscriptionWarningBanner";
import { headers } from "next/headers";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?error=account_deactivated");
  }

  const company = (profile as any)?.companies;
  const subscriptionPlan = company?.subscription_plan || "pro";
  const subscriptionStatus = company?.subscription_status || "trialing";
  const trialEndsAt = company?.subscription_trial_ends_at;
  const subscriptionCurrentPeriodEnd = company?.subscription_current_period_end;

  const now = new Date();

  const isTrialExpired =
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt) < now;

  const isPastDue = subscriptionStatus === "past_due";

  // Aviso prévio: últimos 5 dias do trial
  let trialDaysRemaining: number | null = null;
  if (
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    !isTrialExpired
  ) {
    const diffMs = new Date(trialEndsAt).getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 5) {
      trialDaysRemaining = diffDays;
    }
  }

  // Aviso prévio: últimos 5 dias antes da renovação do plano ativo
  let renewalDaysRemaining: number | null = null;
  if (
    subscriptionStatus === "active" &&
    subscriptionCurrentPeriodEnd
  ) {
    const diffMs = new Date(subscriptionCurrentPeriodEnd).getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 5) {
      renewalDaysRemaining = diffDays;
    }
  }

  const { count: alertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("is_read", false);

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Banners de bloqueio (trial expirado ou inadimplente) */}
      {(isTrialExpired || isPastDue) && <TrialExpiredBanner isPastDue={isPastDue} />}

      {/* Banners de aviso prévio (últimos 5 dias) */}
      {!isTrialExpired && !isPastDue && trialDaysRemaining !== null && (
        <SubscriptionWarningBanner daysRemaining={trialDaysRemaining} type="trial" />
      )}
      {!isTrialExpired && !isPastDue && renewalDaysRemaining !== null && (
        <SubscriptionWarningBanner daysRemaining={renewalDaysRemaining} type="renewal" />
      )}

      <DashboardLayoutClient
        companyName={company?.name}
        userName={profile?.name}
        logoUrl={company?.logo_url}
        alertCount={alertCount || 0}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
