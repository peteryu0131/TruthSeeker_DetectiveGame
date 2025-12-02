import { useEffect, useMemo, useState } from 'react';
import { buildQuiz } from '../engines/quizEngine.js';

export function useQuiz({ caseData, difficulty }) {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState(false);

  const questions = useMemo(() => {
    if (!caseData) return [];
    return buildQuiz(caseData, difficulty);
  }, [caseData, difficulty]);

  useEffect(() => {
    setAnswers({});
    setRevealed(false);
  }, [caseData, difficulty]);

  const submitAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const revealResults = () => setRevealed(true);

  const score = useMemo(() => {
    if (!revealed) return null;
    const total = questions.length;
    const correctCount = questions.filter((question) => answers[question.id] === question.answer).length;
    return { correct: correctCount, total };
  }, [answers, questions, revealed]);

  return {
    questions,
    answers,
    revealed,
    score,
    submitAnswer,
    revealResults
  };
}
