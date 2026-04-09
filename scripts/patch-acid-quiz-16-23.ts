/**
 * 一次更新酸鹼單元第 16～23 部影片的 quiz_questions（每份 3 題）。
 * 使用：npx tsx scripts/patch-acid-quiz-16-23.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

type Patch = {
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string;
  skill_code: string;
  difficulty: string;
  question_image_url?: string | null;
  reference_image_url?: string | null;
  choice_a_image_url?: string | null;
  choice_b_image_url?: string | null;
  choice_c_image_url?: string | null;
  choice_d_image_url?: string | null;
};

const IMG22 = "/quiz-assets/acid-base-video22-hcl-dilution-ph.png";

const CLEAR_IMAGES = {
  question_image_url: null,
  reference_image_url: null,
  choice_a_image_url: null,
  choice_b_image_url: null,
  choice_c_image_url: null,
  choice_d_image_url: null,
};

const UPDATES: Record<string, Patch> = {
  "bbc452ec-020d-41bb-8fde-86532224bec8": {
    skill_code: "CO03",
    difficulty: "進階",
    question_text:
      "葡萄糖是最常見的醣類之一，下列何者為其分子式與分子量（取整數）的正確組合？",
    choice_a: "C6H12O6、150",
    choice_b: "C6H6O6、180",
    choice_c: "CH2O、180",
    choice_d: "C6H12O6、180",
    correct_answer: "D",
    explanation:
      "葡萄糖的分子式為 C6H12O6；分子量 = 12×6 + 1×12 + 16×6 = 180。",
    ...CLEAR_IMAGES,
  },
  "f23f3bf4-28a5-45d8-83f2-7aa7195c13ac": {
    skill_code: "CO03",
    difficulty: "進階",
    question_text:
      "將 36 公克的葡萄糖溶於水，配成 800 毫升溶液，葡萄糖的莫耳濃度（M）為多少？",
    choice_a: "0.20 M",
    choice_b: "0.25 M",
    choice_c: "0.40 M",
    choice_d: "0.50 M",
    correct_answer: "B",
    explanation:
      "葡萄糖分子量 180 g／mol，莫耳數 n = 36／180 = 0.20 mol；體積 V = 800 mL = 0.80 L。M = n／V = 0.20／0.80 = 0.25 M。",
    ...CLEAR_IMAGES,
  },
  "62536bbd-fca4-409d-baa0-3ddb05716b75": {
    skill_code: "CO04",
    difficulty: "進階",
    question_text:
      "承上題若溶質總莫耳數不變，欲稀釋成 0.05 M，溶液的總體積應接近多少公升？",
    choice_a: "2 公升",
    choice_b: "3 公升",
    choice_c: "4 公升",
    choice_d: "8 公升",
    correct_answer: "C",
    explanation:
      "稀釋前後溶質莫耳數相同：n = 0.20 mol。V = n／M = 0.20／0.05 = 4 L。",
    ...CLEAR_IMAGES,
  },

  "5eba957a-b064-4ba5-9b35-65947be793a7": {
    skill_code: "CO04",
    difficulty: "進階",
    question_text:
      "原為 12 M 的硫酸，倒掉二分之一體積後再加滿水（恢復原總體積），此時濃度為多少 M？",
    choice_a: "3 M",
    choice_b: "6 M",
    choice_c: "9 M",
    choice_d: "12 M",
    correct_answer: "B",
    explanation:
      "溶質剩下一半、再加滿水使體積回到原來大小，濃度變為原來的一半：12／2 = 6 M。",
    ...CLEAR_IMAGES,
  },
  "3f754552-52d1-4cff-be26-032e3b57301c": {
    skill_code: "CO04",
    difficulty: "進階",
    question_text: "承上題，若接著再倒掉四分之三體積後再加滿水，此時濃度為多少 M？",
    choice_a: "3 M",
    choice_b: "6 M",
    choice_c: "1.5 M",
    choice_d: "0.75 M",
    correct_answer: "C",
    explanation:
      "6 M 溶液倒掉 3／4 只留 1／4 的溶質量，再加滿水後濃度為 6 × (1／4) = 1.5 M。",
    ...CLEAR_IMAGES,
  },
  "8f042cae-6883-4a1a-9632-582d40b5e3cd": {
    skill_code: "CO04",
    difficulty: "進階",
    question_text: "承上題，若再倒掉二分之一體積後再加滿水，最終濃度為多少 M？",
    choice_a: "1.5 M",
    choice_b: "3 M",
    choice_c: "0.375 M",
    choice_d: "0.75 M",
    correct_answer: "D",
    explanation:
      "1.5 M 再倒掉一半溶質並加滿水：1.5 × (1／2) = 0.75 M。（完整操作：12 → 6 → 1.5 → 0.75 M。）",
    ...CLEAR_IMAGES,
  },

  "c7dc9ab6-8b43-4c35-abb4-a0f262875f94": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text:
      "要配置 1 M 的 KOH 溶液 2 L，需要溶質多少克？（K＝39、O＝16、H＝1）",
    choice_a: "56",
    choice_b: "84",
    choice_c: "112",
    choice_d: "224",
    correct_answer: "C",
    explanation:
      "KOH 式量 = 39 + 16 + 1 = 56；需要莫耳數 n = M × V = 1 × 2 = 2 mol；質量 = 2 × 56 = 112 g。",
    ...CLEAR_IMAGES,
  },
  "5801adc5-05e9-4fbd-94d3-f7374ef1991e": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text:
      "要配置 0.4 M 的 KOH 溶液 500 mL，約需溶質多少克？（KOH 式量以 56 計）",
    choice_a: "5.6",
    choice_b: "11.2",
    choice_c: "22.4",
    choice_d: "44.8",
    correct_answer: "B",
    explanation: "V = 0.5 L，n = 0.4 × 0.5 = 0.2 mol；質量 = 0.2 × 56 = 11.2 g。",
    ...CLEAR_IMAGES,
  },
  "06974569-d4f4-45b2-9f2d-d7f809e80c1c": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text: "多少克的 KOH 恰為 2.0 莫耳？（式量 56）",
    choice_a: "28",
    choice_b: "56",
    choice_c: "84",
    choice_d: "112",
    correct_answer: "D",
    explanation: "質量 = 莫耳數 × 式量 = 2.0 × 56 = 112 g。",
    ...CLEAR_IMAGES,
  },

  "086794eb-9921-48ec-a43e-4d1401ec128d": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text: "2 M 的鹽酸溶液 5 公升，含溶質（HCl）多少莫耳？",
    choice_a: "2",
    choice_b: "5",
    choice_c: "7",
    choice_d: "10",
    correct_answer: "D",
    explanation: "n = M × V = 2 × 5 = 10 mol。",
    ...CLEAR_IMAGES,
  },
  "34b09751-12e8-4cfc-9c26-6ace10dfea6d": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text: "承上題，這些 HCl 溶質的質量約為多少克？（Cl＝35.5、H＝1）",
    choice_a: "365",
    choice_b: "182.5",
    choice_c: "73",
    choice_d: "36.5",
    correct_answer: "A",
    explanation:
      "HCl 式量 = 1 + 35.5 = 36.5；10 mol × 36.5 g／mol = 365 g。",
    ...CLEAR_IMAGES,
  },
  "311b9c56-9af6-48c2-8118-f75c66fee84b": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text: "從該 2 M、5 L 溶液中取出 1 公升，取出部分的 HCl 莫耳數為多少？",
    choice_a: "2",
    choice_b: "10",
    choice_c: "5",
    choice_d: "0.4",
    correct_answer: "A",
    explanation:
      "溶液均勻，1 L 的濃度仍為 2 M，故 n = 2 × 1 = 2 mol。",
    ...CLEAR_IMAGES,
  },

  "349816a5-acde-41ed-b52c-c1c6ada48290": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text:
      "將 80 公克的 NaOH 溶於水，配成 4 公升的溶液，則此溶液的莫耳濃度為多少？",
    choice_a: "1 M",
    choice_b: "2 M",
    choice_c: "0.25 M",
    choice_d: "0.5 M",
    correct_answer: "D",
    explanation:
      "NaOH 式量 = 23 + 16 + 1 = 40；80 g 為 80／40 = 2 mol。M = n／V = 2／4 = 0.5 M。",
    ...CLEAR_IMAGES,
  },
  "4f407cfd-8975-4be6-aff5-d5ce0454663b": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text:
      "將 200 公克的 NaOH 溶於水，配成 10 公升的溶液，則此溶液的莫耳濃度為多少？",
    choice_a: "1 M",
    choice_b: "2 M",
    choice_c: "0.5 M",
    choice_d: "0.2 M",
    correct_answer: "C",
    explanation: "200／40 = 5 mol；M = 5／10 = 0.5 M。",
    ...CLEAR_IMAGES,
  },
  "5cb8e479-1ca5-45f8-ba03-3ccf0010a397": {
    skill_code: "CO03",
    difficulty: "基礎",
    question_text:
      "將 120 公克的 NaOH 溶於水，配成 3 公升的溶液，則此溶液的莫耳濃度為多少？",
    choice_a: "2 M",
    choice_b: "0.5 M",
    choice_c: "4 M",
    choice_d: "1 M",
    correct_answer: "D",
    explanation: "120／40 = 3 mol；M = 3／3 = 1 M。",
    ...CLEAR_IMAGES,
  },

  "989b51c8-d76a-4ece-83fe-44eb18005cad": {
    skill_code: "CO03",
    difficulty: "進階",
    question_text:
      "6 M 的 NaOH 溶液 2 公升與 2 M 的 NaOH 溶液 3 公升混合，若體積可加算，混合後濃度為多少 M？",
    choice_a: "2.4 M",
    choice_b: "3.0 M",
    choice_c: "3.6 M",
    choice_d: "4.0 M",
    correct_answer: "C",
    explanation:
      "溶質莫耳數 = 6×2 + 2×3 = 12 + 6 = 18；總體積 = 5 L；M = 18／5 = 3.6 M。",
    ...CLEAR_IMAGES,
  },
  "6f461c63-fa97-4f12-8dfc-0d583a3c01a3": {
    skill_code: "CO03",
    difficulty: "進階",
    question_text:
      "1 M 的 NaOH 溶液 3 公升與 3 M 的 NaOH 溶液 1 公升混合（體積可加算），混合後濃度為多少 M？",
    choice_a: "1.0 M",
    choice_b: "1.5 M",
    choice_c: "2.0 M",
    choice_d: "2.5 M",
    correct_answer: "B",
    explanation:
      "溶質 = 1×3 + 3×1 = 6 mol，總體積 4 L，M = 6／4 = 1.5 M。",
    ...CLEAR_IMAGES,
  },
  "a54f204f-239e-47b2-8a61-317cda287652": {
    skill_code: "CO03",
    difficulty: "進階",
    question_text:
      "0.5 M 的 KOH 200 mL 與 1.5 M 的 KOH 300 mL 混合（體積可加算），混合後濃度約為多少 M？",
    choice_a: "0.9 M",
    choice_b: "1.0 M",
    choice_c: "1.1 M",
    choice_d: "1.2 M",
    correct_answer: "C",
    explanation:
      "n = 0.5×0.2 + 1.5×0.3 = 0.1 + 0.45 = 0.55 mol；V = 0.5 L；M = 0.55／0.5 = 1.1 M。",
    ...CLEAR_IMAGES,
  },

  "03950a29-2a3b-477e-a760-63042adc8224": {
    skill_code: "AB05",
    difficulty: "進階",
    question_text:
      "下列何圖表示 1 M 的鹽酸加水稀釋的過程？（縱軸為 pH，橫軸為加入水的體積；圖中虛線為 pH = 7）",
    choice_a: "圖 (A)",
    choice_b: "圖 (B)",
    choice_c: "圖 (C)",
    choice_d: "圖 (D)",
    correct_answer: "C",
    explanation:
      "強酸加水稀釋時 [H+] 下降、pH 上升，但即便再稀也僅無限「接近」7，不會變成鹼性（pH 不會大於 7）。附圖中 (C) 為趨近 7 且不穿越的典型曲線。",
    question_image_url: null,
    reference_image_url: IMG22,
    choice_a_image_url: null,
    choice_b_image_url: null,
    choice_c_image_url: null,
    choice_d_image_url: null,
  },
  "4f5a757a-a96d-40f4-b380-2d8460ba8330": {
    skill_code: "AB05",
    difficulty: "進階",
    question_text: "以純水不斷稀釋某強酸溶液時，其 pH 變化趨勢下列何者最合理？",
    choice_a: "pH 不變",
    choice_b: "pH 上昇並趨近 7，但不會單靠加水而超過 7",
    choice_c: "pH 最後必大於 7（變鹼性）",
    choice_d: "pH 必下降",
    correct_answer: "B",
    explanation:
      "稀釋使酸性變弱、pH 上升；因未加入鹼，溶液仍為酸／極稀酸，pH 僅能趨近中性 7，不會只靠加水就變 pH＞7。",
    ...CLEAR_IMAGES,
  },
  "73f09d38-7e3e-4c42-987e-0c8054e02778": {
    skill_code: "AB05",
    difficulty: "進階",
    question_text: "下列關於「強酸以水稀釋」的敘述，何者正確？（假設未再溶入酸鹼、亦未倒出溶液）",
    choice_a: "體積變大而酸溶質總莫耳數不變時，氫離子濃度通常會下降",
    choice_b: "一直加水最後可變成 pH = 14 的強鹼",
    choice_c: "稀釋只加水便會使 pH 大於 7",
    choice_d: "導電度一定不隨稀釋而變",
    correct_answer: "A",
    explanation:
      "稀釋使體積變大，溶質莫耳數不變則 [H+] 下降；未加鹼則不會變 pH＞7，更不會變 pH=14；離子濃度下降時導電度通常會變差。",
    ...CLEAR_IMAGES,
  },

  "09c37344-2073-477a-8c4d-08aa135468a2": {
    skill_code: "AB05",
    difficulty: "進階",
    question_text:
      "取相同質量的下列各溶質溶解成同體積水溶液，何者的 pH 值最大？（原子量：H＝1、O＝16、Na＝23、K＝39、Cl＝35.5、Ca＝40）",
    choice_a: "NaOH",
    choice_b: "KOH",
    choice_c: "HCl",
    choice_d: "Ca(OH)2",
    correct_answer: "D",
    explanation:
      "pH 最大代表鹼性最強（OH− 相對最多）。同質量時，Ca(OH)2 莫耳數為 m／74，且每莫耳可解離 2 mol OH−，OH− 總量約為 2m／74，大於同質量 NaOH 的 m／40、KOH 的 m／56；HCl 為酸，pH 最小。",
    ...CLEAR_IMAGES,
  },
  "008fe8cb-cd21-4466-aed3-a7c1829a88cb": {
    skill_code: "AB05",
    difficulty: "基礎",
    question_text: "濃度均約為 0.1 M 時，下列四種水溶液中，何者的 pH 最小？",
    choice_a: "NaOH",
    choice_b: "KOH",
    choice_c: "HCl",
    choice_d: "Ca(OH)2",
    correct_answer: "C",
    explanation:
      "pH 最小表示酸性最強。0.1 M 鹽酸為強酸溶液，pH 明顯小於 7；三種鹼的 pH 皆大於 7。",
    ...CLEAR_IMAGES,
  },
  "2ba0a67b-3ee3-4abd-901b-bdfdd364d3d7": {
    skill_code: "AB05",
    difficulty: "進階",
    question_text:
      "取相同莫耳數的 NaOH 與 Ca(OH)2，分別溶於等量水配成溶液（皆完全解離），何者的 pH 較大？",
    choice_a: "NaOH",
    choice_b: "Ca(OH)2",
    choice_c: "兩者 pH 必完全相同",
    choice_d: "無法比較",
    correct_answer: "B",
    explanation:
      "兩者皆為強鹼且莫耳數相同時，NaOH 每莫耳提供 1 mol OH−，Ca(OH)2 每莫耳提供 2 mol OH−，後者 OH− 濃度較高，pH 較大。",
    ...CLEAR_IMAGES,
  },
};

async function main() {
  const supabase = getSupabaseAdmin();
  let ok = 0;
  for (const [id, patch] of Object.entries(UPDATES)) {
    const { error } = await supabase.from("quiz_questions").update(patch).eq("id", id);
    if (error) {
      console.error(id, error.message);
      process.exit(1);
    }
    ok++;
  }
  console.log(`已更新 ${ok} 筆 quiz_questions（酸鹼影片 16～23）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
