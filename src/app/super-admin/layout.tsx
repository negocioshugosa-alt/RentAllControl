// src/app/super-admin/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Admin — RentAllControl",
  robots: "noindex, nofollow",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {children}
    </div>
  );
}
