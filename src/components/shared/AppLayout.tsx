// src/components/shared/AppLayout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
import { TrialExpiredBanner } from "./TrialExpiredBanner";
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

  const isTrialExpired =
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt) < new Date();

  const isPastDue = subscriptionStatus === "past_due";

  const { count: alertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("is_read", false);

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  return (
    <div className="flex flex-col min-h-screen w-full">
      {(isTrialExpired || isPastDue) && <TrialExpiredBanner isPastDue={isPastDue} />}
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
