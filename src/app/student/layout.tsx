import { StudentTopNav } from "@/components/student/StudentTopNav";

export const dynamic = "force-dynamic";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F6FAFF]">
      <StudentTopNav />
      <div className="relative flex-1">{children}</div>
    </div>
  );
}
