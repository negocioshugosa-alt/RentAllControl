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

  // If past due and NOT on the subscription page, block full access
  if (isPastDue && pathname !== "/configuracoes/assinatura") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border bg-card text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-500 to-rose-600" />
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Assinatura Suspensa</h2>
          <p className="text-muted-foreground text-sm">
            Identificamos uma pendência financeira no pagamento de sua mensalidade do <strong>RentAllControl</strong>.
          </p>
          <div className="p-4 rounded-xl bg-muted/50 border text-left text-xs space-y-2">
            <p className="font-semibold text-foreground">Como regularizar:</p>
            <p className="text-muted-foreground">
              1. Acesse o painel de assinatura clicando no botão abaixo.
            </p>
            <p className="text-muted-foreground">
              2. Obtenha a segunda via da fatura (Pix copia e cola ou código de barras).
            </p>
            <p className="text-muted-foreground">
              3. O acesso será reestabelecido automaticamente após a confirmação.
            </p>
          </div>
          <Link
            href="/configuracoes/assinatura"
            className="block w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-center text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            Acessar Painel de Assinatura
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      {isTrialExpired && <TrialExpiredBanner />}
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
