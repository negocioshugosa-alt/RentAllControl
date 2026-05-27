"use client";
// src/components/shared/DashboardLayoutClient.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { LoginAlertPopup } from "./LoginAlertPopup";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";

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
  const { companyId } = useCompanyId();

  // Real-time alert count polling every 30 seconds
  const { data: liveAlertCount } = useQuery({
    queryKey: ["alert-count", companyId],
    queryFn: () => fetchUnreadAlertCount(companyId!),
    enabled: !!companyId,
    refetchInterval: 30000, // Poll every 30 seconds
    initialData: serverAlertCount,
  });

  const alertCount = liveAlertCount ?? serverAlertCount ?? 0;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          companyName={companyName}
          userName={userName}
          logoUrl={logoUrl}
          alertCount={alertCount}
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

      {/* Login Alert Popup - auto triggers once per session */}
      <LoginAlertPopup />
    </div>
  );
}
