import { NavShell } from "@/components/layout/nav-shell";
import { ToastProvider } from "@/components/ui/toast";
import { RegisterSW } from "@/components/common/register-sw";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RegisterSW />
      <NavShell>{children}</NavShell>
    </ToastProvider>
  );
}
