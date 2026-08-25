'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { clientApi } from '@/lib/client-api';
type Question = {
  id: string;
  type: string;
  promptSnapshot: string;
  options: { id: string; textSnapshot: string }[];
};
type Attempt = {
  id: string;
  status: string;
  quiz?: { title: string };
  attemptQuestions: Question[];
};
export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  async function start() {
    const x = await clientApi<{ data: { attempt: Attempt } }>(`/quizzes/${id}/attempts`, {
      method: 'POST',
    });
    setA(x.data.attempt);
  }
  async function submit() {
    if (!a) return;
    const payload = {
      answers: a.attemptQuestions.map((q) =>
        q.type === 'MCQ'
          ? { attemptQuestionId: q.id, selectedOptionId: answers[q.id] }
          : { attemptQuestionId: q.id, essayText: answers[q.id] ?? '' },
      ),
    };
    const x = await clientApi<{ data: { attempt: { status: string; score: string | null } } }>(
      `/attempts/${a.id}/submit`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    setResult(
      x.data.attempt.status === 'PENDING_REVIEW'
        ? 'أُرسل الاختبار وينتظر مراجعة الإجابات المقالية.'
        : `النتيجة: ${x.data.attempt.score}`,
    );
  }
  if (!a)
    return (
      <>
        <header className="dashboard-header">
          <p className="section-kicker">اختبار قصير</p>
          <h1>جاهز لتتأكد من فهمك؟</h1>
        </header>
        <button className="primary-button" onClick={() => void start()}>
          ابدأ المحاولة
        </button>
      </>
    );
  return (
    <>
      <header className="dashboard-header">
        <h1>{a.quiz?.title ?? 'الاختبار'}</h1>
      </header>
      <div className="quiz-sheet">
        {a.attemptQuestions.map((q, index) => (
          <fieldset key={q.id}>
            <legend>
              {index + 1}. {q.promptSnapshot}
            </legend>
            {q.type === 'MCQ' ? (
              q.options.map((o) => (
                <label key={o.id}>
                  <input
                    type="radio"
                    name={q.id}
                    onChange={() => setAnswers((x) => ({ ...x, [q.id]: o.id }))}
                  />
                  {o.textSnapshot}
                </label>
              ))
            ) : (
              <textarea onChange={(e) => setAnswers((x) => ({ ...x, [q.id]: e.target.value }))} />
            )}
          </fieldset>
        ))}
        <button className="primary-button" onClick={() => void submit()}>
          تسليم الإجابات
        </button>
        {result && <p role="status">{result}</p>}
      </div>
    </>
  );
}
