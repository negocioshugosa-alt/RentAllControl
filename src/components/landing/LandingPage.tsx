"use client";

// src/components/landing/LandingPage.tsx
import Link from "next/link";
import { 
  Zap, BarChart3, Wrench, FileText, DollarSign, Bell, Check, 
  ChevronDown, ArrowRight, Users, Shield, TrendingUp, Sparkles,
  Building2, Truck, Smartphone, Coffee, Laptop, HeartPulse, Layers,
  ClipboardCheck, ArrowUpRight, HelpCircle
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { useState } from "react";

const features = [
  { 
    icon: Wrench, 
    title: "Ativos sob Controle", 
    desc: "Acompanhe a disponibilidade, o histórico de manutenções e o ciclo de vida de cada ativo físico em tempo real." 
  },
  { 
    icon: FileText, 
    title: "Contratos Blindados", 
    desc: "Crie contratos personalizados digitais em segundos com regras de devolução, cobrança de avarias e assinaturas simples." 
  },
  { 
    icon: DollarSign, 
    title: "Cobrança Inteligente", 
    desc: "Emita faturas de forma automática. Seus clientes recebem links de pagamento com código Pix e boletos instantâneos." 
  },
  { 
    icon: BarChart3, 
    title: "ROI de Ativos Avançado", 
    desc: "Saiba exatamente quanto cada máquina rende. O único sistema que calcula o retorno real e a lucratividade de cada ativo." 
  },
  { 
    icon: Bell, 
    title: "Alertas Preventivos", 
    desc: "Evite surpresas desagradáveis. Receba avisos automáticos sobre manutenções, vencimento de contratos e inadimplências." 
  },
  { 
    icon: Users, 
    title: "CRM para Locadoras", 
    desc: "Histórico financeiro consolidado por cliente, controle automático de restrições por pendências e histórico de aluguéis." 
  },
];

const segments = [
  {
    icon: Building2,
    title: "Construção Civil & Ferramentas",
    desc: "Andaimes, geradores, betoneiras e maquinário pesado. Monitore contratos por obra e evite perdas de patrimônio.",
    tag: "Pesados & Leves"
  },
  {
    icon: Smartphone,
    title: "Eventos & Audiovisual",
    desc: "Sistemas de som, painéis de LED, iluminação e palcos. Ideal para locações de curtíssimo prazo com alta rotatividade.",
    tag: "Alta Rotatividade"
  },
  {
    icon: Laptop,
    title: "Equipamentos de TI & Escritório",
    desc: "Notebooks, desktops, impressoras multifuncionais e redes. Gestão de faturamento recorrente corporativo de longo prazo.",
    tag: "Mensal Recorrente"
  },
  {
    icon: HeartPulse,
    title: "Saúde, Bem-Estar & Home Care",
    desc: "Camas hospitalares, concentradores de O2 e cadeiras de rodas. Rastreabilidade rigorosa de pacientes e higienizações.",
    tag: "Rastreamento & Higiene"
  },
  {
    icon: Coffee,
    title: "Máquinas de Café & Vending",
    desc: "Máquinas expressas e dispensers comerciais. Controle a localização física exata, insumos e cronograma de preventivas.",
    tag: "Gestão por Localização"
  },
  {
    icon: Sparkles,
    title: "Seu Nicho Exato",
    desc: "Aluga caçambas, ferramentas, decorações de eventos, brinquedos, vestuário ou contêineres? O sistema é 100% parametrizável para o seu modelo sem limitações.",
    tag: "Flexibilidade Total",
    highlighted: true
  }
];

const plans = [
  {
    name: "Essencial",
    price: "R$ 149,90",
    period: "/mês",
    desc: "Ideal para autônomos e pequenas locadoras iniciando sua jornada de profissionalização.",
    features: [
      "Até 50 equipamentos cadastrados",
      "1 usuário administrador",
      "Contratos e clientes ilimitados",
      "Controle financeiro básico (receitas/despesas)",
      "Suporte exclusivo por e-mail"
    ],
    highlight: false,
    cta: "Experimentar 30 dias grátis",
  },
  {
    name: "Pro",
    price: "R$ 299,90",
    period: "/mês",
    desc: "A solução completa para locadoras em rápida expansão que buscam máxima automação e lucratividade.",
    features: [
      "Equipamentos e ativos ilimitados",
      "Usuários e colaboradores ilimitados",
      "Alertas automáticos de inadimplência e vencimentos",
      "Centro de custos com ROI avançado por ativo",
      "Exportação de Relatórios Gerenciais (PDF/Excel)",
      "Suporte VIP via WhatsApp com resposta rápida"
    ],
    highlight: true,
    cta: "Experimentar 30 dias grátis",
  }
];

const faqs = [
  { q: "Preciso de um cartão de crédito para testar?", a: "Não. O período de avaliação de 30 dias é totalmente gratuito e não exige dados de pagamento ou cartão de crédito no momento do cadastro." },
  { q: "O que acontece ao fim dos 30 dias de teste?", a: "Sua conta entra automaticamente no amigável 'Modo Leitura'. Você não perde nenhum dado cadastrado, continua navegando por tudo e consegue exportar relatórios em Excel/PDF normalmente, apenas fica impedido de criar novos registros até assinar um plano pago." },
  { q: "O sistema é seguro?", a: "Totalmente. O RentAllControl é construído sobre uma infraestrutura de nível empresarial na Supabase e PostgreSQL, com criptografia de ponta a ponta, backups automáticos diários e conformidade rígida com as diretrizes de segurança da informação." },
  { q: "Posso criar contas para meus funcionários?", a: "Sim! No Plano Pro você pode adicionar colaboradores ilimitados no painel de equipe, permitindo que toda a sua equipe operacional, de manutenção e financeira trabalhe em sincronia." },
  { q: "Existe alguma taxa de cancelamento ou fidelidade?", a: "De forma alguma. Nossos planos são mensais e sem qualquer carência. Você pode cancelar sua assinatura quando desejar, de forma simples e direta, sem multas ou pegadinhas." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left transition-colors duration-200 hover:text-blue-400"
      >
        <span className="font-semibold text-sm md:text-base text-slate-100">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 duration-300 ${open ? "rotate-180 text-blue-400" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 opacity-100 pb-5" : "max-h-0 opacity-0"}`}>
        <p className="text-sm text-slate-400 leading-relaxed font-normal">{a}</p>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 font-sans overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/10 via-violet-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[1200px] right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[800px] left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#070a13]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-18">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#diferenciais" className="hover:text-blue-400 transition-colors duration-200">Diferenciais</a>
            <a href="#flexibilidade" className="hover:text-blue-400 transition-colors duration-200">Segmentos</a>
            <a href="#planos" className="hover:text-blue-400 transition-colors duration-200">Planos</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors duration-200">Perguntas Frequentes</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors duration-200">
              Entrar
            </Link>
            <Link
              href="/register"
              className="relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
            >
              <span className="relative z-10">Criar Conta Grátis</span>
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] text-slate-300 text-xs font-bold mb-8 border border-white/[0.08]">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>ERP 100% em Nuvem — Construído para Locadoras Inteligentes</span>
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-8">
            Revolucione a gestão de suas locações.<br className="hidden sm:inline" />
            <span className="text-white">Mais controle, menos dor de cabeça.</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Abandone planilhas confusas. O <strong className="text-slate-200">RentAllControl</strong> centraliza seus contratos, pagamentos, manutenções e calcula automaticamente o retorno de cada equipamento seu em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-blue-500 transition-colors w-full sm:w-auto justify-center"
            >
              Testar Sistema Grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#planos"
              className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 transition-colors font-semibold w-full sm:w-auto justify-center"
            >
              Ver Planos
            </Link>
          </div>
          
          <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Não exigimos cartão de crédito. Comece agora.
          </p>
        </div>

        {/* Dashboard Preview Component (Premium Interactive Aesthetic) */}
        <div className="max-w-6xl mx-auto mt-20 relative">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur-xl opacity-20 pointer-events-none" />
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c101f] shadow-2xl overflow-hidden shadow-black/80">
            {/* Fake browser bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#090c17] border-b border-white/[0.06]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
              </div>
              <div className="bg-[#05070e] rounded-lg px-4 py-1.5 text-xs text-slate-400 font-mono tracking-wide max-w-[280px] sm:max-w-md w-full text-center border border-white/[0.04]">
                app.rentallcontrol.com.br/dashboard
              </div>
              <div className="w-10" />
            </div>

            {/* Fake dashboard Workspace */}
            <div className="flex flex-col lg:flex-row h-[420px] md:h-[500px]">
              {/* Fake Sidebar */}
              <div className="w-56 bg-[#090c17] p-5 flex-shrink-0 hidden lg:flex flex-col justify-between border-r border-white/[0.04]">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
                    <div className="h-3 bg-white/20 rounded w-20" />
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${i === 0 ? "bg-white/[0.04]" : "opacity-40"}`}>
                        <div className={`w-4.5 h-4.5 rounded ${i === 0 ? "bg-blue-500" : "bg-white/20"}`} />
                        <div className="h-2 bg-white/25 rounded flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 pt-5 border-t border-white/[0.04]">
                  <div className="h-2.5 bg-white/10 rounded w-24" />
                  <div className="h-2 bg-white/10 rounded w-16" />
                </div>
              </div>

              {/* Fake Dashboard Content */}
              <div className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white">Olá, Administrador</h3>
                    <p className="text-xs text-slate-400">Resumo da saúde financeira e operacional da locadora</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300">Maio 2026</span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold">Filtro Ativo</span>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Receita Prevista", value: "R$ 48.590,00", color: "text-emerald-400", change: "+12.4% no mês" },
                    { label: "Custos Operacionais", value: "R$ 12.340,00", color: "text-rose-400", change: "-4.2% em manutenção" },
                    { label: "Lucro Líquido Real", value: "R$ 36.250,00", color: "text-blue-400", change: "ROI saudável de 74%" },
                    { label: "Taxa de Ocupação", value: "86.4%", color: "text-amber-400", change: "42 ativos locados hoje" },
                  ].map((card, idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-2">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{card.label}</p>
                      <p className={`text-base md:text-xl font-black font-mono tracking-tight ${card.color}`}>{card.value}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{card.change}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Histórico Mensal de Lucratividade</h4>
                      <span className="text-[10px] text-slate-500">Últimos 6 meses</span>
                    </div>
                    {/* SVG Interactive Chart */}
                    <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 border-b border-white/[0.04]">
                      {[40, 55, 48, 70, 65, 88].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer">
                          <span className="text-[9px] font-mono text-blue-400 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {val}%
                          </span>
                          <div 
                            className={`w-full rounded-t-lg transition-all duration-500 ${
                              idx === 5 ? "bg-gradient-to-t from-indigo-500 to-blue-500" : "bg-white/10 group-hover:bg-blue-500/35"
                            }`} 
                            style={{ height: `${val}%` }} 
                          />
                          <span className="text-[9px] text-slate-500 mt-2 font-medium">M{idx+1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Status Financeiro Geral</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Alertas automáticos de pendências</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { title: "Contrato #2041 (Ana Paula)", status: "Vencendo em 2 dias", color: "bg-amber-500/20 text-amber-400 border-amber-500/10" },
                        { title: "Cobrança Asaas #9384", status: "Confirmado PIX", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/10" },
                        { title: "Retroescavadeira CAT320", status: "Precisa de Preventiva", color: "bg-rose-500/20 text-rose-400 border-rose-500/10" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.02] bg-white/[0.01]">
                          <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[120px]">{item.title}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${item.color} font-bold`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500 bg-white/[0.03] p-2 rounded-lg text-center font-medium">
                      Contatos atualizados há 30 segundos
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="diferenciais" className="py-24 px-6 relative z-10 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-3xl md:text-4.5xl font-black tracking-tight mb-4">
              Tudo o que sua locadora precisa para evoluir
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
              Esqueça integrações complexas e processos burocráticos. Centralize a administração física e financeira num único ambiente moderno.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div 
                key={i} 
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500 group-hover:to-indigo-600 flex items-center justify-center mb-6 border border-white/[0.06] group-hover:border-transparent transition-all duration-300">
                  <f.icon className="w-5.5 h-5.5 text-blue-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-lg text-slate-100 mb-3 group-hover:text-blue-400 transition-colors duration-200">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-normal">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flexibilidade e Segmentos (Inclusivo e Versátil) */}
      <section id="flexibilidade" className="py-24 px-6 relative z-10 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              Flexibilidade Absoluta
            </span>
            <h2 className="font-display text-3xl md:text-4.5xl font-black tracking-tight mt-6 mb-4">
              Mapeado para qualquer tipo de locação física
            </h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed">
              O RentAllControl foi desenhado sob uma arquitetura genérica de ativos. Isso significa que <strong className="text-slate-200">se o seu negócio aluga itens físicos, o sistema se adapta perfeitamente a ele</strong>. Os segmentos abaixo representam apenas alguns exemplos de nossa flexibilidade:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {segments.map((seg, i) => (
              <div 
                key={i}
                className={`rounded-2xl border p-6 transition-all duration-200 cursor-pointer ${
                activeSegmentIndex === i 
                  ? "bg-[#0c101f] border-slate-700/50 shadow-lg" 
                  : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03]"
              }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      seg.highlighted ? "bg-blue-500 text-white" : "bg-white/[0.04] text-blue-400"
                    }`}>
                      <seg.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      seg.highlighted ? "bg-blue-500/20 text-blue-300 border-blue-500/20 animate-pulse" : "bg-white/[0.04] text-slate-400 border-white/[0.06]"
                    }`}>
                      {seg.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-slate-100 mb-2">{seg.title}</h3>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-normal">{seg.desc}</p>
                </div>
                {seg.highlighted && (
                  <div className="mt-5 pt-4 border-t border-white/[0.06] text-xs text-blue-400 font-bold flex items-center gap-1.5">
                    Totalmente adaptável ao seu negócio <ArrowUpRight className="w-4.5 h-4.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-20 px-6 relative z-10 border-t border-white/[0.04] bg-[#090c17]/50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 text-center">
          {[
            { stat: "500+", label: "Locadoras Parceiras" },
            { stat: "R$ 15 Milhões+", label: "Faturados Mensalmente" },
            { stat: "40% Menos", label: "Inadimplência de Cobranças" },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <p className="font-display text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{item.stat}</p>
              <p className="text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-24 px-6 relative z-10 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-widest bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/20">
              Preços Claros & Transparentes
            </span>
            <h2 className="font-display text-3xl md:text-4.5xl font-black tracking-tight mt-6 mb-4">
              Escolha o plano perfeito para sua empresa
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Todos os planos incluem o período de testes grátis por 30 dias. Cancele quando desejar, sem fidelidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-3xl border p-8 flex flex-col justify-between transition-colors ${
                  plan.highlight 
                    ? "bg-[#0a0e1a] border-slate-700/50" 
                    : "bg-white/[0.02] border-white/[0.05]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3.5 left-8 text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white px-3 py-1 rounded-full border border-blue-400/20 shadow-md">
                    Mais Recomendado
                  </span>
                )}
                
                <div>
                  <h3 className="font-black text-xl md:text-2xl text-slate-100 mb-2">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-6 font-normal leading-relaxed">{plan.desc}</p>
                  
                  <div className="flex items-end gap-1 mb-8">
                    <span className="font-display text-3xl md:text-4.5xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-slate-400 mb-1.5 font-medium">{plan.period}</span>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs md:text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.highlight ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.04] text-emerald-400"
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-300 leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link
                  href="/register"
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors text-center ${
                    plan.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-white/[0.05] text-white hover:bg-white/[0.1]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Módulo Adicional */}
          <div className="max-w-3xl mx-auto mt-6">
            <div className="relative rounded-3xl border border-white/[0.05] bg-white/[0.02] p-8 flex flex-col sm:flex-row items-center justify-between transition-colors">
              <div className="flex-1 text-center sm:text-left mb-6 sm:mb-0">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full mb-4 inline-block">
                  Módulo Adicional
                </span>
                <h3 className="font-bold text-xl md:text-2xl text-slate-100 mb-2">Conciliação Bancária</h3>
                <p className="text-sm text-slate-400 font-normal leading-relaxed max-w-md">
                  Importe planilhas OFX, Excel ou CSV. Feche seu caixa de forma automática, encontre divergências em segundos e acabe com as perdas financeiras não detectadas.
                </p>
              </div>
              <div className="flex flex-col items-center sm:items-end sm:pl-8 border-t sm:border-t-0 sm:border-l border-white/[0.05] pt-6 sm:pt-0 mt-2 sm:mt-0 w-full sm:w-auto">
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-sm text-slate-400 mb-1.5 font-medium">+</span>
                  <span className="font-display text-3xl font-black text-white">R$ 59,90</span>
                  <span className="text-sm text-slate-400 mb-1.5 font-medium">/mês</span>
                </div>
                <Link
                  href="/register?addon=conciliacao"
                  className="bg-white/[0.05] text-white hover:bg-white/[0.1] text-sm font-bold px-6 py-3 rounded-xl transition-colors w-full sm:w-auto text-center border border-white/[0.05]"
                >
                  Incluir no Plano
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 relative z-10 border-t border-white/[0.04] bg-[#070a13]/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-black text-center tracking-tight mb-14">
            Dúvidas Frequentes
          </h2>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8 backdrop-blur-xl">
            {faqs.map((faq, i) => (
              <FaqItem key={i} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6 relative z-10 border-t border-white/[0.04] bg-gradient-to-b from-[#090c17] to-[#04060b] text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Pronto para transformar a gestão de sua locadora?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Profissionalize seus aluguéis hoje. Experimente todas as funcionalidades premium do Plano Pro por 30 dias grátis.
          </p>
          <div className="pt-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:shadow-blue-500/20 text-white px-8 py-4.5 rounded-2xl font-bold text-base hover:-translate-y-0.5 transition-all duration-300"
            >
              Começar Teste Gratuito
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">Sem cartão de crédito · Cancele quando desejar</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/[0.04] bg-[#04060b] text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-black text-sm text-slate-200 tracking-tight">RentAllControl</span>
          </div>
          <p className="text-slate-500 text-xs md:text-sm text-center">
            © {new Date().getFullYear()} RentAllControl. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs md:text-sm">
            <Link href="#" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="#" className="hover:text-white transition-colors">Suporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
