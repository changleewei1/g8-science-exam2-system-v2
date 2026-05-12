import { NextResponse } from "next/server";

/** 智慧練習未啟用時之 API 回應（403） */
export function labPracticeFeatureDisabledResponse() {
  return NextResponse.json(
    {
      error: "FEATURE_DISABLED",
      message: "智慧練習目前未開放，請聯繫管理者。",
    },
    { status: 403 },
  );
}
