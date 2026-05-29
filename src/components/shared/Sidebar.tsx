"use client";
// src/components/shared/Sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wrench, Users, FileText,
  DollarSign, Bell, BarChart3, PieChart,
  Settings, LogOut, Zap, Building2, Truck,
  ChevronLeft, ChevronRight
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
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
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
      "sidebar flex flex-col h-screen sticky top-0 z-30 flex-shrink-0 transition-all duration-300",
      isCollapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo / Empresa */}
      <div className={cn(
        "flex items-center border-b border-white/5 py-5 transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "gap-2.5 px-4"
      )}>
        {logoUrl ? (
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
            <Image src={logoUrl} alt={companyName} width={36} height={36} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-inner">
            {initials || <Zap className="w-4 h-4" />}
          </div>
        )}
        {!isCollapsed && (
          <div className="min-w-0 transition-opacity duration-300 flex-1">
            <p className="font-display font-bold text-white text-sm leading-tight truncate">{companyName}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: "hsl(var(--sidebar-muted))" }}>{userName}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
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
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                      {!isCollapsed && <span className="flex-1 transition-opacity duration-300">{item.label}</span>}
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
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-0.5">
        <Link
          href="/configuracoes"
          className={cn(
            "sidebar-link transition-all duration-300",
            isCollapsed && "justify-center px-0 w-10 h-10 mx-auto rounded-lg"
          )}
          title={isCollapsed ? "Configurações" : undefined}
        >
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span>Configurações</span>}
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300",
            isCollapsed && "justify-center px-0 w-10 h-10 mx-auto rounded-lg"
          )}
          title={isCollapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>{loggingOut ? "Saindo…" : "Sair"}</span>}
        </button>

        {/* Toggle Collapse Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "sidebar-link w-full text-muted-foreground hover:text-foreground transition-all duration-300 pt-3 mt-2 border-t border-white/5",
              isCollapsed && "justify-center px-0 w-10 h-10 mx-auto rounded-lg border-t-0 pt-0 mt-0"
            )}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!isCollapsed && <span>Recolher Menu</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
