-- ============================================================
-- Execute no SQL Editor do projeto RENTALLCONTROL
-- Cria a view de resumo financeiro por equipamento
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

SELECT 'View criada!' as status;
