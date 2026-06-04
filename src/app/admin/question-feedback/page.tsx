import { redirect } from "next/navigation";
import { AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { QuestionFeedbackAdminClient } from "@/components/admin/QuestionFeedbackAdminClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminQuestionFeedbackPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminStandaloneHeader title="題目品質回饋" narrow />
      <AdminStandaloneMain narrow>
        <p className="mb-6 text-sm text-muted-foreground">
          依學生回饋聚合品質分、AI 可信度與優先修正排序；可篩選段考／技能／影片。重新 AI 生成會寫入候選題（draft），核准後才取代正式題並觸發題目更新通知。
        </p>
        <QuestionFeedbackAdminClient />
      </AdminStandaloneMain>
    </>
  );
}
