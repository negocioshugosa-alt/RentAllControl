// src/services/asaas.ts
import type { AsaasCustomer, AsaasCharge } from "@/types";

const ASAAS_BASE_URL = process.env.NEXT_PUBLIC_ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

async function asaasRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object,
  apiKey?: string
): Promise<T> {
  const key = apiKey || process.env.ASAAS_API_KEY;
  if (!key) throw new Error("Chave Asaas não configurada");

  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.description || `Asaas error ${res.status}`);
  }

  return res.json();
}

export const asaas = {
  async createCustomer(data: {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
  }, apiKey?: string): Promise<AsaasCustomer> {
    return asaasRequest<AsaasCustomer>("/customers", "POST", data, apiKey);
  },

  async getCustomer(id: string, apiKey?: string): Promise<AsaasCustomer> {
    return asaasRequest<AsaasCustomer>(`/customers/${id}`, "GET", undefined, apiKey);
  },

  async createCharge(data: {
    customer: string;
    billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    postalService?: boolean;
  }, apiKey?: string): Promise<AsaasCharge> {
    return asaasRequest<AsaasCharge>("/payments", "POST", data, apiKey);
  },

  async getCharge(id: string, apiKey?: string): Promise<AsaasCharge> {
    return asaasRequest<AsaasCharge>(`/payments/${id}`, "GET", undefined, apiKey);
  },

  async getPixQrCode(id: string, apiKey?: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    return asaasRequest(`/payments/${id}/pixQrCode`, "GET", undefined, apiKey);
  },

  async cancelCharge(id: string, apiKey?: string): Promise<void> {
    await asaasRequest(`/payments/${id}`, "DELETE", undefined, apiKey);
  },

  async createSubscription(data: {
    customer: string;
    billingType: "BOLETO" | "CREDIT_CARD" | "PIX";
    value: number;
    nextDueDate: string;
    cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
    description?: string;
    externalReference?: string;
  }, apiKey?: string) {
    return asaasRequest("/subscriptions", "POST", data, apiKey);
  },

  async updateSubscription(id: string, data: {
    value?: number;
    billingType?: "BOLETO" | "CREDIT_CARD" | "PIX";
    nextDueDate?: string;
    description?: string;
  }, apiKey?: string) {
    return asaasRequest(`/subscriptions/${id}`, "POST", data, apiKey);
  },

  async listCharges(filters?: {
    customer?: string;
    status?: string;
    dateCreatedGe?: string;
    dateCreatedLe?: string;
  }, apiKey?: string): Promise<{ data: AsaasCharge[]; totalCount: number }> {
    const params = new URLSearchParams(filters as any).toString();
    return asaasRequest(`/payments?${params}`, "GET", undefined, apiKey);
  },
};
