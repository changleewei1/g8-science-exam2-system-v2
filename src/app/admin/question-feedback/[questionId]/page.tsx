import { redirect, notFound } from "next/navigation";
import { AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { QuestionFeedbackDetailClient } from "@/components/admin/QuestionFeedbackDetailClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ questionId: string }> };

export default async function AdminQuestionFeedbackDetailPage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const { questionId } = await params;
  if (!questionId?.trim()) notFound();

  return (
    <>
      <AdminStandaloneHeader title="題目品質詳情" narrow />
      <AdminStandaloneMain narrow>
        <QuestionFeedbackDetailClient questionId={questionId} />
      </AdminStandaloneMain>
    </>
  );
}
