import { redirect } from "next/navigation";
import { AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { QuestionBankAdminClient } from "@/components/admin/QuestionBankAdminClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminQuestionBankPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminStandaloneHeader title="題庫版本" narrow />
      <AdminStandaloneMain narrow>
        <p className="mb-6 text-sm text-slate-600">
          顯示有綁定影片的題庫題與目前版本號。題目內容變更時會自動升版並寫入歷史；學生端會收到「題目已更新」通知。
        </p>
        <QuestionBankAdminClient />
      </AdminStandaloneMain>
    </>
  );
}
