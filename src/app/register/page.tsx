"use client";
// src/app/register/page.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Zap } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  company_name: z.string().min(2, "Nome da empresa obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Senhas não coincidem",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          company_name: data.company_name,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Conta criada! Verifique seu email.");

    // Notifica o Super Admin (aguarda antes de redirecionar, mas nunca bloqueia)
    try {
      await fetch("/api/platform/admin/notify-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: data.company_name, email: data.email }),
      });
    } catch {
      // Ignora erros — notificação é best-effort
    }

    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">RentAllControl</span>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <h1 className="text-2xl font-bold font-display mb-1">Criar conta grátis</h1>
          <p className="text-muted-foreground text-sm mb-6">
            30 dias grátis, sem cartão de crédito
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Seu Nome *</label>
                <input {...register("name")} className="input w-full" placeholder="João Silva" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome da Empresa *</label>
                <input {...register("company_name")} className="input w-full" placeholder="Locadora XYZ" />
                {errors.company_name && <p className="text-xs text-destructive mt-1">{errors.company_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Email *</label>
              <input {...register("email")} type="email" className="input w-full" placeholder="joao@locadora.com.br" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Senha *</label>
              <input {...register("password")} type="password" className="input w-full" placeholder="Mínimo 8 caracteres" />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Confirmar Senha *</label>
              <input {...register("confirm_password")} type="password" className="input w-full" />
              {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
            >
              {isSubmitting ? "Criando conta…" : "Criar conta grátis"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Ao criar sua conta, você concorda com nossos{" "}
            <Link href="#" className="underline">Termos de Uso</Link> e{" "}
            <Link href="#" className="underline">Política de Privacidade</Link>.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
