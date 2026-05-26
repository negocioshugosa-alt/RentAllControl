-- ============================================================
-- RentControl – Schema PostgreSQL / Supabase
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  logo_url TEXT,
  asaas_api_key TEXT,
  asaas_wallet_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('owner','admin','manager','operator','viewer')),
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(2) DEFAULT 'pj' CHECK (type IN ('pf', 'pj')),
  name VARCHAR(255) NOT NULL,
  document VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  asaas_customer_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_document ON clients(document);
CREATE INDEX idx_clients_name ON clients USING gin(name gin_trgm_ops);

-- ============================================================
-- EQUIPMENT
-- ============================================================
CREATE TABLE equipment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  plate VARCHAR(10),
  chassis VARCHAR(50),
  hourimeter DECIMAL(10,2) DEFAULT 0,
  km DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'disponivel' CHECK (status IN ('disponivel','alugado','manutencao','inativo')),
  -- Financeiro
  purchase_value DECIMAL(12,2),
  financing_value DECIMAL(12,2),
  monthly_installment DECIMAL(10,2),
  monthly_insurance DECIMAL(10,2),
  annual_ipva DECIMAL(10,2),
  depreciation_rate DECIMAL(5,2) DEFAULT 20,
  daily_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  -- Meta
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE INDEX idx_equipment_company ON equipment(company_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_name ON equipment USING gin(name gin_trgm_ops);

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  contract_number VARCHAR(30) NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE RESTRICT NOT NULL,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','cancelado','pendente')),
  start_date DATE NOT NULL,
  end_date DATE,
  daily_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  payment_frequency VARCHAR(20) DEFAULT 'mensal' CHECK (payment_frequency IN ('diario','semanal','quinzenal','mensal')),
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  deposit_value DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, contract_number)
);

CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_equipment ON contracts(equipment_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ============================================================
-- TRANSACTIONS (Contas a Receber / Pagar)
-- ============================================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('receita','despesa')),
  category VARCHAR(30) NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  payment_method VARCHAR(30),
  notes TEXT,
  asaas_charge_id VARCHAR(50),
  recurrence_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);
CREATE INDEX idx_transactions_client ON transactions(client_id);
CREATE INDEX idx_transactions_equipment ON transactions(equipment_id);
CREATE INDEX idx_transactions_contract ON transactions(contract_id);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(30) NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(20),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_company ON alerts(company_id);
CREATE INDEX idx_alerts_read ON alerts(is_read);

-- ============================================================
-- WEBHOOK LOGS (Asaas)
-- ============================================================
CREATE TABLE webhook_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  event VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-UPDATE TRANSACTION STATUS (overdue)
-- ============================================================
CREATE OR REPLACE FUNCTION check_overdue_transactions()
RETURNS void AS $$
BEGIN
  UPDATE transactions
  SET status = 'vencido'
  WHERE status = 'pendente'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FINANCIAL SUMMARY VIEW POR EQUIPAMENTO
-- ============================================================
CREATE OR REPLACE VIEW equipment_financial_summary AS
SELECT
  e.id AS equipment_id,
  e.company_id,
  e.name AS equipment_name,
  e.code,
  e.status,
  COALESCE(SUM(CASE WHEN t.type = 'receita' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN t.type = 'despesa' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0) AS total_costs,
  COALESCE(SUM(CASE WHEN t.type = 'receita' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.type = 'despesa' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0) AS net_profit,
  COUNT(DISTINCT c.id) AS total_contracts
FROM equipment e
LEFT JOIN transactions t ON t.equipment_id = e.id
LEFT JOIN contracts c ON c.equipment_id = e.id
GROUP BY e.id, e.company_id, e.name, e.code, e.status;

-- ============================================================
-- DASHBOARD METRICS VIEW
-- ============================================================
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  company_id,
  SUM(CASE WHEN type = 'receita' AND status = 'pago' AND paid_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) AS month_revenue,
  SUM(CASE WHEN type = 'despesa' AND status = 'pago' AND paid_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) AS month_expenses,
  SUM(CASE WHEN type = 'receita' AND status = 'vencido' THEN amount ELSE 0 END) AS overdue_receivables,
  SUM(CASE WHEN type = 'despesa' AND status = 'vencido' THEN amount ELSE 0 END) AS overdue_payables,
  SUM(CASE WHEN type = 'receita' AND status = 'pendente' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN amount ELSE 0 END) AS upcoming_receivables_7d,
  SUM(CASE WHEN type = 'despesa' AND status = 'pendente' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN amount ELSE 0 END) AS upcoming_payables_7d
FROM transactions
GROUP BY company_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's company
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "company_select" ON companies FOR SELECT USING (id = get_user_company_id());
CREATE POLICY "company_update" ON companies FOR UPDATE USING (id = get_user_company_id());

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "clients_all" ON clients FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "equipment_all" ON equipment FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "contracts_all" ON contracts FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "transactions_all" ON transactions FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "alerts_all" ON alerts FOR ALL USING (company_id = get_user_company_id());
CREATE POLICY "webhook_logs_insert" ON webhook_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTION: create company + profile on sign up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create company
  INSERT INTO companies (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
    NEW.email
  )
  RETURNING id INTO new_company_id;

  -- Create profile
  INSERT INTO profiles (user_id, company_id, name, email, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
