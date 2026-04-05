import type { Video } from "@/domain/entities";

/**
 * 從影片標題取得「編號」用於排序：優先開頭的半形／全形數字；
 * 若開頭非數字則取第一組連續數字（避免依賴 Intl，Edge 與 Node 行為一致）。
 */
function primaryNumberFromVideoTitle(title: string): number | null {
  const t = title.trim().replace(/^\uFEFF/, "");
  const half = t.match(/^(\d+)/);
  if (half) return parseInt(half[1], 10);
  const full = t.match(/^([\uFF10-\uFF19]+)/);
  if (full) {
    const ascii = full[1].replace(/[\uFF10-\uFF19]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
    );
    return parseInt(ascii, 10);
  }
  const any = t.match(/(\d+)/);
  if (any) return parseInt(any[1], 10);
  return null;
}

/**
 * 依標題中的「編號」排序：8、9、10、11 依數值大小（不可僅用 localeCompare，
 * 部分環境對「開頭數字+中文」的 numeric collation 與預期不符）。
 */
export function comparePlaylistVideoTitle(a: string, b: string): number {
  const na = primaryNumberFromVideoTitle(a);
  const nb = primaryNumberFromVideoTitle(b);
  if (na != null && nb != null && na !== nb) return na - nb;
  if (na != null && nb == null) return -1;
  if (na == null && nb != null) return 1;
  return a.localeCompare(b, "zh-Hant", { numeric: true });
}

/** 同一單元內影片（學生端單元頁、任務內依單元篩選時） */
export function sortVideosInUnitByPlaylistTitle(videos: Video[]): Video[] {
  const list = [...videos];
  list.sort((a, b) => comparePlaylistVideoTitle(a.title, b.title));
  return list;
}

/** 跨單元時先依 unitId，同單元內再依標題編號（與後台任務選片一致） */
export function sortVideosByUnitThenPlaylistTitle(videos: Video[]): Video[] {
  const list = [...videos];
  list.sort((a, b) => {
    const byUnit = a.unitId.localeCompare(b.unitId);
    if (byUnit !== 0) return byUnit;
    return comparePlaylistVideoTitle(a.title, b.title);
  });
  return list;
}
