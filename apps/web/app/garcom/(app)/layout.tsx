import { StaffShell } from "../../../components/staff-shell";

export default function GarcomAppLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
