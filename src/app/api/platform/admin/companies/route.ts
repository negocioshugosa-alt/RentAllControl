// src/app/api/platform/admin/companies/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Verificação de Super Admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  const userEmail = user.email?.toLowerCase().trim();
  
  if (!superAdminEmail || userEmail !== superAdminEmail) {
    console.log("Super Admin - Acesso Negado:", { envEmail: process.env.SUPER_ADMIN_EMAIL, userEmail: user.email });
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    // Busca todas as empresas
    const { data: companies, error } = await admin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Busca contagem de profiles por empresa
    const { data: profileCounts } = await admin
      .from("profiles")
      .select("company_id");

    // Monta mapa de contagem de usuários por empresa
    const userCountMap: Record<string, number> = {};
    if (profileCounts) {
      for (const p of profileCounts) {
        if (p.company_id) {
          userCountMap[p.company_id] = (userCountMap[p.company_id] || 0) + 1;
        }
      }
    }

    // Monta dados enriquecidos
    const enrichedCompanies = (companies || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      cnpj: c.cnpj || "—",
      subscription_plan: c.subscription_plan || "essencial",
      subscription_status: c.subscription_status || "trialing",
      subscription_expires_at: c.subscription_expires_at,
      subscription_trial_ends_at: c.subscription_trial_ends_at,
      asaas_customer_id: c.asaas_customer_id,
      asaas_subscription_id: c.asaas_subscription_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      user_count: userCountMap[c.id] || 0,
    }));

    // Métricas agregadas
    const total = enrichedCompanies.length;
    const active = enrichedCompanies.filter((c: any) => c.subscription_status === "active").length;
    const trialing = enrichedCompanies.filter((c: any) => c.subscription_status === "trialing").length;
    const pastDue = enrichedCompanies.filter((c: any) => c.subscription_status === "past_due").length;
    const canceled = enrichedCompanies.filter((c: any) => c.subscription_status === "canceled").length;
    const expired = enrichedCompanies.filter((c: any) => {
      if (c.subscription_status === "trialing" && c.subscription_trial_ends_at) {
        return new Date(c.subscription_trial_ends_at) < new Date();
      }
      return false;
    }).length;

    // MRR estimado
    const mrr = enrichedCompanies
      .filter((c: any) => c.subscription_status === "active")
      .reduce((sum: number, c: any) => {
        return sum + (c.subscription_plan === "pro" ? 299.90 : 149.90);
      }, 0);

    return NextResponse.json({
      companies: enrichedCompanies,
      metrics: { total, active, trialing, pastDue, canceled, expired, mrr },
    });
  } catch (error: any) {
    console.error("Erro ao buscar dados do Super Admin:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
