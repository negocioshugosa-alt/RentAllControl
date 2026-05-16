// src/components/shared/AppLayout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, companies(name)")
    .eq("user_id", user.id)
    .single();

  const { count: alertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile?.company_id)
    .eq("is_read", false);

  return (
    <DashboardLayoutClient
      companyName={(profile as any)?.companies?.name}
      userName={profile?.name}
      alertCount={alertCount || 0}
    >
      {children}
    </DashboardLayoutClient>
  );
}
