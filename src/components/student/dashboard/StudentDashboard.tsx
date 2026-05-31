"use client";

import type { StudentFocusHomePayload } from "@/lib/student-dashboard-types";
import { StudentFocusHome } from "@/components/student/dashboard/StudentFocusHome";

type Props = {
  data: StudentFocusHomePayload;
};

export function StudentDashboard({ data }: Props) {
  return <StudentFocusHome data={data} />;
}
