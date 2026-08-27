'use client';

import Link from 'next/link';
import { useState } from 'react';

const questions = [
  {
    prompt: 'إذا كان ٣س + ٢ = ١٤، فما قيمة س؟',
    answers: ['٢', '٤', '٦'],
    correct: 1,
  },
  {
    prompt: 'أي كسر يساوي ٠٫٥؟',
    answers: ['١⁄٢', '١⁄٣', '٢⁄٣'],
    correct: 0,
  },
  {
    prompt: 'مساحة مستطيل طوله ٦ وعرضه ٣ تساوي:',
    answers: ['٩', '١٨', '٢٤'],
    correct: 1,
  },
] as const;

export function PlacementCheck() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const score = questions.reduce(
    (total, question, index) => total + (answers[index] === question.correct ? 1 : 0),
    0,
  );

  if (finished) {
    return (
      <section className="placement-result" role="status">
        <p className="section-kicker">نتيجتك المبدئية</p>
        <strong>
          {score} / {questions.length}
        </strong>
        <h1>
          {score === questions.length
            ? 'أساسك قوي'
            : score >= 2
              ? 'بداية جيدة'
              : 'لنثبّت الأساس أولاً'}
        </h1>
        <p>
          هذا فحص تمهيدي سريع. تصفّح الدروس المناسبة لصفّك، وابدأ بالدرس الأول الذي يبدو جديداً
          عليك.
        </p>
        <Link className="primary-button" href="/grades/all">
          اعرض الدروس ←
        </Link>
      </section>
    );
  }

  return (
    <form
      className="placement-form"
      onSubmit={(event) => {
        event.preventDefault();
        setFinished(true);
      }}
    >
      {questions.map((question, questionIndex) => (
        <fieldset key={question.prompt}>
          <legend>
            <span>{String(questionIndex + 1).padStart(2, '0')}</span>
            {question.prompt}
          </legend>
          <div className="placement-options">
            {question.answers.map((answer, answerIndex) => (
              <label key={answer}>
                <input
                  type="radio"
                  name={`question-${questionIndex}`}
                  required
                  checked={answers[questionIndex] === answerIndex}
                  onChange={() =>
                    setAnswers((current) => ({ ...current, [questionIndex]: answerIndex }))
                  }
                />
                {answer}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button className="primary-button" type="submit">
        اعرض النتيجة ←
      </button>
    </form>
  );
}
