This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 老師學習追蹤（`/admin/video-tracking`）

登入後 JWT 可帶入班級白名單（選用）。未設定時與舊版相同可查所有班級；設定後僅能開啟白名單內班級，且 `overview` API 會拒絕 `classId=all`。

| 環境變數 | 說明 |
|----------|------|
| `TEACHER_TRACKING_LABEL` | 首頁標題用，預設 `國二理化` |
| `TEACHER_TRACKING_CLASSES` | 逗號分隔班級代碼（對應 `students.class_name`），例：`801,802,803` |
| `TEACHER_TRACKING_GRADE` | 篩選段考用年級文字，預設 `國二` |
| `TEACHER_TRACKING_SUBJECT` | 篩選段考用科目，預設 `理化` |

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
