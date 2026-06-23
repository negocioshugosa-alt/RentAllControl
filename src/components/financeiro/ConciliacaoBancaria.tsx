// src/components/financeiro/ConciliacaoBancaria.tsx
"use client";
import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertCircle,
  Download, RefreshCw, Info, TrendingUp, TrendingDown, X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Transaction } from "@/types";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ExtractRow {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // positivo = entrada, negativo = saída
  rawLine: string;
}

type MatchStatus = "conciliado" | "parcial" | "nao_encontrado";

interface ReconciliationRow {
  extract: ExtractRow;
  status: MatchStatus;
  matched?: Transaction;
  tolerance?: "data_1dia";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCSV(text: string): ExtractRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows: ExtractRow[] = [];

  // Detecta separador (vírgula ou ponto-e-vírgula)
  const sep = lines[0]?.includes(";") ? ";" : ",";

  // Pula cabeçalho se a primeira linha não contiver número
  const startIdx = /\d/.test(lines[0]?.split(sep)[0] ?? "") ? 0 : 1;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 3) continue;

    // Tenta identificar colunas por posição ou conteúdo
    // Suporte a layouts mais comuns dos bancos BR:
    // [0]=Data [1]=Descrição [2]=Valor   (Bradesco, Sicoob)
    // [0]=Data [1]=Histórico [2]=Docto [3]=Crédito [4]=Débito  (BB, Itaú)
    // [0]=Data [1]=Lançamento [2]=Débito [3]=Crédito [4]=Saldo (Santander)

    const rawDate = cols[0];
    const desc = cols[1] ?? "";

    // Parseia data em vários formatos brasileiros
    let date = "";
    const dmY = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    const Ymd = rawDate.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (dmY) {
      const [, d, m, y] = dmY;
      const year = y.length === 2 ? `20${y}` : y;
      date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (Ymd) {
      const [, y, m, d] = Ymd;
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      continue; // linha sem data válida
    }

    // Detecta layout com crédito/débito em colunas separadas
    let amount = 0;
    if (cols.length >= 5) {
      // Formato BB/Santander: cols[2]=débito, cols[3]=crédito
      const debit = parseAmount(cols[2]);
      const credit = parseAmount(cols[3]);
      if (!isNaN(credit) && credit > 0) amount = credit;
      else if (!isNaN(debit) && debit > 0) amount = -debit;
      else amount = parseAmount(cols[2]) || parseAmount(cols[3]);
    } else {
      amount = parseAmount(cols[2]);
    }

    if (isNaN(amount)) continue;

    rows.push({ date, description: desc, amount, rawLine: lines[i] });
  }

  return rows;
}

function parseAmount(raw: string): number {
  if (!raw) return NaN;
  // Remove R$, espaços, pontos de milhar e troca vírgula por ponto
  const cleaned = raw
    .replace(/R\$\s?/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  // Trata negativos entre parênteses: (1234,56) → -1234.56
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    return -parseFloat(cleaned.slice(1, -1));
  }
  return parseFloat(cleaned);
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function reconcile(extract: ExtractRow[], transactions: Transaction[]): ReconciliationRow[] {
  // Indexa transações pagas por valor e data
  const paidTx = transactions.filter(
    (t) => (t.status === "pago" || t.status === "recebido") && t.paid_date
  );

  const usedIds = new Set<string>();

  return extract.map((row) => {
    const absAmount = Math.abs(row.amount);

    // Tenta match exato: mesmo valor + mesma data de pagamento
    let match = paidTx.find(
      (t) =>
        !usedIds.has(t.id) &&
        Math.abs(Math.abs(Number(t.amount)) - absAmount) <= 0.01 &&
        t.paid_date === row.date
    );

    if (match) {
      usedIds.add(match.id);
      return { extract: row, status: "conciliado", matched: match };
    }

    // Tenta match parcial: mesmo valor + data ±1 dia
    match = paidTx.find(
      (t) =>
        !usedIds.has(t.id) &&
        Math.abs(Math.abs(Number(t.amount)) - absAmount) <= 0.01 &&
        (t.paid_date === addDays(row.date, 1) || t.paid_date === addDays(row.date, -1))
    );

    if (match) {
      usedIds.add(match.id);
      return { extract: row, status: "parcial", matched: match, tolerance: "data_1dia" };
    }

    return { extract: row, status: "nao_encontrado" };
  });
}

async function exportXLSX(rows: ReconciliationRow[]) {
  // Importa xlsx dinamicamente para não aumentar o bundle inicial
  const XLSX = await import("xlsx");

  const data = rows.map((r) => ({
    "Data Extrato": r.extract.date,
    "Descrição Extrato": r.extract.description,
    "Valor Extrato": r.extract.amount,
    "Status Conciliação": {
      conciliado: "✅ Conciliado",
      parcial: "⚠️ Parcial (data ±1 dia)",
      nao_encontrado: "❌ Não encontrado",
    }[r.status],
    "Descrição Sistema": r.matched?.description ?? "",
    "Categoria Sistema": r.matched?.category ?? "",
    "Data Pagamento Sistema": r.matched?.paid_date ?? "",
    "Valor Sistema": r.matched ? Number(r.matched.amount) : "",
    "Tipo": r.matched?.type === "receita" ? "Receita" : r.matched?.type === "despesa" ? "Despesa" : "",
    "Cliente / Equipamento": (r.matched as any)?.clients?.name ?? (r.matched as any)?.equipment?.name ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Conciliação");

  // Largura das colunas
  ws["!cols"] = [
    { wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 24 },
    { wch: 40 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 28 },
  ];

  XLSX.writeFile(wb, `conciliacao_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ─── Componente Principal ────────────────────────────────────────────────────

interface Props {
  companyId: string;
}

export function ConciliacaoBancaria({ companyId }: Props) {
  const [extract, setExtract] = useState<ExtractRow[] | null>(null);
  const [result, setResult] = useState<ReconciliationRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"" | MatchStatus>("");
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Busca todas as transações pagas da empresa para cruzar com o extrato
  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["conciliacao-transactions", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("transactions")
        .select("id, type, category, description, amount, due_date, paid_date, status, client_id, equipment_id, clients(name), equipment(name)")
        .eq("company_id", companyId)
        .in("status", ["pago", "recebido"])
        .not("paid_date", "is", null);
      return (data || []) as unknown as Transaction[];
    },
    enabled: !!companyId,
  });

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Arquivo inválido. Envie um arquivo .CSV exportado do seu banco.");
        return;
      }
      setFileName(file.name);
      setResult(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Tenta UTF-8 primeiro; se falhar, usa latin1 (comum em bancos BR)
          let text = e.target?.result as string;
          if (!text) throw new Error("Arquivo vazio");

          const rows = parseCSV(text);
          if (rows.length === 0) {
            toast.error("Nenhum lançamento encontrado no extrato. Verifique o formato do CSV.");
            return;
          }
          setExtract(rows);
          toast.success(`${rows.length} lançamentos lidos! Clique em Iniciar Conciliação.`);
        } catch {
          toast.error("Erro ao processar o arquivo. Verifique se é um CSV válido.");
        }
      };
      reader.readAsText(file, "latin1");
    },
    [transactions]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportXLSX(result);
      toast.success("Relatório Excel gerado!");
    } catch {
      toast.error("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const iniciarConciliacao = () => {
    if (!extract) return;
    const reconciled = reconcile(extract, transactions);
    setResult(reconciled);
    toast.success("Conciliação automática concluída!");
  };

  const reset = () => {
    setExtract(null);
    setResult(null);
    setFileName("");
    setFilterStatus("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Métricas ──
  const total = result?.length ?? 0;
  const conciliados = result?.filter((r) => r.status === "conciliado").length ?? 0;
  const parciais = result?.filter((r) => r.status === "parcial").length ?? 0;
  const naoEncontrados = result?.filter((r) => r.status === "nao_encontrado").length ?? 0;
  const valorConciliado = result
    ?.filter((r) => r.status !== "nao_encontrado")
    .reduce((s, r) => s + Math.abs(r.extract.amount), 0) ?? 0;
  const valorNaoConciliado = result
    ?.filter((r) => r.status === "nao_encontrado")
    .reduce((s, r) => s + Math.abs(r.extract.amount), 0) ?? 0;

  const filtered = filterStatus ? result?.filter((r) => r.status === filterStatus) : result;

  const statusConfig = {
    conciliado: {
      label: "Conciliado",
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-500/10",
      badge: "bg-green-500/10 text-green-600 border border-green-500/20",
    },
    parcial: {
      label: "Parcial",
      icon: AlertCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      badge: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    },
    nao_encontrado: {
      label: "Não encontrado",
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      badge: "bg-red-500/10 text-red-500 border border-red-500/20",
    },
  } as const;

  return (
    <div className="space-y-5">

      {/* ── Upload ── */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
          {fileName ? (
            <>
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {extract?.length} lançamentos lidos
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remover arquivo
              </button>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-muted">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {loadingTx ? "Carregando lançamentos..." : "Clique ou arraste o extrato bancário"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: <strong>CSV</strong> exportado do seu banco (Bradesco, Itaú, BB, Santander, Sicoob, etc.)
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                O arquivo é processado no seu navegador — nenhum dado bancário é enviado ao servidor.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Botão de Iniciar Conciliação ── */}
      {extract && !result && (
        <div className="flex justify-center mt-4">
          <button
            onClick={iniciarConciliacao}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCw className="w-5 h-5" />
            Iniciar Conciliação Automática
          </button>
        </div>
      )}

      {/* ── Painel de métricas (aparece após upload) ── */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Total */}
            <div className="metric-card col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Total no extrato</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{total}</p>
              <p className="text-xs text-muted-foreground">lançamentos</p>
            </div>
            {/* Conciliados */}
            <button
              onClick={() => setFilterStatus(filterStatus === "conciliado" ? "" : "conciliado")}
              className={`metric-card text-left transition-all hover:ring-2 hover:ring-green-500/40 ${filterStatus === "conciliado" ? "ring-2 ring-green-500" : ""}`}
            >
              <p className="text-xs text-muted-foreground">Conciliados</p>
              <p className="text-2xl font-bold text-green-600 tabular-nums mt-1">{conciliados}</p>
              <p className="text-xs text-green-600">{total ? Math.round((conciliados / total) * 100) : 0}% do total</p>
            </button>
            {/* Parciais */}
            <button
              onClick={() => setFilterStatus(filterStatus === "parcial" ? "" : "parcial")}
              className={`metric-card text-left transition-all hover:ring-2 hover:ring-amber-500/40 ${filterStatus === "parcial" ? "ring-2 ring-amber-500" : ""}`}
            >
              <p className="text-xs text-muted-foreground">Parciais</p>
              <p className="text-2xl font-bold text-amber-500 tabular-nums mt-1">{parciais}</p>
              <p className="text-xs text-amber-500">data ±1 dia</p>
            </button>
            {/* Não encontrados */}
            <button
              onClick={() => setFilterStatus(filterStatus === "nao_encontrado" ? "" : "nao_encontrado")}
              className={`metric-card text-left transition-all hover:ring-2 hover:ring-red-500/40 ${filterStatus === "nao_encontrado" ? "ring-2 ring-red-500" : ""}`}
            >
              <p className="text-xs text-muted-foreground">Não encontrados</p>
              <p className="text-2xl font-bold text-red-500 tabular-nums mt-1">{naoEncontrados}</p>
              <p className="text-xs text-red-500">sem par no sistema</p>
            </button>
            {/* Valores */}
            <div className="metric-card col-span-2 sm:col-span-1 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Valor conciliado</p>
                  <p className="text-sm font-bold text-green-600 tabular-nums">{formatCurrency(valorConciliado)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Não conciliado</p>
                  <p className="text-sm font-bold text-red-500 tabular-nums">{formatCurrency(valorNaoConciliado)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {filterStatus && (
                <button
                  onClick={() => setFilterStatus("")}
                  className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpar filtro
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                Exibindo {filtered?.length ?? 0} de {total} lançamentos
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
              >
                <RefreshCw className="w-4 h-4" />
                Novo extrato
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {exporting ? "Gerando..." : "Baixar Excel"}
              </button>
            </div>
          </div>

          {/* ── Tabela de resultados ── */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="data-table w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th>Data Extrato</th>
                  <th>Descrição Extrato</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Lançamento no Sistema</th>
                  <th className="hidden xl:table-cell">Data Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum lançamento com este status.
                    </td>
                  </tr>
                ) : (
                  filtered?.map((row, i) => {
                    const cfg = statusConfig[row.status];
                    const Icon = cfg.icon;
                    return (
                      <tr key={i} className={row.status === "nao_encontrado" ? "bg-red-500/3" : row.status === "parcial" ? "bg-amber-500/3" : ""}>
                        <td className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(row.extract.date)}
                        </td>
                        <td>
                          <p className="text-sm font-medium truncate max-w-[200px]" title={row.extract.description}>
                            {row.extract.description}
                          </p>
                        </td>
                        <td className={`font-semibold tabular-nums whitespace-nowrap ${row.extract.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {row.extract.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(row.extract.amount))}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                          {row.tolerance === "data_1dia" && (
                            <p className="text-[10px] text-amber-500 mt-0.5">Diferença de 1 dia</p>
                          )}
                        </td>
                        <td className="hidden lg:table-cell">
                          {row.matched ? (
                            <div>
                              <p className="text-sm truncate max-w-[220px]" title={row.matched.description}>
                                {row.matched.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(row.matched as any).clients?.name ?? (row.matched as any).equipment?.name ?? row.matched.category}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>
                        <td className="hidden xl:table-cell text-sm text-muted-foreground whitespace-nowrap">
                          {row.matched?.paid_date ? formatDate(row.matched.paid_date) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Nota explicativa ── */}
          <div className="flex gap-2.5 p-4 rounded-xl bg-muted/40 border text-xs text-muted-foreground">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><strong className="text-foreground">✅ Conciliado:</strong> Valor e data de pagamento idênticos ao extrato.</p>
              <p><strong className="text-foreground">⚠️ Parcial:</strong> Valor idêntico, mas data com diferença de 1 dia (compensação bancária).</p>
              <p><strong className="text-foreground">❌ Não encontrado:</strong> Nenhum lançamento pago correspondente no sistema. Verifique se o pagamento foi baixado manualmente.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
