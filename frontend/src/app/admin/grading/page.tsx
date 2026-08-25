'use client';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type A = {
  id: string;
  status: string;
  submittedAt: string;
  user: { name: string };
  quiz: { title: string };
  attemptQuestions: {
    id: string;
    pointsSnapshot: string;
    promptSnapshot: string;
    answer: { essayText: string | null };
  }[];
};
export default function Grading() {
  const [items, setItems] = useState<A[]>([]);
  const load = () =>
    clientApi<{ data: { items: A[] } }>(
      '/admin/attempts?status=PENDING_REVIEW&page=1&pageSize=50',
    ).then((x) => setItems(x.data.items));
  useEffect(() => {
    void load();
  }, []);
  async function grade(a: A) {
    const answers = a.attemptQuestions
      .filter((x) => x.answer?.essayText)
      .map((x) => ({
        attemptQuestionId: x.id,
        points: Number(x.pointsSnapshot),
        feedback: 'إجابة صحيحة',
      }));
    await clientApi(`/admin/attempts/${a.id}/grade`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    await load();
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">طابور المقال</p>
        <h1>التصحيح</h1>
      </header>
      <div className="notification-list">
        {items.map((a) => (
          <article key={a.id}>
            <div>
              <small>
                {a.user.name} · {a.quiz.title}
              </small>
              {a.attemptQuestions
                .filter((x) => x.answer?.essayText)
                .map((x) => (
                  <p key={x.id}>
                    <strong>{x.promptSnapshot}</strong>
                    <br />
                    {x.answer.essayText}
                  </p>
                ))}
            </div>
            <button onClick={() => void grade(a)}>منح الدرجة الكاملة</button>
          </article>
        ))}
      </div>
      {items.length === 0 && <div className="dashboard-empty">لا توجد إجابات تنتظر التصحيح.</div>}
    </>
  );
}
