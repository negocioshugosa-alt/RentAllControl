# RentAllControl — ERP SaaS para Locadoras

> Sistema completo de gestão para locadoras de máquinas, equipamentos e caminhões.

![RentAllControl Dashboard](https://via.placeholder.com/1200x600/1e3a5f/ffffff?text=RentAllControl+Dashboard)

## ✨ Funcionalidades

- 🏗️ **Equipamentos** — Cadastro, status (disponível/alugado/manutenção/inativo), centro de custo individual
- 👥 **Clientes** — PF/PJ, histórico financeiro, inadimplência
- 📋 **Contratos** — Criação, encerramento, geração de PDF
- 💰 **Financeiro** — Contas a pagar/receber, fluxo de caixa 12 meses
- 📊 **Centro de Custo** — Lucratividade e ROI por equipamento, ranking
- 🔔 **Alertas** — Vencimentos, inadimplência, contratos próximos do fim
- 📈 **Relatórios** — PDF exportável (financeiro, equipamentos, clientes, contratos, inadimplência)
- 🏦 **Asaas** — PIX, boleto, cartão, baixa automática via webhook
- 🌗 **Dark mode** — Tema claro/escuro
- 📱 **Responsivo** — Mobile-first

---

## 🚀 Deploy rápido (5 passos)

### 1. Clonar e instalar
```bash
git clone https://github.com/seu-usuario/rentallcontrol
cd rentallcontrol
npm install
```

### 2. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Copie a **URL** e **anon key** do projeto
3. Vá em **SQL Editor** e execute o arquivo `schema.sql` completo

### 3. Variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
ASAAS_API_KEY=sua_chave_asaas          # opcional
NEXT_PUBLIC_ASAAS_SANDBOX=true         # false em produção
```

### 4. Executar localmente
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000)

### 5. Deploy na Vercel
```bash
npm install -g vercel
vercel
```
Configure as variáveis de ambiente no painel da Vercel.

---

## ⚙️ Configuração do Supabase

### Autenticação
Em **Authentication → Settings**:
- Site URL: `https://seu-app.vercel.app`
- Redirect URLs: `https://seu-app.vercel.app/**`

### Webhook Asaas
No painel Asaas → **Configurações → Webhooks**:
- URL: `https://seu-app.vercel.app/api/webhooks/asaas`
- Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`

---

## 🗄️ Estrutura do banco

| Tabela | Descrição |
|--------|-----------|
| `companies` | Empresas (multitenancy) |
| `profiles` | Usuários vinculados a empresas |
| `clients` | Clientes PF/PJ |
| `equipment` | Equipamentos da frota |
| `contracts` | Contratos de locação |
| `transactions` | Contas a pagar/receber |
| `alerts` | Alertas automáticos |
| `webhook_logs` | Logs de webhooks Asaas |

Views:
- `equipment_financial_summary` — Resumo financeiro por equipamento
- `dashboard_metrics` — Métricas para o dashboard

---

## 📁 Estrutura do projeto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register, Forgot password
│   ├── dashboard/          # Dashboard principal
│   ├── equipamentos/       # CRUD de equipamentos
│   ├── clientes/           # CRUD de clientes
│   ├── contratos/          # CRUD de contratos
│   ├── financeiro/         # Contas a pagar/receber
│   ├── centro-custo/       # Lucratividade por equipamento
│   ├── alertas/            # Central de alertas
│   ├── relatorios/         # Geração de relatórios PDF
│   ├── configuracoes/      # Configurações da empresa e Asaas
│   └── api/webhooks/asaas/ # Webhook handler
├── components/
│   ├── shared/             # Layout, Sidebar, Header, etc.
│   ├── dashboard/          # Widgets do dashboard
│   ├── equipamentos/       # Formulário e detalhe
│   ├── clientes/           # Formulário
│   ├── contratos/          # Formulário
│   ├── financeiro/         # Formulário, gráficos, Asaas
│   └── landing/            # Landing page
├── hooks/                  # useAuth, useCompany, usePagination
├── lib/
│   └── supabase/           # client.ts, server.ts
├── services/
│   └── asaas.ts            # Asaas API service
├── types/
│   └── index.ts            # TypeScript types
└── utils/
    └── contractPdf.ts      # Gerador de PDF de contrato
```

---

## 🛠️ Stack

| Tecnologia | Uso |
|------------|-----|
| Next.js 15 | Framework React (App Router) |
| TypeScript | Tipagem estática |
| Tailwind CSS | Estilização |
| Supabase | Auth + PostgreSQL + Storage |
| TanStack Query | Cache e sincronização de dados |
| React Hook Form + Zod | Formulários e validação |
| Recharts | Gráficos financeiros |
| jsPDF | Geração de PDFs |
| Asaas | Gateway de pagamento |
| Sonner | Notificações toast |
| next-themes | Dark mode |

---

## 📄 Licença

MIT — Livre para uso comercial e pessoal.

---

Desenvolvido com ❤️ usando RentAllControl
