/**
 * LINE Flex 按鈕 `action.uri` 規則嚴格：需為可對外開啟的 **https**，
 * `http://localhost`、`http://…`、含中文／明顯佔位之主機名常會回 400 Invalid action URI。
 */
export function isUsableLineFlexUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;
    // 常見誤貼之佔位（非合法公開網域）
    if (h.includes("你的") || h.includes("your-app") || h.includes("example.com")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
