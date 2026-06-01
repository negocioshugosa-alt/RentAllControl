"use client";
// src/app/login/page.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Zap, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "account_deactivated") {
        toast.error(
          "Acesso negado: Sua conta foi temporariamente desativada devido às limitações de usuários do plano da empresa."
        );
      }
    }
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error("Email ou senha inválidos");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo") || "/dashboard";

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(var(--sidebar-bg))] flex-col p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">RentAllControl</span>
          </div>
          <h1 className="font-display font-bold text-4xl leading-tight mb-4">
            Gestão completa<br />para sua locadora
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-12">
            Controle equipamentos, contratos, financeiro e lucratividade em um único lugar.
          </p>
          <div className="space-y-4">
            {[
              "Centro de custo por equipamento",
              "Fluxo de caixa em tempo real",
              "Alertas automáticos de vencimentos",
              "Integração com Asaas (PIX e Boleto)",
              "Relatórios em PDF",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/70 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">RentAllControl</span>
          </div>

          <h2 className="text-2xl font-bold font-display mb-1">Bem-vindo de volta</h2>
          <p className="text-muted-foreground text-sm mb-8">Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                {...register("email")}
                type="email"
                className="input w-full"
                placeholder="seu@email.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Senha</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPwd ? "text" : "password"}
                  className="input w-full pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem conta?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
