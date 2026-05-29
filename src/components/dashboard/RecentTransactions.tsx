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
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold font-display text-base text-foreground">Últimas Movimentações</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Receitas e despesas recentes lançadas no sistema</p>
        </div>
        <Link
          href="/financeiro"
          className="text-xs text-primary hover:underline font-semibold bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          Ver tudo
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center border-t border-dashed rounded-xl mt-2">
          Nenhuma movimentação financeira registrada recentemente.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 text-center w-12 font-semibold">Tipo</th>
                  <th className="pb-3 px-4 font-semibold">Descrição</th>
                  <th className="pb-3 px-4 font-semibold hidden md:table-cell">Categoria</th>
                  <th className="pb-3 px-4 font-semibold">Data</th>
                  <th className="pb-3 px-4 font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx) => {
                  const isReceita = tx.type === "receita";
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-all group">
                      <td className="py-3 text-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-transform group-hover:scale-105 ${
                          isReceita ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                        }`}>
                          {isReceita ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-sm text-foreground truncate max-w-[150px] sm:max-w-xs">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground uppercase tracking-wider">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {formatDate(tx.due_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider badge-${tx.status}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-bold text-sm tabular-nums ${
                        isReceita ? "text-green-600 dark:text-green-400" : "text-red-500"
                      }`}>
                        {isReceita ? "+" : "-"}
                        {formatCurrency(Number(tx.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
