export class QuizQuestion {
  constructor(
    public readonly id: string,
    public readonly quizId: string,
    public readonly questionText: string,
    public readonly questionType: string,
    public readonly choiceA: string,
    public readonly choiceB: string,
    public readonly choiceC: string,
    public readonly choiceD: string,
    public readonly correctAnswer: string,
    public readonly explanation: string | null,
    public readonly sortOrder: number,
    public readonly difficulty: string | null,
    public readonly skillCode: string,
    public readonly questionImageUrl: string | null = null,
    public readonly referenceImageUrl: string | null = null,
    public readonly choiceAImageUrl: string | null = null,
    public readonly choiceBImageUrl: string | null = null,
    public readonly choiceCImageUrl: string | null = null,
    public readonly choiceDImageUrl: string | null = null,
  ) {}

  isCorrect(answer: string): boolean {
    return answer.trim().toUpperCase() === this.correctAnswer.trim().toUpperCase();
  }
}
