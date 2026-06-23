// src/components/financeiro/PaymentModal.tsx
import { useState } from "react";
import { X, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";
import { NumericFormat } from "react-number-format";

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onConfirm: (payload: { id: string; status: "pago" | "recebido"; paid_date: string; amount: number; notes: string }) => void;
}

export function PaymentModal({ transaction, onClose, onConfirm }: Props) {
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(Number(transaction.amount));
  const [interest, setInterest] = useState(0);

  const total = amount + interest;
  const isReceita = transaction.type === "receita";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newNotes = transaction.notes || "";
    if (interest > 0) {
      newNotes += newNotes ? `\n` : "";
      newNotes += `[${new Date().toLocaleDateString("pt-BR")}] Acréscimo (Juros/Multa) adicionado na liquidação: ${formatCurrency(interest)}`;
    }
    
    onConfirm({
      id: transaction.id,
      status: isReceita ? "recebido" : "pago",
      paid_date: paidDate,
      amount: total,
      notes: newNotes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">{isReceita ? "Confirmar Recebimento" : "Confirmar Pagamento"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px]">{transaction.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Data da Liquidação</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                required
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Valor Base</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <NumericFormat
                value={amount}
                onValueChange={(v) => setAmount(v.floatValue || 0)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                className="input pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Juros / Multa / Acréscimos</label>
            <div className="relative">
              <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <NumericFormat
                value={interest}
                onValueChange={(v) => setInterest(v.floatValue || 0)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                className="input pl-9"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Base:</span>
              <span>{formatCurrency(amount)}</span>
            </div>
            {interest > 0 && (
              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-500">
                <span>Juros/Multa:</span>
                <span>+ {formatCurrency(interest)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total a {isReceita ? "Receber" : "Pagar"}:</span>
              <span className={isReceita ? "text-green-600" : "text-red-500"}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isReceita ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
