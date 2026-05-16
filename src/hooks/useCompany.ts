"use client";
// src/hooks/useCompany.ts
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Company } from "@/types";

async function fetchCompanyContext(): Promise<{ profile: Profile; company: Company } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return {
    profile: data as Profile,
    company: (data as any).companies as Company,
  };
}

export function useCompany() {
  const { data, isLoading } = useQuery({
    queryKey: ["company-context"],
    queryFn: fetchCompanyContext,
    staleTime: 1000 * 60 * 10,
  });

  return {
    profile: data?.profile,
    company: data?.company,
    companyId: data?.profile?.company_id,
    isLoading,
  };
}
