"use client";
// src/hooks/useCompanyId.ts
// Hook centralizado — evita conflitos de queryKey entre páginas
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

async function fetchCompanyContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("company_id, name, role, companies(*)")
    .eq("user_id", user.id)
    .single();
  if (error || !data) return null;
  return {
    companyId: data.company_id as string,
    companyName: (data as any).companies?.name as string || "Empresa",
    userName: data.name as string,
    userRole: data.role as string,
    logoUrl: (data as any).companies?.logo_url as string | null,
    company: (data as any).companies as any,
  };
}

export function useCompanyContext() {
  return useQuery({
    queryKey: ["company-context"],
    queryFn: fetchCompanyContext,
    staleTime: 1000 * 5, // 5 seconds instead of 10 minutes for fast updates on billing status
    retry: 3,
  });
}

// Convenience hook for pages that only need companyId
export function useCompanyId() {
  const { data, isLoading } = useCompanyContext();
  return { companyId: data?.companyId, isLoading };
}
