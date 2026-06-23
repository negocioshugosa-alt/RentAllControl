"use client";
// src/components/shared/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wrench, Users, FileText,
  DollarSign, Bell, BarChart3, PieChart,
  Settings, LogOut, Zap, Building2, Truck,
  ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useSubscription } from "@/hooks/useSubscription";
import { Lock } from "lucide-react";
import { Logo } from "./Logo";

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
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/financeiro", label: "Lançamentos", icon: DollarSign },
      { href: "/financeiro/conciliacao", label: "Conciliação Bancária", icon: RefreshCw },
      { href: "/centro-custo", label: "Centro de Custo", icon: PieChart },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

interface SidebarProps {
  companyName?: string;
  userName?: string;
  logoUrl?: string;
  alertCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  companyName = "Minha Empresa",
  userName = "Usuário",
  logoUrl,
  alertCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { hasConciliationAddon } = useSubscription();

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
    <aside className={cn(
      "sidebar relative flex flex-col h-screen sticky top-0 z-30 flex-shrink-0 transition-all duration-300",
      isCollapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Toggle Collapse Button on Border */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#161b22] text-muted-foreground hover:text-white transition-colors z-40"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
      {/* Logo / Empresa */}
      <div className={cn(
        "flex items-center border-b border-white/5 py-5 transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "gap-2.5 px-4"
      )}>
        <Logo iconOnly={isCollapsed} />
        {!isCollapsed && (
          <div className="min-w-0 flex-1 flex items-center justify-between transition-opacity duration-300 pl-2">
            <div className="min-w-0 pr-2">
              <p className="font-display font-bold text-white text-sm leading-tight truncate">{companyName}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: "hsl(var(--sidebar-muted))" }}>{userName}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0 mr-1"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navItems.map((section) => (
          <div key={section.title}>
            {isCollapsed ? (
              <div className="border-t border-white/5 my-4" />
            ) : (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 transition-all duration-300" style={{ color: "hsl(var(--sidebar-muted))" }}>
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                let isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                if (item.href === "/financeiro" && pathname.startsWith("/financeiro/conciliacao")) {
                  isActive = false;
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "sidebar-link transition-all duration-300",
                        isActive && "active",
                        isCollapsed && "justify-center px-0 w-10 h-10 mx-auto rounded-lg"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="relative">
                        <item.icon className={cn(
                          "w-4 h-4 flex-shrink-0",
                          item.icon === Bell && alertCount > 0 && "text-yellow-400 dark:text-yellow-400 fill-yellow-400/20 animate-pulse"
                        )} />
                        {isCollapsed && item.badge && alertCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--sidebar-bg)] animate-pulse" />
                        )}
                      </div>
                      {!isCollapsed && (
                        <span className="flex-1 transition-opacity duration-300 flex items-center gap-1.5">
                          {item.label}
                          {item.href === "/financeiro/conciliacao" && !hasConciliationAddon && (
                            <span title="Módulo Adicional (Requer Assinatura)">
                              <Lock className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                        </span>
                      )}
                      {!isCollapsed && item.badge && alertCount > 0 && (
                        <>
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-pulse">
                            {alertCount > 99 ? "99+" : alertCount}
                          </span>
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Logout quando collapsed */}
        {isCollapsed && (
          <div className="pt-4 mt-auto">
            <div className="border-t border-white/5 mb-4" />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="sidebar-link justify-center px-0 w-10 h-10 mx-auto rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
