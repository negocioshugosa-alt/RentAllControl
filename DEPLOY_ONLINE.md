# 🚀 LocaControl — Deploy 100% Online (sem instalar nada)

Tudo pelo navegador. Tempo estimado: **20–30 minutos**.

---

## PASSO 1 — Criar conta no GitHub
> Pule se já tiver conta.

1. Acesse **github.com** → clique em **Sign up**
2. Escolha username, email e senha → confirme o email
3. Selecione o plano **Free**

---

## PASSO 2 — Criar repositório no GitHub

1. Em **github.com**, clique no botão **+** (canto superior direito) → **New repository**
2. Preencha:
   - **Repository name:** `locacontrol`
   - **Private** (recomendado)
   - ✅ Marque **Add a README file**
3. Clique em **Create repository**

---

## PASSO 3 — Abrir o VS Code online (github.dev)

1. Com o repositório aberto no GitHub, **pressione a tecla `.` (ponto)** no teclado
2. O VS Code abre no navegador automaticamente — é o **github.dev**

> Alternativa: troque `github.com` por `github.dev` na URL do repositório.

---

## PASSO 4 — Fazer upload dos arquivos

### 4.1 — Extraia o ZIP localmente apenas para upload
O arquivo `locacontrol.zip` que você baixou precisa ser extraído antes do upload.
> Clique com botão direito no ZIP → **Extrair aqui** (Windows/Mac) — não é instalar nada.

### 4.2 — Arraste a pasta para o github.dev
No VS Code online (github.dev):
1. No painel **Explorer** (ícone de arquivos à esquerda), você verá o repositório
2. **Arraste a pasta `locacontrol/`** (extraída do ZIP) para dentro do painel Explorer
3. Aguarde o upload de todos os arquivos (pode demorar 1–2 minutos)

### 4.3 — Confirmar os arquivos
Verifique se apareceram as pastas:
```
📁 src/
📁 public/
📄 package.json
📄 next.config.ts
📄 tailwind.config.ts
📄 schema.sql
📄 schema-extras.sql
📄 README.md
```

### 4.4 — Commit (salvar no GitHub)
1. Clique no ícone de **controle de versão** (3º ícone à esquerda, parece um galho)
2. Na caixa **Message**, escreva: `feat: initial LocaControl commit`
3. Clique em **✓ Commit & Push**
4. Se perguntar sobre staging: clique em **Yes**

✅ Seu código está no GitHub!

---

## PASSO 5 — Configurar o Supabase

### 5.1 — Criar conta
1. Acesse **supabase.com** → **Start your project**
2. Entre com a conta do **GitHub** (mais rápido)

### 5.2 — Criar projeto
1. Clique em **New project**
2. Preencha:
   - **Name:** `locacontrol`
   - **Database Password:** anote esta senha!
   - **Region:** `South America (São Paulo)`
3. Clique em **Create new project** e aguarde ~2 minutos

### 5.3 — Executar o schema do banco
1. No menu esquerdo do Supabase, clique em **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `schema.sql` (baixado junto com o projeto) em qualquer editor de texto
4. **Copie todo o conteúdo** e cole no SQL Editor do Supabase
5. Clique em **Run** (ou `Ctrl+Enter`)
6. Aguarde a mensagem `Success. No rows returned`

7. Clique em **New query** novamente
8. Abra o arquivo `schema-extras.sql`, copie e cole
9. Clique em **Run**

### 5.4 — Configurar autenticação
1. No menu esquerdo, clique em **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque: `https://locacontrol.vercel.app`
   *(atualize depois com a URL real da Vercel)*
3. Em **Redirect URLs**, adicione: `https://locacontrol.vercel.app/**`
4. Clique em **Save**

### 5.5 — Copiar as credenciais
1. No menu esquerdo, clique em **Project Settings** → **API**
2. Copie e guarde:
   - **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
   - **anon / public key** → `eyJhbGciOiJIUzI1NiIs...`

---

## PASSO 6 — Deploy na Vercel

### 6.1 — Criar conta
1. Acesse **vercel.com** → **Sign Up**
2. Entre com a conta do **GitHub**
3. Autorize o acesso

### 6.2 — Importar o repositório
1. No painel da Vercel, clique em **Add New… → Project**
2. Na lista de repositórios do GitHub, encontre `locacontrol`
3. Clique em **Import**

### 6.3 — Configurar variáveis de ambiente
Na tela de configuração do projeto, **antes de clicar em Deploy**:
1. Expanda a seção **Environment Variables**
2. Adicione as seguintes variáveis (clique em **Add** após cada uma):

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase (ex: `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do Supabase |
| `NEXT_PUBLIC_ASAAS_SANDBOX` | `true` |
| `ASAAS_API_KEY` | sua chave Asaas (pode deixar em branco por enquanto) |

### 6.4 — Deploy
1. Clique em **Deploy**
2. Aguarde 2–4 minutos (build do Next.js)
3. ✅ Aparecerá: **"Congratulations! Your project has been deployed."**
4. Clique em **Visit** para abrir o sistema

---

## PASSO 7 — Atualizar URL no Supabase

Agora que você tem a URL final da Vercel (ex: `https://locacontrol-abc123.vercel.app`):

1. Volte ao **Supabase** → **Authentication** → **URL Configuration**
2. Atualize o **Site URL** com a URL real da Vercel
3. Atualize **Redirect URLs** com `https://sua-url.vercel.app/**`
4. Salve

---

## PASSO 8 — Criar o primeiro acesso

1. Abra seu app na Vercel
2. Clique em **Criar conta grátis**
3. Preencha seu nome, nome da empresa, email e senha
4. O sistema criará automaticamente sua empresa e seu perfil como **owner**
5. Faça login e explore o sistema!

---

## 🔔 Configurar Webhook Asaas (opcional)

Para baixa automática de cobranças:
1. Acesse **asaas.com** → **Configurações** → **Integrações** → **Webhooks**
2. Adicione a URL: `https://sua-url.vercel.app/api/webhooks/asaas`
3. Selecione os eventos:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_OVERDUE`
4. Salve

---

## ✅ Checklist final

- [ ] Repositório criado no GitHub
- [ ] Arquivos enviados via github.dev
- [ ] Supabase: `schema.sql` executado
- [ ] Supabase: `schema-extras.sql` executado
- [ ] Supabase: URL de autenticação configurada
- [ ] Vercel: variáveis de ambiente configuradas
- [ ] Vercel: deploy realizado com sucesso
- [ ] Supabase: URL atualizada com URL da Vercel
- [ ] Primeiro usuário criado no sistema
- [ ] (Opcional) Webhook Asaas configurado

---

## 🆘 Problemas comuns

### Erro: "supabase not found" ou tela em branco
→ Verifique se as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretas na Vercel.
→ Na Vercel: **Settings → Environment Variables** → verifique os valores.

### Não consigo fazer login / "Invalid login credentials"
→ Certifique-se de que o trigger `handle_new_user` foi criado (está no `schema.sql`).
→ No Supabase → **Authentication → Users** → verifique se o usuário aparece lá.

### Erro 500 no webhook Asaas
→ A chave da API Asaas pode estar errada. Verifique em **Configurações → Integração Asaas** dentro do sistema.

### Re-deploy após mudança de variáveis
→ Na Vercel: **Deployments → ⋯ → Redeploy** (com "Use existing build cache" desmarcado).

---

## 🔄 Como atualizar o sistema no futuro

Para qualquer mudança de código:
1. Abra **github.dev** (pressione `.` no repositório)
2. Edite os arquivos diretamente no browser
3. Faça commit → a Vercel faz o deploy automaticamente!

---

> **Resumo dos serviços usados (todos gratuitos para começar):**
> - **GitHub** — armazenamento do código (grátis)
> - **Supabase** — banco de dados + autenticação (grátis até 500MB / 50k usuários)
> - **Vercel** — hospedagem do app (grátis para projetos pessoais)
> - **Asaas** — pagamentos (sem mensalidade, cobra % por transação)
