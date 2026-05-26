"use client";
// src/components/dashboard/RecentTransactions.tsx
import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Últimas Movimentações</h3>
          <p className="text-sm text-muted-foreground">Receitas e despesas recentes</p>
        </div>
        <Link
          href="/financeiro"
          className="text-xs text-primary hover:underline font-medium"
        >
          Ver tudo
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma movimentação encontrada
        </p>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`p-1.5 rounded-lg flex-shrink-0 ${
                  tx.type === "receita"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {tx.type === "receita" ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(tx.due_date)} ·{" "}
                  <span className={`badge-${tx.status} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </p>
              </div>
              <p
                className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                  tx.type === "receita" ? "text-green-600 dark:text-green-400" : "text-red-500"
                }`}
              >
                {tx.type === "receita" ? "+" : "-"}
                {formatCurrency(Number(tx.amount))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
