"use client";
// src/components/shared/DashboardLayoutClient.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { LoginAlertPopup } from "./LoginAlertPopup";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialExpiredBanner } from "./TrialExpiredBanner";
import { SubscriptionWarningBanner } from "./SubscriptionWarningBanner";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  companyName?: string;
  userName?: string;
  logoUrl?: string;
  alertCount?: number;
}

async function fetchUnreadAlertCount(companyId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_read", false);
  return count || 0;
}

export function DashboardLayoutClient({ children, companyName, userName, logoUrl, alertCount: serverAlertCount }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { companyId } = useCompanyId();
  const { isTrialExpired, isPastDue, company } = useSubscription();

  // Load sidebar state from localStorage on mount (prevents hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed") === "true";
    setIsCollapsed(saved);
  }, []);

  const handleToggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", String(nextState));
  };

  // Real-time alert count polling every 30 seconds
  const { data: liveAlertCount } = useQuery({
    queryKey: ["alert-count", companyId],
    queryFn: () => fetchUnreadAlertCount(companyId!),
    enabled: !!companyId,
    refetchInterval: 30000, // Poll every 30 seconds
    initialData: serverAlertCount,
  });

  const alertCount = liveAlertCount ?? serverAlertCount ?? 0;

  const now = new Date();
  const subscriptionStatus = company?.subscription_status || "trialing";
  const trialEndsAt = company?.subscription_trial_ends_at;
  const subscriptionCurrentPeriodEnd = company?.subscription_expires_at;

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

      <div className="flex flex-1 bg-background">
        {/* Desktop Sidebar */}
        <div className={cn(
          "hidden lg:block flex-shrink-0 transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}>
          <Sidebar
            companyName={companyName}
            userName={userName}
            logoUrl={logoUrl}
            alertCount={alertCount}
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-50">
              <Sidebar
                companyName={companyName}
                userName={userName}
                logoUrl={logoUrl}
                alertCount={alertCount}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {children}
        </main>
      </div>

      {/* Login Alert Popup - auto triggers once per session */}
      <LoginAlertPopup />
    </div>
  );
}
