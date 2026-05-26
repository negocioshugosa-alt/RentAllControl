// src/app/not-found.tsx
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-6">
        <Zap className="w-6 h-6 text-white" />
      </div>
      <h1 className="font-display text-7xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-bold mb-2">Página não encontrada</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
