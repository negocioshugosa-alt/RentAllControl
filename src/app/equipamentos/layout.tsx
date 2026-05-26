import { AppLayout } from "@/components/shared/AppLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
