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
  ) {}

  isCorrect(answer: string): boolean {
    return answer.trim().toUpperCase() === this.correctAnswer.trim().toUpperCase();
  }
}
