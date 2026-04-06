import { z } from "zod";

export const loginBodySchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("student"),
    studentCode: z.string().min(1),
    /** 設有 password_hash 時必填 */
    password: z.string().optional(),
  }),
  z.object({
    role: z.literal("admin"),
    adminSecret: z.string().min(1),
  }),
]);

export const videoProgressBodySchema = z.object({
  videoId: z.string().uuid(),
  currentTimeSeconds: z.number().nonnegative(),
  durationSeconds: z.number().positive(),
  incrementView: z.boolean().optional(),
});

export const submitQuizBodySchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export const reportLinkBodySchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

export const adminCreateStudentBodySchema = z.object({
  name: z.string().min(1),
  className: z.string().min(1),
  grade: z.number().int().min(1).max(12),
  seat: z.number().int().min(1).max(999).optional(),
});

export const adminImportStudentsBodySchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(1),
        className: z.string().min(1),
        grade: z.number().int().min(1).max(12),
        seat: z.number().int().min(1).max(999).optional(),
      }),
    )
    .min(1),
});

export const createLearningTaskBodySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    className: z.string().min(1),
    assignmentMode: z.enum(["class", "students"]).optional().default("class"),
    studentIds: z.array(z.string().uuid()).optional().default([]),
    isActive: z.boolean().optional().default(true),
    videos: z
      .array(
        z.object({
          videoId: z.string().uuid(),
          dayIndex: z.number().int().min(1),
        }),
      )
      .min(1),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "結束日不可早於開始日",
    path: ["endDate"],
  })
  .superRefine((data, ctx) => {
    if (data.assignmentMode === "students" && data.studentIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "請至少選擇一位學生",
        path: ["studentIds"],
      });
    }
  });

const adminQuizQuestionItemSchema = z.object({
  question_text: z.string().min(1, "題幹不可為空"),
  choice_a: z.string().min(1),
  choice_b: z.string().min(1),
  choice_c: z.string().min(1),
  choice_d: z.string().min(1),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  skill_code: z.string().min(1, "請選擇技能代碼"),
});

/** 每部影片固定三題 */
export const adminPutQuizQuestionsBodySchema = z.object({
  questions: z.tuple([adminQuizQuestionItemSchema, adminQuizQuestionItemSchema, adminQuizQuestionItemSchema]),
});
