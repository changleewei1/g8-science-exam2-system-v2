export class ScopeUnit {
  constructor(
    public readonly id: string,
    public readonly examScopeId: string,
    public readonly unitCode: string,
    public readonly unitTitle: string,
    public readonly sortOrder: number,
  ) {}

  belongsToScope(scopeId: string): boolean {
    return this.examScopeId === scopeId;
  }
}
