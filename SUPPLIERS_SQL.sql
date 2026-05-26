-- ============================================================
-- RentAllControl — Tabela de Fornecedores
-- Execute no SQL Editor do projeto RENTALLCONTROL
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  category VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING gin(name gin_trgm_ops);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all" ON suppliers FOR ALL USING (company_id = get_user_company_id());

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Adicionar coluna supplier_id nas transactions (se não existir)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_supplier ON transactions(supplier_id);

SELECT 'Fornecedores configurado!' as status;
