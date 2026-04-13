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

function isValidHttpUrlOrEmpty(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const urlField = z.preprocess(
  (v) => (v === null || v === undefined ? "" : String(v)),
  z.string().max(2048),
);

const adminQuizQuestionItemSchema = z
  .object({
    question_text: z.string().max(8000),
    question_image_url: urlField,
    reference_image_url: urlField,
    choice_a: z.string().max(4000),
    choice_a_image_url: urlField,
    choice_b: z.string().max(4000),
    choice_b_image_url: urlField,
    choice_c: z.string().max(4000),
    choice_c_image_url: urlField,
    choice_d: z.string().max(4000),
    choice_d_image_url: urlField,
    correct_answer: z.enum(["A", "B", "C", "D"]),
    explanation: z.string().nullable().optional(),
    difficulty: z.string().nullable().optional(),
    skill_code: z.string().min(1, "請選擇技能代碼"),
  })
  .superRefine((data, ctx) => {
    const urlPaths = [
      ["question_image_url", data.question_image_url],
      ["reference_image_url", data.reference_image_url],
      ["choice_a_image_url", data.choice_a_image_url],
      ["choice_b_image_url", data.choice_b_image_url],
      ["choice_c_image_url", data.choice_c_image_url],
      ["choice_d_image_url", data.choice_d_image_url],
    ] as const;
    for (const [path, val] of urlPaths) {
      if (!isValidHttpUrlOrEmpty(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "圖片網址須為有效的 http 或 https",
          path: [path],
        });
      }
    }
    if (!data.question_text.trim() && !data.question_image_url.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "題幹文字與題幹圖至少填一項",
        path: ["question_text"],
      });
    }
    const choiceRows = [
      { text: data.choice_a, img: data.choice_a_image_url, path: "choice_a" as const },
      { text: data.choice_b, img: data.choice_b_image_url, path: "choice_b" as const },
      { text: data.choice_c, img: data.choice_c_image_url, path: "choice_c" as const },
      { text: data.choice_d, img: data.choice_d_image_url, path: "choice_d" as const },
    ];
    for (const { text, img, path } of choiceRows) {
      if (!text.trim() && !img.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "選項文字與選項圖至少填一項",
          path: [path],
        });
      }
    }
  });

const MAX_QUIZ_QUESTIONS = 40;

/** 每份測驗可 1～40 題（與後台 JSON／表單編輯一致） */
export const adminPutQuizQuestionsBodySchema = z.object({
  questions: z
    .array(adminQuizQuestionItemSchema)
    .min(1, "至少需要 1 題")
    .max(MAX_QUIZ_QUESTIONS, `最多 ${MAX_QUIZ_QUESTIONS} 題`),
});
