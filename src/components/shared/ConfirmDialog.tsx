"use client";
// src/components/shared/ConfirmDialog.tsx
import { AlertTriangle, X } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
  loading = false,
  variant = "danger",
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="p-6">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              variant === "danger" ? "bg-red-500/10" : "bg-orange-500/10"
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${variant === "danger" ? "text-red-500" : "text-orange-500"}`}
            />
          </div>
          <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 ${
              variant === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {loading ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
