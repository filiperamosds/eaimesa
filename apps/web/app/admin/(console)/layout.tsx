import { AdminShell } from "../../../components/admin-shell";

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
