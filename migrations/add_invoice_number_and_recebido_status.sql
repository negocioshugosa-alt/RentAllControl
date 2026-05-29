-- ============================================================
-- Migração: Adicionar Campo Nota Fiscal e Status "Recebido" para Receitas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona a coluna para armazenar o número da nota fiscal
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- 2. Atualiza a constraint de validação de status de transações
-- Remove a constraint antiga de status
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Adiciona a nova constraint permitindo 'recebido'
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check 
  CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado', 'recebido'));

-- 3. Atualiza a VIEW de resumo financeiro por equipamento para incluir 'recebido'
CREATE OR REPLACE VIEW equipment_financial_summary AS
SELECT
  e.id AS equipment_id,
  e.company_id,
  e.name AS equipment_name,
  e.code,
  e.status,
  COALESCE(SUM(CASE WHEN t.type = 'receita' AND t.status IN ('pago', 'recebido') THEN t.amount ELSE 0 END), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN t.type = 'despesa' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0) AS total_costs,
  COALESCE(SUM(CASE WHEN t.type = 'receita' AND t.status IN ('pago', 'recebido') THEN t.amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.type = 'despesa' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0) AS net_profit,
  COUNT(DISTINCT c.id) AS total_contracts
FROM equipment e
LEFT JOIN transactions t ON t.equipment_id = e.id
LEFT JOIN contracts c ON c.equipment_id = e.id
GROUP BY e.id, e.company_id, e.name, e.code, e.status;

-- 4. Atualiza a VIEW de métricas do dashboard para incluir 'recebido'
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  company_id,
  SUM(CASE WHEN type = 'receita' AND status IN ('pago', 'recebido') AND paid_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) AS month_revenue,
  SUM(CASE WHEN type = 'despesa' AND status = 'pago' AND paid_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) AS month_expenses,
  SUM(CASE WHEN type = 'receita' AND status = 'vencido' THEN amount ELSE 0 END) AS overdue_receivables,
  SUM(CASE WHEN type = 'despesa' AND status = 'vencido' THEN amount ELSE 0 END) AS overdue_payables,
  SUM(CASE WHEN type = 'receita' AND status = 'pendente' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN amount ELSE 0 END) AS upcoming_receivables_7d,
  SUM(CASE WHEN type = 'despesa' AND status = 'pendente' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN amount ELSE 0 END) AS upcoming_payables_7d
FROM transactions
GROUP BY company_id;

-- 5. Atualiza a função de gráfico mensal get_monthly_chart para incluir 'recebido'
CREATE OR REPLACE FUNCTION get_monthly_chart(p_company_id UUID)
RETURNS TABLE(
  month TEXT,
  revenue NUMERIC,
  expenses NUMERIC,
  profit NUMERIC
) AS $$
DECLARE
  m_date DATE;
  m_key  TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    m_date := DATE_TRUNC('month', CURRENT_DATE - (i * INTERVAL '1 month'))::DATE;
    m_key  := TO_CHAR(m_date, 'YYYY-MM');

    SELECT
      TO_CHAR(m_date, 'Mon/YY'),
      COALESCE(SUM(CASE WHEN t.type='receita' AND t.status IN ('pago', 'recebido') THEN t.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN t.type='despesa' AND t.status='pago' THEN t.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN t.type='receita' AND t.status IN ('pago', 'recebido') THEN t.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type='despesa' AND t.status='pago' THEN t.amount ELSE 0 END), 0)
    INTO month, revenue, expenses, profit
    FROM transactions t
    WHERE t.company_id = p_company_id
      AND TO_CHAR(t.paid_date, 'YYYY-MM') = m_key;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-garante permissões de execução
GRANT EXECUTE ON FUNCTION get_monthly_chart(UUID) TO authenticated;
