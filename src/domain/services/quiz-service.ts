import { QuizAttempt, type AnswerMap } from "@/domain/entities";
import type {
  QuizAttemptRepository,
  AnswerInsert,
} from "@/domain/repositories";
import type { QuizQuestionRepository } from "@/domain/repositories";
import type { QuizRepository } from "@/domain/repositories";
import type { VideoProgressRepository } from "@/domain/repositories";
import type { VideoRepository } from "@/domain/repositories";
import {
  filterExam3VideoComprehensionQuestions,
  isExam3ScopeId,
} from "@/lib/exam3-video-quiz-guards";

export class QuizService {
  constructor(
    private readonly quizRepo: QuizRepository,
    private readonly questionRepo: QuizQuestionRepository,
    private readonly progressRepo: VideoProgressRepository,
    private readonly attemptRepo: QuizAttemptRepository,
    private readonly videoRepo: VideoRepository,
  ) {}

  async getQuizByQuizId(quizId: string, studentId: string) {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz || !quiz.isActive) return null;
    const progress = await this.progressRepo.findByStudentAndVideo(studentId, quiz.videoId);
    if (!progress || !quiz.canBeTaken(progress)) {
      return { quiz, questions: [] as never[], unlocked: false, videoId: quiz.videoId };
    }
    const questions = await this.questionRepo.findByQuizId(quiz.id);
    const examScopeId = await this.videoRepo.findExamScopeIdForVideo(quiz.videoId);
    const mapped = questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl,
      referenceImageUrl: q.referenceImageUrl,
      choiceA: q.choiceA,
      choiceB: q.choiceB,
      choiceC: q.choiceC,
      choiceD: q.choiceD,
      choiceAImageUrl: q.choiceAImageUrl,
      choiceBImageUrl: q.choiceBImageUrl,
      choiceCImageUrl: q.choiceCImageUrl,
      choiceDImageUrl: q.choiceDImageUrl,
      sortOrder: q.sortOrder,
      skillCode: q.skillCode,
    }));
    const { items: sanitized, incomplete } = filterExam3VideoComprehensionQuestions(examScopeId, mapped);
    return {
      quiz,
      questions: sanitized,
      unlocked: true,
      videoId: quiz.videoId,
      quizIncomplete: incomplete,
    };
  }

  async getQuizForVideo(videoId: string, studentId: string) {
    const quiz = await this.quizRepo.findByVideoId(videoId);
    if (!quiz || !quiz.isActive) return null;
    const progress = await this.progressRepo.findByStudentAndVideo(studentId, videoId);
    if (!progress || !quiz.canBeTaken(progress)) {
      return { quiz, questions: [] as never[], unlocked: false };
    }
    const questions = await this.questionRepo.findByQuizId(quiz.id);
    const examScopeId = await this.videoRepo.findExamScopeIdForVideo(videoId);
    const mapped = questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl,
      referenceImageUrl: q.referenceImageUrl,
      choiceA: q.choiceA,
      choiceB: q.choiceB,
      choiceC: q.choiceC,
      choiceD: q.choiceD,
      choiceAImageUrl: q.choiceAImageUrl,
      choiceBImageUrl: q.choiceBImageUrl,
      choiceCImageUrl: q.choiceCImageUrl,
      choiceDImageUrl: q.choiceDImageUrl,
      sortOrder: q.sortOrder,
      skillCode: q.skillCode,
    }));
    const { items: sanitized, incomplete } = filterExam3VideoComprehensionQuestions(examScopeId, mapped);
    return { quiz, questions: sanitized, unlocked: true, quizIncomplete: incomplete };
  }

  async submitQuiz(quizId: string, studentId: string, answers: AnswerMap) {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw new Error("QUIZ_NOT_FOUND");
    const progress = await this.progressRepo.findByStudentAndVideo(studentId, quiz.videoId);
    if (!progress || !quiz.canBeTaken(progress)) throw new Error("VIDEO_NOT_COMPLETED");

    const questions = await this.questionRepo.findByQuizId(quizId);
    const examScopeId = await this.videoRepo.findExamScopeIdForVideo(quiz.videoId);
    const { items: exam3Subset } = filterExam3VideoComprehensionQuestions(examScopeId, questions);
    const usable = isExam3ScopeId(examScopeId) ? exam3Subset : questions;
    if (usable.length === 0) {
      throw new Error("NO_QUESTIONS");
    }

    const attempt = new QuizAttempt(
      "",
      studentId,
      quizId,
      0,
      false,
      new Date(),
      null,
    );
    attempt.submit(answers, usable, quiz.passScore);

    const { id: attemptId } = await this.attemptRepo.createAttempt({
      student_id: studentId,
      quiz_id: quizId,
      score: 0,
      is_passed: false,
      started_at: new Date().toISOString(),
      submitted_at: null,
    });

    const answerRows: AnswerInsert[] = usable.map((q) => {
      const sel = answers[q.id] ?? "";
      return {
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: sel,
        is_correct: q.isCorrect(sel),
      };
    });

    await this.attemptRepo.insertAnswers(answerRows);
    await this.attemptRepo.updateAttempt(
      attemptId,
      attempt.score,
      attempt.isPassed,
      new Date().toISOString(),
    );

    if (attempt.isPassed) {
      await this.progressRepo.markCompletedFromQuizPass(studentId, quiz.videoId);
    }

    return {
      attemptId,
      score: attempt.score,
      passed: attempt.isPassed,
      passScore: quiz.passScore,
    };
  }

  /** 單題作答回饋（不寫入 attempts；供影片頁逐步顯示正解／解析） */
  async getQuestionFeedback(quizId: string, studentId: string, questionId: string, selectedAnswer: string) {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw new Error("QUIZ_NOT_FOUND");
    const progress = await this.progressRepo.findByStudentAndVideo(studentId, quiz.videoId);
    if (!progress || !quiz.canBeTaken(progress)) throw new Error("VIDEO_NOT_COMPLETED");
    const questions = await this.questionRepo.findByQuizId(quizId);
    const examScopeId = await this.videoRepo.findExamScopeIdForVideo(quiz.videoId);
    const { items: exam3Shown, incomplete } = filterExam3VideoComprehensionQuestions(
      examScopeId,
      questions,
    );
    const q = questions.find((x) => x.id === questionId);
    if (!q) throw new Error("QUESTION_NOT_FOUND");
    if (isExam3ScopeId(examScopeId)) {
      if (incomplete || !exam3Shown.some((x) => x.id === questionId)) {
        throw new Error("QUESTION_NOT_FOUND");
      }
    }
    const letter = selectedAnswer.trim().toUpperCase().charAt(0);
    return {
      isCorrect: q.isCorrect(letter),
      explanation: q.explanation ?? "",
      correctAnswer: q.correctAnswer.trim().toUpperCase().charAt(0),
      skillCode: q.skillCode,
    };
  }
}
