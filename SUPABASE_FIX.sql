-- ============================================================
-- RentAllControl — SQL Definitivo para o Supabase
-- Execute este arquivo no SQL Editor do projeto RENTALLCONTROL
-- ============================================================

-- 1. Recriar função handle_new_user com search_path correto
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO public.companies (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
    NEW.email
  )
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (user_id, company_id, name, email, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'owner'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Garantir policies corretas
DROP POLICY IF EXISTS "service_role_companies" ON companies;
DROP POLICY IF EXISTS "service_role_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "company_insert" ON companies;

CREATE POLICY "companies_insert_all" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_insert_all" ON profiles FOR INSERT WITH CHECK (true);

-- 4. Função auxiliar
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 5. View de resumo financeiro
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

-- 6. Grants
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

SELECT 'Setup completo!' as status;
