export interface VideoSkillTagInsert {
  video_id: string;
  skill_code: string;
  skill_name: string;
}

export interface VideoSkillTagRepository {
  insertMany(tags: VideoSkillTagInsert[]): Promise<void>;
  findSkillCodesByVideoId(videoId: string): Promise<string[]>;
}
