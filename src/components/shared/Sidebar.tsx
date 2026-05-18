"use client";
// src/components/shared/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wrench, Users, FileText,
  DollarSign, Bell, BarChart3, PieChart,
  Settings, LogOut, Zap, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

const navItems = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/alertas", label: "Alertas", icon: Bell, badge: true },
    ],
  },
  {
    title: "Operacional",
    items: [
      { href: "/equipamentos", label: "Equipamentos", icon: Wrench },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/contratos", label: "Contratos", icon: FileText },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: DollarSign },
      { href: "/centro-custo", label: "Centro de Custo", icon: PieChart },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
];

interface SidebarProps {
  companyName?: string;
  userName?: string;
  logoUrl?: string;
  alertCount?: number;
}

export function Sidebar({ companyName = "Minha Empresa", userName = "Usuário", logoUrl, alertCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Iniciais da empresa para o avatar
  const initials = companyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sidebar flex flex-col h-screen sticky top-0 z-30 flex-shrink-0">
      {/* Logo / Empresa */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
        {logoUrl ? (
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
            <Image src={logoUrl} alt={companyName} width={36} height={36} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            {initials || <Zap className="w-4 h-4" />}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display font-bold text-white text-sm leading-tight truncate">{companyName}</p>
          <p className="text-xs truncate" style={{ color: "hsl(var(--sidebar-muted))" }}>{userName}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: "hsl(var(--sidebar-muted))" }}>
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={cn("sidebar-link", isActive && "active")}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && alertCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                          {alertCount > 99 ? "99+" : alertCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-0.5">
        <Link href="/configuracoes" className="sidebar-link">
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span>{loggingOut ? "Saindo…" : "Sair"}</span>
        </button>
      </div>
    </aside>
  );
}
