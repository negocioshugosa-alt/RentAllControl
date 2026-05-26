"use client";
// src/app/error.tsx
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">
        Ocorreu um erro inesperado. Tente novamente ou retorne ao dashboard.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border font-medium text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Ir ao Dashboard
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-8 text-xs text-left bg-muted p-4 rounded-xl max-w-xl overflow-auto text-red-500">
          {error.message}
        </pre>
      )}
    </div>
  );
}
