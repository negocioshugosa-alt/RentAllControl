"use client";

// src/components/shared/CsvImportModal.tsx
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Download, Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  type: "equipment" | "finance";
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Normalização inteligente de dados em português para chaves do banco de dados
const normalizeValue = (val: string): string => {
  return val
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos
};

const mapEquipmentCategory = (val: string): string => {
  const norm = normalizeValue(val);
  if (norm.includes("caminhao")) return "caminhao";
  if (norm.includes("maquina pesada") || norm.includes("maquina_pesada")) return "maquina_pesada";
  if (norm.includes("construcao") || norm.includes("equipamento_construcao")) return "equipamento_construcao";
  if (norm.includes("empilhadeira")) return "empilhadeira";
  if (norm.includes("gerador")) return "gerador";
  if (norm.includes("compressor")) return "compressor";
  if (norm.includes("andaime")) return "andaime";
  return "outro"; // Default fallback
};

const mapEquipmentStatus = (val: string): string => {
  const norm = normalizeValue(val);
  if (norm.includes("disponivel") || norm.includes("livre")) return "disponivel";
  if (norm.includes("alugado") || norm.includes("locado")) return "alugado";
  if (norm.includes("manutencao") || norm.includes("oficina")) return "manutencao";
  if (norm.includes("inativo")) return "inativo";
  if (norm.includes("vendido")) return "vendido";
  return "disponivel";
};

const mapTransactionType = (val: string): string => {
  const norm = normalizeValue(val);
  if (norm.includes("receita") || norm.includes("entrada") || norm.includes("recebimento") || norm.includes("ganho")) return "receita";
  if (norm.includes("despesa") || norm.includes("saida") || norm.includes("pagamento") || norm.includes("custo")) return "despesa";
  return "despesa";
};

const mapTransactionStatus = (val: string): string => {
  const norm = normalizeValue(val);
  if (norm.includes("pago") || norm.includes("recebido") || norm.includes("quitado")) return "pago";
  if (norm.includes("vencido") || norm.includes("atrasado")) return "vencido";
  if (norm.includes("cancelado")) return "cancelado";
  return "pendente"; // Default
};

const mapTransactionCategory = (val: string, type: "receita" | "despesa"): string => {
  const norm = normalizeValue(val);
  if (type === "receita") {
    if (norm.includes("aluguel") || norm.includes("locacao")) return "aluguel";
    if (norm.includes("caucao")) return "caucao";
    if (norm.includes("multa")) return "multa_contrato";
    return "outros";
  } else {
    if (norm.includes("combustivel")) return "combustivel";
    if (norm.includes("manutencao") || norm.includes("oficina") || norm.includes("conserto")) return "manutencao";
    if (norm.includes("pneu")) return "pneus";
    if (norm.includes("peca") || norm.includes("pecas")) return "pecas";
    if (norm.includes("seguro")) return "seguro";
    if (norm.includes("ipva")) return "ipva";
    if (norm.includes("lavagem") || norm.includes("limpeza")) return "lavagem";
    if (norm.includes("multa")) return "multas";
    if (norm.includes("salario") || norm.includes("folha") || norm.includes("comissao")) return "salarios";
    if (norm.includes("marketing") || norm.includes("propaganda")) return "marketing";
    if (norm.includes("escritorio") || norm.includes("aluguel sala")) return "escritorio";
    if (norm.includes("financiamento") || norm.includes("parcela")) return "financiamento";
    if (norm.includes("imposto") || norm.includes("taxa")) return "impostos";
    return "outros";
  }
};

const mapPaymentMethod = (val: string): string => {
  const norm = normalizeValue(val);
  if (norm.includes("pix")) return "pix";
  if (norm.includes("boleto")) return "boleto";
  if (norm.includes("cartao")) return "cartao";
  if (norm.includes("transferencia") || norm.includes("ted") || norm.includes("doc")) return "transferencia";
  if (norm.includes("dinheiro") || norm.includes("especie")) return "dinheiro";
  if (norm.includes("cheque")) return "cheque";
  return "";
};

export function CsvImportModal({ type, companyId, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 1. Gera e baixa o arquivo de modelo CSV do navegador
  function downloadTemplate() {
    let headers: string[] = [];
    let exampleRow: string[] = [];

    if (type === "equipment") {
      headers = [
        "codigo",
        "nome",
        "categoria (Opcoes: caminhao, maquina_pesada, equipamento_construcao, empilhadeira, gerador, compressor, andaime, outro)",
        "marca",
        "modelo",
        "ano",
        "placa",
        "chassis",
        "status (Opcoes: disponivel, alugado, manutencao, inativo)",
        "valor_compra",
        "valor_diaria",
        "valor_mensal",
        "observacoes"
      ];
      exampleRow = [
        "EQ-100",
        "Caminhão Basculante 12m³",
        "caminhao",
        "Volvo",
        "VM 330",
        "2021",
        "XYZ-9876",
        "9BLVM330XXXXXX",
        "disponivel",
        "380000",
        "450",
        "8500",
        "Caminhão em ótimo estado, revisado recentemente."
      ];
    } else {
      headers = [
        "data_vencimento (AAAA-MM-DD)",
        "descricao",
        "valor",
        "tipo (Opcoes: receita, despesa)",
        "categoria (Opcoes: aluguel, caucao, multa_contrato, combustivel, manutencao, pneus, pecas, seguro, ipva, lavagem, multas, salarios, marketing, escritorio, financiamento, impostos, outros)",
        "status (Opcoes: pendente, pago, vencido, cancelado)",
        "data_pagamento (AAAA-MM-DD)",
        "forma_pagamento (Opcoes: pix, boleto, cartao, transferencia, dinheiro, cheque)",
        "codigo_equipamento (Debe coincidir com o codigo de um equipamento cadastrado)",
        "observacoes"
      ];
      exampleRow = [
        "2026-06-10",
        "Aluguel mensal gerador de energia",
        "1200",
        "receita",
        "aluguel",
        "pendente",
        "",
        "",
        "EQ-100",
        "Faturamento referente ao mês de Junho/2026."
      ];
    }

    // Gerar string CSV formatada com ponto e vírgula (padrão do Excel em Português)
    const csvContent = "\ufeff" + [
      headers.join(";"),
      exampleRow.join(";")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", type === "equipment" ? "modelo_importacao_equipamentos.csv" : "modelo_importacao_financeiro.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 2. Lê e processa o arquivo CSV selecionado
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorLog([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(selectedFile, "utf-8");
  }

  function parseCsv(text: string) {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length <= 1) {
        throw new Error("O arquivo CSV está vazio ou possui apenas o cabeçalho.");
      }

      // Detecção de delimitador (vírgula ou ponto e vírgula)
      const headerLine = lines[0];
      const delimiter = headerLine.includes(";") ? ";" : ",";

      // Extrai os cabeçalhos
      const rawHeaders = headerLine.split(delimiter).map(h => h.replace(/^"|"$/g, "").trim());

      const dataRows = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split regex para ignorar delimitadores dentro de aspas duplas se houver
        const regex = new RegExp(`\\s*${delimiter}\\s*(?=(?:[^"]*"[^"]*")*[^"]*$)`);
        const values = line.split(regex).map(v => v.replace(/^"|"$/g, "").trim());

        if (values.length < 2) continue; // Pula linhas em branco ou inválidas

        const rowObj: any = {};
        rawHeaders.forEach((header, index) => {
          // Extrai apenas o nome limpo do cabeçalho antes dos parênteses
          const cleanHeader = header.split("(")[0].trim().toLowerCase();
          rowObj[cleanHeader] = values[index] || "";
        });

        dataRows.push(rowObj);
      }

      setParsedData(dataRows);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar arquivo CSV.");
      setFile(null);
    }
  }

  // 3. Efetua a importação em lote para o Supabase
  async function handleImport() {
    if (parsedData.length === 0) return;
    setImporting(true);
    setErrorLog([]);

    try {
      const supabase = createClient();

      if (type === "equipment") {
        const payload = parsedData.map((row, idx) => {
          if (!row.codigo) throw new Error(`Linha ${idx + 2}: Coluna 'codigo' é obrigatória.`);
          if (!row.nome) throw new Error(`Linha ${idx + 2}: Coluna 'nome' é obrigatória.`);

          return {
            company_id: companyId,
            code: row.codigo.trim().toUpperCase(),
            name: row.nome.trim(),
            category: mapEquipmentCategory(row.categoria || ""),
            brand: row.marca?.trim() || null,
            model: row.modelo?.trim() || null,
            year: parseInt(row.ano) || null,
            plate: row.placa?.trim() || null,
            chassis: row.chassis?.trim() || null,
            status: mapEquipmentStatus(row.status || "disponivel"),
            purchase_value: parseFloat(row.valor_compra) || null,
            daily_rate: parseFloat(row.valor_diaria) || null,
            monthly_rate: parseFloat(row.valor_mensal) || null,
            notes: row.observacoes?.trim() || null,
          };
        });

        // Insert em lote
        const { error } = await supabase.from("equipment").insert(payload);
        if (error) throw error;

        toast.success(`${payload.length} equipamentos importados com sucesso!`);
      } else {
        // Para o financeiro, precisamos buscar os equipamentos da empresa para fazer o mapeamento do código do equipamento para UUID
        const { data: equipments } = await supabase
          .from("equipment")
          .select("id, code")
          .eq("company_id", companyId);

        const eqMap: Record<string, string> = {};
        equipments?.forEach(e => {
          eqMap[e.code.toUpperCase()] = e.id;
        });

        const logs: string[] = [];
        const payload = parsedData.map((row, idx) => {
          if (!row.data_vencimento) throw new Error(`Linha ${idx + 2}: Coluna 'data_vencimento' é obrigatória.`);
          if (!row.descricao) throw new Error(`Linha ${idx + 2}: Coluna 'descricao' é obrigatória.`);
          if (!row.valor) throw new Error(`Linha ${idx + 2}: Coluna 'valor' é obrigatória.`);

          const eqCode = row.codigo_equipamento?.trim().toUpperCase();
          let eqId = null;

          if (eqCode) {
            eqId = eqMap[eqCode] || null;
            if (!eqId) {
              logs.push(`Aviso Linha ${idx + 2}: Equipamento com código "${eqCode}" não foi localizado no sistema. O lançamento será criado sem vínculo.`);
            }
          }

          const rawType = mapTransactionType(row.tipo || "");

          return {
            company_id: companyId,
            due_date: row.data_vencimento.trim(),
            description: row.descricao.trim(),
            amount: parseFloat(row.valor.replace(/[^0-9.-]+/g, "")) || 0,
            type: rawType,
            category: mapTransactionCategory(row.categoria || "", rawType as any),
            status: mapTransactionStatus(row.status || ""),
            paid_date: row.data_pagamento?.trim() || null,
            payment_method: mapPaymentMethod(row.forma_pagamento || ""),
            equipment_id: eqId,
            notes: row.observacoes?.trim() || null,
          };
        });

        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;

        if (logs.length > 0) {
          setErrorLog(logs);
          toast.warning(`${payload.length} lançamentos importados com alguns avisos de equipamentos não localizados.`);
        } else {
          toast.success(`${payload.length} lançamentos financeiros importados com sucesso!`);
          onSuccess();
          onClose();
        }
      }

      onSuccess();
      if (errorLog.length === 0) {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na importação em lote.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold font-display">
              Importar {type === "equipment" ? "Equipamentos" : "Lançamentos Financeiros"}
            </h2>
            <p className="text-xs text-muted-foreground">Importe seus dados em lote subindo uma planilha modelo em formato CSV.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Passo 1: Download do Modelo */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-sm font-bold text-foreground">Baixar Planilha Modelo</h3>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                Baixe o modelo com as colunas corretas e listas de opções recomendadas para evitar erros de importação.
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Modelo CSV
            </button>
          </div>

          {/* Passo 2: Upload do Arquivo */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Selecione o arquivo CSV preenchido
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:bg-muted/30 hover:border-muted-foreground/30 transition-all flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-sm font-semibold">
                {file ? file.name : "Clique para selecionar o arquivo"}
              </p>
              <p className="text-xs text-muted-foreground">Apenas arquivos no formato .csv</p>
            </div>
          </div>

          {/* Aviso dos Campos no CSV */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Atenção às opções válidas na planilha:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                {type === "equipment" ? (
                  <>
                    <li><strong>Categoria</strong>: deve conter palavras correspondentes a caminhao, maquina_pesada, equipamento_construcao, empilhadeira, gerador, compressor, andaime ou outro.</li>
                    <li><strong>Status</strong>: disponivel, alugado, manutencao, inativo ou vendido.</li>
                  </>
                ) : (
                  <>
                    <li><strong>Tipo</strong>: receita ou despesa.</li>
                    <li><strong>Status</strong>: pendente, pago, vencido ou cancelado.</li>
                    <li><strong>Vínculo por Código</strong>: o código do equipamento inserido na planilha será vinculado de forma automática e inteligente ao equipamento existente na sua base.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Avisos/Erros de validação pós-upload */}
          {errorLog.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-xs text-rose-700 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Avisos na Validação dos Dados:
              </p>
              <div className="max-h-24 overflow-y-auto pl-4 list-decimal list-inside space-y-0.5 font-mono text-[10px]">
                {errorLog.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Pré-visualização dos Dados ({parsedData.length} registros detectados)
              </h3>
              <div className="rounded-xl border bg-card overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted sticky top-0 font-semibold border-b">
                    <tr>
                      {type === "equipment" ? (
                        <>
                          <th className="px-3 py-2">Código</th>
                          <th className="px-3 py-2">Nome</th>
                          <th className="px-3 py-2">Categoria</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">V. Diária</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2">Vencimento</th>
                          <th className="px-3 py-2">Descrição</th>
                          <th className="px-3 py-2">Valor</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Equipamento</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/10">
                        {type === "equipment" ? (
                          <>
                            <td className="px-3 py-2 font-mono">{row.codigo}</td>
                            <td className="px-3 py-2 font-medium">{row.nome}</td>
                            <td className="px-3 py-2 capitalize">{row.categoria}</td>
                            <td className="px-3 py-2 capitalize">{row.status}</td>
                            <td className="px-3 py-2">{row.valor_diaria}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 font-mono">{row.data_vencimento}</td>
                            <td className="px-3 py-2 font-medium">{row.descricao}</td>
                            <td className="px-3 py-2 font-semibold">{row.valor}</td>
                            <td className="px-3 py-2 uppercase">{row.tipo}</td>
                            <td className="px-3 py-2 font-mono">{row.codigo_equipamento || "—"}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={5} className="text-center py-2 text-muted-foreground text-[10px] bg-muted/20 border-t">
                          Mais {parsedData.length - 10} registros ocultados na pré-visualização.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/20">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {errorLog.length > 0 ? "Fechar" : "Cancelar"}
          </button>
          <button
            onClick={handleImport}
            disabled={importing || parsedData.length === 0}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Confirmar Importação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
