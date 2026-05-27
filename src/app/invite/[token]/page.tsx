"use client";

// src/app/invite/[token]/page.tsx
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Lock, Mail, Users, CheckCircle } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyInvite() {
      try {
        const supabase = createClient();
        // Busca o convite pelo token (o token é público para consulta)
        const { data: inv, error: invError } = await supabase
          .from("company_invites")
          .select("*, companies(*)")
          .eq("token", token)
          .single();

        if (invError || !inv) {
          throw new Error("Convite não encontrado ou já utilizado.");
        }

        // Verifica expiração
        if (new Date(inv.expires_at) < new Date()) {
          throw new Error("Este convite expirou.");
        }

        setInvite(inv);
        setCompany(inv.companies);
      } catch (err: any) {
        toast.error(err.message || "Erro ao verificar convite.");
      } finally {
        setLoading(false);
      }
    }

    verifyInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      // Sign up a new user with metadata that our handle_new_user trigger will read
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_id: invite.company_id,
            role: invite.role || "operator",
            name: name,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Delete the invite so it cannot be used again
      await supabase.from("company_invites").delete().eq("id", invite.id);

      setSuccess(true);
      toast.success("Conta criada com sucesso! Faça o login.");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao aceitar convite.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando validade do convite...</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border bg-card text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-rose-500">
            ⚠
          </div>
          <h2 className="text-xl font-bold">Convite Inválido</h2>
          <p className="text-sm text-muted-foreground">
            Este link de convite é inválido, expirou ou já foi utilizado para criar uma conta.
            Solicite um novo convite ao administrador da sua empresa.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary to-indigo-600" />
        
        {success ? (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold font-display">Conta Criada!</h2>
            <p className="text-sm text-muted-foreground">
              Você foi associado com sucesso à empresa <strong>{company?.name}</strong>.<br />
              Redirecionando para a tela de login...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black font-display">Aceitar Convite</h2>
              <p className="text-sm text-muted-foreground">
                Crie sua conta para entrar em <strong>{company?.name}</strong> como{" "}
                <strong>{invite.role === "admin" ? "Administrador" : invite.role === "manager" ? "Gerente" : invite.role === "viewer" ? "Visualizador" : "Operador"}</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    className="input w-full pl-9"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    className="input w-full pl-9"
                    placeholder="colaborador@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    className="input w-full pl-9"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    className="input w-full pl-9"
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando Conta...
                  </>
                ) : (
                  "Criar Conta e Acessar"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
