export class ExamScope {
  constructor(
    public readonly id: string,
    public readonly subject: string,
    public readonly grade: number,
    public readonly term: number,
    public readonly examNo: number,
    public readonly title: string,
    public readonly description: string | null,
    public readonly isActive: boolean,
  ) {}

  isAvailable(): boolean {
    return this.isActive === true;
  }
}
