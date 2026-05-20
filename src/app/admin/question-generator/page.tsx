import { redirect } from "next/navigation";
import { AiQuestionLabClient } from "@/components/admin/AiQuestionLabClient";
import { AdminInlineNavLink, AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuestionGeneratorPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminStandaloneHeader
        title="影片理解題產生"
        right={<AdminInlineNavLink href="/admin/question-candidates">題目候選審核</AdminInlineNavLink>}
      />
      <AdminStandaloneMain>
        <AiQuestionLabClient />
      </AdminStandaloneMain>
    </>
  );
}
