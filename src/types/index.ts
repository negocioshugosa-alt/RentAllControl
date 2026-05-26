// src/types/index.ts

export type UserRole = "owner" | "admin" | "manager" | "operator" | "viewer";

export interface Profile {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  asaas_api_key?: string;
  asaas_wallet_id?: string;
  created_at: string;
  updated_at: string;
}

// ---- EQUIPAMENTOS ----
export type EquipmentStatus = "disponivel" | "alugado" | "manutencao" | "inativo";
export type EquipmentCategory =
  | "caminhao"
  | "maquina_pesada"
  | "equipamento_construcao"
  | "empilhadeira"
  | "gerador"
  | "compressor"
  | "andaime"
  | "outro";

export interface Equipment {
  id: string;
  company_id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  year?: number;
  plate?: string;
  chassis?: string;
  hourimeter?: number;
  km?: number;
  status: EquipmentStatus;
  // Financeiro
  purchase_value?: number;
  financing_value?: number;
  monthly_installment?: number;
  monthly_insurance?: number;
  annual_ipva?: number;
  depreciation_rate?: number;
  daily_rate?: number;
  monthly_rate?: number;
  // Imagens
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentFinancialSummary {
  equipment_id: string;
  total_revenue: number;
  total_costs: number;
  net_profit: number;
  roi: number;
  utilization_rate: number;
  days_rented: number;
  days_available: number;
}

// ---- CLIENTES ----
export type PersonType = "pf" | "pj";

export interface Client {
  id: string;
  company_id: string;
  type: PersonType;
  name: string;
  document: string; // CPF ou CNPJ
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  is_active: boolean;
  asaas_customer_id?: string;
  created_at: string;
  updated_at: string;
}

// ---- CONTRATOS ----
export type ContractStatus = "ativo" | "encerrado" | "cancelado" | "pendente";
export type PaymentFrequency = "diario" | "semanal" | "quinzenal" | "mensal" | "unica";

export interface Contract {
  id: string;
  company_id: string;
  contract_number: string;
  client_id: string;
  equipment_id: string;
  status: ContractStatus;
  start_date: string;
  end_date?: string;
  daily_rate?: number;
  monthly_rate?: number;
  payment_frequency: PaymentFrequency;
  payment_day?: number;
  deposit_value?: number;
  contract_value?: number;
  file_url?: string;
  deposit_paid?: boolean;
  notes?: string;
  file_url?: string;
  client?: Client;
  equipment?: Equipment;
  created_at: string;
  updated_at: string;
}

// ---- FINANCEIRO ----
export type TransactionType = "receita" | "despesa";
export type TransactionStatus = "pendente" | "pago" | "vencido" | "cancelado";
export type TransactionCategory =
  | "aluguel"
  | "caucao"
  | "multa_contrato"
  | "combustivel"
  | "manutencao"
  | "pneus"
  | "pecas"
  | "seguro"
  | "ipva"
  | "lavagem"
  | "multas"
  | "salarios"
  | "marketing"
  | "escritorio"
  | "financiamento"
  | "outros";

export interface Transaction {
  id: string;
  company_id: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: TransactionStatus;
  client_id?: string;
  equipment_id?: string;
  contract_id?: string;
  payment_method?: string;
  notes?: string;
  asaas_charge_id?: string;
  recurrence_id?: string;
  client?: Client;
  equipment?: Equipment;
  contract?: Contract;
  created_at: string;
  updated_at: string;
}

// ---- ALERTAS ----
export type AlertType =
  | "conta_vencer"
  | "conta_vencida"
  | "contrato_vencer"
  | "inadimplencia"
  | "manutencao";
export type AlertPriority = "low" | "medium" | "high" | "critical";

export interface Alert {
  id: string;
  company_id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  entity_type: "transaction" | "contract" | "client" | "equipment";
  entity_id: string;
  is_read: boolean;
  created_at: string;
}

// ---- DASHBOARD ----
export interface DashboardMetrics {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  cash_flow: number;
  active_equipments: number;
  rented_equipments: number;
  maintenance_equipments: number;
  occupation_rate: number;
  overdue_receivables: number;
  upcoming_receivables: number;
  overdue_payables: number;
  upcoming_payables: number;
  active_contracts: number;
  defaulting_clients: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  secondary?: number;
}

// ---- ASAAS ----
export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj: string;
}

export interface AsaasCharge {
  id: string;
  customer: string;
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  value: number;
  dueDate: string;
  description?: string;
  status: "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE" | "REFUNDED" | "REFUND_REQUESTED";
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeId?: string;
}

// ---- PAGINATION ----
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface QueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  client_id?: string;
  equipment_id?: string;
  category?: string;
  type?: string;
}

// ---- FORNECEDORES ----
export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  category?: string; // tipo de serviço
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
