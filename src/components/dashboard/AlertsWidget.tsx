"use client";
// src/components/dashboard/AlertsWidget.tsx
import Link from "next/link";
import { AlertTriangle, Clock, FileWarning, Bell } from "lucide-react";
import type { Alert } from "@/types";
import { formatDate } from "@/lib/utils";

interface Props {
  alerts: Alert[];
}

const alertIcons: Record<string, React.ElementType> = {
  conta_vencer: Clock,
  conta_vencida: AlertTriangle,
  contrato_vencer: FileWarning,
  inadimplencia: AlertTriangle,
  manutencao: Bell,
};

const priorityColors: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10",
  high: "text-orange-500 bg-orange-500/10",
  medium: "text-yellow-500 bg-yellow-500/10",
  low: "text-blue-500 bg-blue-500/10",
};

export function AlertsWidget({ alerts }: Props) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Alertas</h3>
          <p className="text-sm text-muted-foreground">{alerts.length} não lidos</p>
        </div>
        <Link href="/alertas" className="text-xs text-primary hover:underline font-medium">
          Ver todos
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Bell className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Nenhum alerta pendente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = alertIcons[alert.type] || Bell;
            return (
              <div key={alert.id} className="flex gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${priorityColors[alert.priority]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-tight truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
