// src/app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "@/components/shared/DashboardLayoutClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("user_id", user.id)
    .single();

  const { count: alertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
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
