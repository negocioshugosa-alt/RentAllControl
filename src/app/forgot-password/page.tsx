"use client";
// src/app/forgot-password/page.tsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Zap, ArrowLeft } from "lucide-react";
import { useState } from "react";

const schema = z.object({ email: z.string().email("Email inválido") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ email }: { email: string }) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold">RentAllControl</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Email enviado!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
            <Link href="/login" className="text-primary text-sm font-medium hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold font-display mb-1">Recuperar senha</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Informe seu email e enviaremos um link de recuperação.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input {...register("email")} type="email" className="input w-full" placeholder="seu@email.com" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message as string}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            </form>

            <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-6 justify-center">
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
