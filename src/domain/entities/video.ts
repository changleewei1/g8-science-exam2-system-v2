export class Video {
  constructor(
    public readonly id: string,
    public readonly unitId: string,
    public readonly youtubeVideoId: string,
    public readonly playlistId: string | null,
    public readonly videoOrder: number | null,
    public readonly title: string,
    public readonly description: string | null,
    public readonly durationSeconds: number | null,
    public readonly thumbnailUrl: string | null,
    public readonly subtitleText: string | null,
    public readonly sortOrder: number,
    public readonly isActive: boolean,
    /** draft | pending_review | active（對應資料庫 management_status） */
    public readonly managementStatus: string = "active",
  ) {}

  /** 學生端列表／影片詳情：須為已對外且已啟用 */
  visibleToStudent(): boolean {
    return (
      this.isActive &&
      this.youtubeVideoId.length > 0 &&
      (this.managementStatus === "active" || !this.managementStatus)
    );
  }

  isPlayable(): boolean {
    return this.isActive && this.youtubeVideoId.length > 0;
  }

  belongsToUnit(unitId: string): boolean {
    return this.unitId === unitId;
  }
}
