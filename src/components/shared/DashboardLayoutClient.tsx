"use client";
// src/components/shared/DashboardLayoutClient.tsx
import { useState } from "react";
import { Sidebar } from "./Sidebar";

interface Props {
  children: React.ReactNode;
  companyName?: string;
  userName?: string;
  logoUrl?: string;
  alertCount?: number;
}

export function DashboardLayoutClient({ children, companyName, userName, logoUrl, alertCount }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          companyName={companyName}
          userName={userName}
          logoUrl={logoUrl}
          alertCount={alertCount}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar
              companyName={companyName}
              userName={userName}
              logoUrl={logoUrl}
              alertCount={alertCount}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
