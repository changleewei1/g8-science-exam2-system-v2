import { adminMainColumn } from "@/lib/admin-ui";

export default function LearningSetupHelpLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${adminMainColumn} py-8 sm:py-10`}>{children}</div>;
}
