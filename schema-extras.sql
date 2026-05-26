-- ============================================================
-- RentControl — SQL adicional (execute após schema.sql)
-- ============================================================

-- Função para dados do gráfico mensal (últimos 12 meses)
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
      COALESCE(SUM(CASE WHEN t.type='receita' AND t.status='pago' THEN t.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN t.type='despesa' AND t.status='pago' THEN t.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN t.type='receita' AND t.status='pago' THEN t.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type='despesa' AND t.status='pago' THEN t.amount ELSE 0 END), 0)
    INTO month, revenue, expenses, profit
    FROM transactions t
    WHERE t.company_id = p_company_id
      AND TO_CHAR(t.paid_date, 'YYYY-MM') = m_key;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Procedure: auto-update vencidos diariamente
-- ============================================================
CREATE OR REPLACE FUNCTION auto_mark_overdue()
RETURNS void AS $$
BEGIN
  UPDATE transactions
  SET status = 'vencido'
  WHERE status = 'pendente'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Grant permissões às funções
-- ============================================================
GRANT EXECUTE ON FUNCTION get_monthly_chart(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_mark_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated;

-- ============================================================
-- Supabase Edge Cron (opcional — ativar no painel)
-- pg_cron para marcar vencidos automaticamente:
--   SELECT cron.schedule('mark-overdue', '0 6 * * *', 'SELECT auto_mark_overdue();');
-- ============================================================

-- ============================================================
-- Dados de exemplo para desenvolvimento (opcional)
-- Remova em produção!
-- ============================================================
-- INSERT INTO equipment (company_id, code, name, category, brand, model, year, status, daily_rate, monthly_rate, purchase_value)
-- SELECT
--   get_user_company_id(),
--   'EQ-000' || generate_series,
--   'Equipamento Exemplo ' || generate_series,
--   (ARRAY['caminhao','maquina_pesada','gerador'])[floor(random()*3)+1],
--   (ARRAY['Volvo','CAT','Komatsu','Mercedes'])[floor(random()*4)+1],
--   'Modelo ' || generate_series,
--   2020 + floor(random()*5)::int,
--   (ARRAY['disponivel','alugado','manutencao'])[floor(random()*3)+1],
--   150 + random()*350,
--   3000 + random()*7000,
--   150000 + random()*350000
-- FROM generate_series(1, 10);
