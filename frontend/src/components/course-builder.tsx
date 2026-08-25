'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { clientApi } from '@/lib/client-api';
type Grade = { id: string; name: string };
type Subject = { id: string; name: string };
type Course = {
  id: string;
  gradeId: string;
  subjectId: string;
  title: string;
  slug: string;
  description: string;
  price: string;
  accessDurationDays: number;
  status: string;
};
type Lesson = { id: string; title: string; type: string; sortOrder: number };
type Module = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: Lesson[];
};
type Quiz = {
  id: string;
  moduleId: string | null;
  title: string;
  status: string;
  _count: { questions: number; attempts: number };
};
export function CourseBuilder({ courseId }: { courseId?: string }) {
  const router = useRouter(),
    [grades, setGrades] = useState<Grade[]>([]),
    [subjects, setSubjects] = useState<Subject[]>([]),
    [course, setCourse] = useState<Course | null>(null),
    [modules, setModules] = useState<Module[]>([]),
    [quizzes, setQuizzes] = useState<Quiz[]>([]),
    [gradeId, setGradeId] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    void clientApi<{ data: { grades: Grade[] } }>('/grades').then((x) => setGrades(x.data.grades));
    if (courseId)
      void clientApi<{ data: { course: Course } }>(`/courses/${courseId}/admin`).then((x) => {
        setCourse(x.data.course);
        setGradeId(x.data.course.gradeId);
      });
  }, [courseId]);
  async function loadQuizzes() {
    if (!courseId) return;
    const result = await clientApi<{ data: { quizzes: Quiz[] } }>(
      `/admin/courses/${courseId}/quizzes`,
    );
    setQuizzes(result.data.quizzes);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);
  useEffect(() => {
    if (!gradeId) return;
    void clientApi<{ data: { subjects: Subject[] } }>(`/subjects?gradeId=${gradeId}`).then((x) =>
      setSubjects(x.data.subjects),
    );
  }, [gradeId]);
  async function loadModules() {
    if (!courseId) return;
    const x = await clientApi<{ data: { modules: Omit<Module, 'lessons'>[] } }>(
      `/courses/${courseId}/modules`,
    );
    const full = await Promise.all(
      x.data.modules.map(async (m) => ({
        ...m,
        lessons: (await clientApi<{ data: { lessons: Lesson[] } }>(`/modules/${m.id}/lessons`)).data
          .lessons,
      })),
    );
    setModules(full);
  }
  useEffect(() => {
    // Loading the complete nested editor model is an intentional one-time synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const body = { ...f, price: Number(f.price), accessDurationDays: Number(f.accessDurationDays) };
    const x = await clientApi<{ data: { course: Course } }>(
      courseId ? `/courses/${courseId}` : '/courses',
      { method: courseId ? 'PATCH' : 'POST', body: JSON.stringify(body) },
    );
    setMessage('تم حفظ المساق.');
    if (!courseId) router.replace(`/admin/courses/${x.data.course.id}`);
  }
  async function addModule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!courseId) return;
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await clientApi(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify({
        title: f.title,
        description: f.description,
        sortOrder: modules.length + 1,
      }),
    });
    e.currentTarget.reset();
    await loadModules();
  }
  async function addLesson(e: FormEvent<HTMLFormElement>, moduleId: string, count: number) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await clientApi(`/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({
        title: f.title,
        type: f.type,
        textContent: f.type === 'TEXT' ? f.textContent : undefined,
        isFree: false,
        isRequired: true,
        sortOrder: count + 1,
      }),
    });
    e.currentTarget.reset();
    await loadModules();
  }
  async function uploadAttachment(e: FormEvent<HTMLFormElement>, lessonId: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await clientApi(`/lessons/${lessonId}/attachments`, { method: 'POST', body: form });
    e.currentTarget.reset();
    setMessage('تم رفع المرفق وحفظه بشكل خاص.');
  }
  async function uploadVideo(e: FormEvent<HTMLFormElement>, lessonId: string) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('video') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const session = await clientApi<{ data: { uploadUrl: string } }>(`/lessons/${lessonId}/video`, {
      method: 'POST',
      body: JSON.stringify({ maxDurationSeconds: 36000 }),
    });
    if (session.data.uploadUrl.includes('localhost.invalid')) {
      setMessage('تم إنشاء جلسة فيديو محلية. الرفع الفعلي ينتظر بيانات Cloudflare Stream.');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(session.data.uploadUrl, { method: 'POST', body });
    if (!response.ok) throw new Error('تعذّر رفع الفيديو إلى المزوّد');
    setMessage('تم إرسال الفيديو للمعالجة.');
  }
  async function addQuiz(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await clientApi('/quizzes', {
      method: 'POST',
      body: JSON.stringify({
        moduleId: f.moduleId,
        title: f.title,
        passingScore: 60,
        maxAttempts: 3,
        status: 'DRAFT',
      }),
    });
    e.currentTarget.reset();
    await loadQuizzes();
  }
  async function addQuestion(e: FormEvent<HTMLFormElement>, quiz: Quiz) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await clientApi(`/quizzes/${quiz.id}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'MCQ',
        prompt: f.prompt,
        points: 1,
        sortOrder: quiz._count.questions + 1,
        options: [
          { text: f.correct, isCorrect: true, sortOrder: 1 },
          { text: f.wrong1, isCorrect: false, sortOrder: 2 },
          { text: f.wrong2, isCorrect: false, sortOrder: 3 },
        ],
      }),
    });
    e.currentTarget.reset();
    await loadQuizzes();
  }
  async function drop(event: DragEvent, at: number) {
    const from = Number(event.dataTransfer.getData('text/module-index'));
    if (!Number.isInteger(from) || from === at || !courseId) return;
    const next = [...modules];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(at, 0, moved);
    const reordered = next.map((m, i) => ({ ...m, sortOrder: i + 1 }));
    setModules(reordered);
    await clientApi(`/courses/${courseId}/modules/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ items: reordered.map((m) => ({ id: m.id, sortOrder: m.sortOrder })) }),
    });
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">محرّر المساق</p>
        <h1>{courseId ? 'تحرير المساق' : 'مساق جديد'}</h1>
      </header>
      <form className="panel-form course-form" onSubmit={save}>
        <label>
          الصف
          <select
            name="gradeId"
            required
            value={gradeId || course?.gradeId || ''}
            onChange={(e) => setGradeId(e.target.value)}
          >
            <option value="">اختر</option>
            {grades.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          المادة
          <select name="subjectId" required defaultValue={course?.subjectId ?? ''}>
            <option value="">اختر</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          العنوان
          <input name="title" required defaultValue={course?.title} />
        </label>
        <label>
          الرابط المختصر
          <input name="slug" dir="ltr" defaultValue={course?.slug} />
        </label>
        <label className="wide">
          الوصف
          <textarea name="description" required defaultValue={course?.description} />
        </label>
        <label>
          السعر
          <input name="price" type="number" min="0" defaultValue={course?.price ?? 0} />
        </label>
        <label>
          مدة الوصول بالأيام
          <input
            name="accessDurationDays"
            type="number"
            defaultValue={course?.accessDurationDays ?? 365}
          />
        </label>
        <label>
          الحالة
          <select name="status" defaultValue={course?.status ?? 'DRAFT'}>
            <option value="DRAFT">مسودة</option>
            <option value="PUBLISHED">منشور</option>
            <option value="ARCHIVED">مؤرشف</option>
          </select>
        </label>
        <button className="primary-button">حفظ المساق</button>
        {message && <p>{message}</p>}
      </form>
      {courseId && (
        <>
          <section className="builder-section">
            <div className="dashboard-section-title">
              <h2>الوحدات والدروس</h2>
              <small>اسحب الوحدة لإعادة ترتيبها</small>
            </div>
            <form className="inline-form" onSubmit={addModule}>
              <input name="title" required placeholder="عنوان وحدة جديدة" />
              <input name="description" placeholder="وصف مختصر" />
              <button>إضافة وحدة</button>
            </form>
            <div className="module-builder">
              {modules.map((m, index) => (
                <article
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/module-index', String(index))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => void drop(e, index)}
                  key={m.id}
                >
                  <span className="drag-handle">⋮⋮</span>
                  <h3>{m.title}</h3>
                  <ul>
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <div>
                          <strong>{l.title}</strong>
                          <small>{l.type}</small>
                        </div>
                        <div className="lesson-upload-tools">
                          <form onSubmit={(event) => void uploadAttachment(event, l.id)}>
                            <input name="title" required placeholder="اسم المرفق" />
                            <input name="sortOrder" type="hidden" value="0" />
                            <input
                              name="file"
                              type="file"
                              accept="application/pdf,image/png,image/jpeg,image/webp"
                              required
                            />
                            <button>رفع مرفق</button>
                          </form>
                          {l.type === 'VIDEO' && (
                            <form onSubmit={(event) => void uploadVideo(event, l.id)}>
                              <input name="video" type="file" accept="video/*" required />
                              <button>رفع الفيديو</button>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="inline-form"
                    onSubmit={(e) => void addLesson(e, m.id, m.lessons.length)}
                  >
                    <input name="title" required placeholder="عنوان الدرس" />
                    <select name="type">
                      <option value="VIDEO">فيديو</option>
                      <option value="TEXT">نصي</option>
                      <option value="PDF">ملف</option>
                    </select>
                    <input name="textContent" placeholder="المحتوى النصي عند الحاجة" />
                    <button>إضافة درس</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
          <section className="builder-section">
            <h2>الاختبارات والأسئلة</h2>
            <form className="inline-form" onSubmit={addQuiz}>
              <select name="moduleId" required>
                <option value="">اختر الوحدة</option>
                {modules.map((module) => (
                  <option value={module.id} key={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
              <input name="title" required placeholder="عنوان الاختبار" />
              <button>إضافة اختبار</button>
            </form>
            <div className="module-builder">
              {quizzes.map((quiz) => (
                <article key={quiz.id}>
                  <h3>{quiz.title}</h3>
                  <small>
                    {quiz.status} · {quiz._count.questions} أسئلة · {quiz._count.attempts} محاولات
                  </small>
                  <form
                    className="inline-form quiz-question-form"
                    onSubmit={(event) => void addQuestion(event, quiz)}
                  >
                    <input name="prompt" required placeholder="نص سؤال اختيار من متعدد" />
                    <input name="correct" required placeholder="الإجابة الصحيحة" />
                    <input name="wrong1" required placeholder="خيار خاطئ ١" />
                    <input name="wrong2" required placeholder="خيار خاطئ ٢" />
                    <button>إضافة السؤال</button>
                  </form>
                  {quiz.status === 'DRAFT' && quiz._count.questions > 0 && (
                    <button
                      className="text-button"
                      onClick={() =>
                        void clientApi(`/quizzes/${quiz.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'PUBLISHED' }),
                        }).then(loadQuizzes)
                      }
                    >
                      نشر الاختبار
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
