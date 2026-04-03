export class SkillTag {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly unit: string,
    public readonly category: string | null,
    public readonly difficulty: string | null,
    public readonly domain: string | null = null,
  ) {}

  belongsToUnit(unitCode: string): boolean {
    return this.unit === unitCode;
  }
}
