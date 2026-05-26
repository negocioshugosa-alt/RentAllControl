"use client";
// src/components/landing/LandingPage.tsx
import Link from "next/link";
import { Zap, BarChart3, Wrench, FileText, DollarSign, Bell, Check, ChevronDown, ArrowRight, Users, Shield, TrendingUp } from "lucide-react";
import { useState } from "react";

const features = [
  { icon: Wrench, title: "Gestão de Equipamentos", desc: "Controle toda sua frota com status em tempo real, histórico de manutenções e indicadores de desempenho." },
  { icon: FileText, title: "Contratos Digitais", desc: "Crie, edite e gerencie contratos com facilidade. Notificações automáticas de vencimento." },
  { icon: DollarSign, title: "Controle Financeiro", desc: "Contas a pagar e receber, fluxo de caixa, integração com Asaas para PIX e boleto." },
  { icon: BarChart3, title: "Centro de Custo", desc: "Saiba exatamente quanto cada equipamento lucra. Rankings de lucratividade e ROI detalhado." },
  { icon: Bell, title: "Alertas Automáticos", desc: "Nunca perca um vencimento. Alertas de contratos, cobranças e inadimplência em tempo real." },
  { icon: Users, title: "Gestão de Clientes", desc: "Cadastro completo com histórico financeiro, contratos e controle de inadimplência por cliente." },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 149",
    period: "/mês",
    desc: "Ideal para pequenas locadoras",
    features: ["Até 20 equipamentos", "5 usuários", "Contratos ilimitados", "Relatórios PDF", "Suporte por email"],
    highlight: false,
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    price: "R$ 299",
    period: "/mês",
    desc: "Para locadoras em crescimento",
    features: ["Até 100 equipamentos", "15 usuários", "Integração Asaas", "API de webhooks", "Suporte prioritário", "Multi-filiais"],
    highlight: true,
    cta: "Começar grátis",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    desc: "Para grandes operações",
    features: ["Equipamentos ilimitados", "Usuários ilimitados", "Onboarding dedicado", "SLA garantido", "Integrações customizadas"],
    highlight: false,
    cta: "Falar com vendas",
  },
];

const faqs = [
  { q: "Preciso instalar algo?", a: "Não. O RentAllControl é 100% online. Acesse de qualquer dispositivo com um navegador." },
  { q: "Como funciona o período gratuito?", a: "14 dias grátis sem precisar de cartão de crédito. Explore todas as funcionalidades sem compromisso." },
  { q: "Os meus dados são seguros?", a: "Sim. Utilizamos Supabase com PostgreSQL, criptografia em trânsito e em repouso, e backups automáticos diários." },
  { q: "Posso integrar com meu gateway de pagamento?", a: "Sim. Integramos nativamente com a Asaas para emissão de PIX, boleto e cartão de crédito com baixa automática." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade, sem multa. Cancele quando precisar e exporte seus dados a qualquer momento." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold">RentAllControl</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-8 border border-blue-500/20">
            <Zap className="w-3 h-3" />
            ERP para Locadoras — 100% Online
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            Gerencie sua locadora<br />
            <span className="text-primary">com precisão total</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Controle equipamentos, contratos, financeiro e lucratividade em um único sistema.
            Descubra quanto cada máquina realmente lucra para o seu negócio.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Começar 14 dias grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tenho conta →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Sem cartão de crédito · Cancele quando quiser</p>
        </div>

        {/* Mock dashboard preview */}
        <div className="max-w-5xl mx-auto mt-16 relative">
          <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground font-mono max-w-sm">
                  app.rentallcontrol.com.br/dashboard
                </div>
              </div>
            </div>
            {/* Fake dashboard */}
            <div className="flex h-80 md:h-96">
              <div className="w-48 bg-[hsl(var(--sidebar-bg))] p-4 flex-shrink-0 hidden md:block">
                <div className="w-24 h-3 bg-white/20 rounded mb-6" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 mb-4">
                    <div className="w-4 h-4 bg-white/10 rounded" />
                    <div className="h-2 bg-white/10 rounded flex-1" />
                  </div>
                ))}
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Receita", value: "R$ 48.500", color: "text-green-600" },
                    { label: "Despesas", value: "R$ 19.200", color: "text-red-500" },
                    { label: "Lucro", value: "R$ 29.300", color: "text-blue-600" },
                    { label: "Ocupação", value: "87,5%", color: "text-orange-500" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border bg-background p-3">
                      <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                      <p className={`text-lg font-bold tabular-nums ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div className="col-span-2 rounded-xl border bg-background p-4">
                    <div className="w-32 h-2.5 bg-muted rounded mb-4" />
                    <div className="flex items-end gap-2 h-24">
                      {[60, 80, 65, 90, 75, 95, 85].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 === 0 ? "#3b82f6" : "#22c55e", opacity: 0.7 }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background p-4 space-y-2">
                    <div className="w-20 h-2.5 bg-muted rounded mb-3" />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                        <div className="h-2 bg-muted rounded flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Tudo que sua locadora precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Do controle operacional à análise financeira, o RentAllControl centraliza toda a gestão da sua empresa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card rounded-2xl border p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { stat: "500+", label: "Locadoras ativas" },
            { stat: "R$ 12M+", label: "Gerenciados mensalmente" },
            { stat: "98%", label: "Satisfação dos clientes" },
          ].map((item) => (
            <div key={item.stat}>
              <p className="font-display text-4xl font-bold text-primary mb-2">{item.stat}</p>
              <p className="text-muted-foreground text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-20 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Planos simples e transparentes</h2>
            <p className="text-muted-foreground">14 dias grátis em todos os planos. Sem cartão de crédito.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col ${plan.highlight ? "bg-primary text-primary-foreground border-primary shadow-xl scale-[1.02]" : "bg-card"}`}
              >
                {plan.highlight && (
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-1 rounded-full self-start mb-4">
                    Mais popular
                  </span>
                )}
                <h3 className={`font-semibold text-lg mb-1 ${plan.highlight ? "text-white" : ""}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>{plan.desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`font-display text-3xl font-bold ${plan.highlight ? "text-white" : ""}`}>{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-white/80" : "text-green-500"}`} />
                      <span className={plan.highlight ? "text-white/90" : ""}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-white text-primary hover:bg-white/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Perguntas frequentes</h2>
          <div className="bg-card rounded-2xl border p-6">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[hsl(var(--sidebar-bg))] text-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Comece a lucrar mais com sua locadora hoje
          </h2>
          <p className="text-white/60 mb-8">
            14 dias grátis, configuração em minutos, sem complicações.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors"
          >
            Criar conta grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-sm">RentAllControl</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} RentAllControl. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Termos</Link>
            <Link href="#" className="hover:text-foreground">Privacidade</Link>
            <Link href="#" className="hover:text-foreground">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
