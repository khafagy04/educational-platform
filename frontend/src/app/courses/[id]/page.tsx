import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { apiGet, type Course } from '@/lib/api';

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await apiGet<{ data: { course: Course | null } }>(
    `/courses/slug/${encodeURIComponent(id)}`,
    { data: { course: null } },
  );
  const course = response.data.course;
  if (!course) notFound();
  return (
    <main>
      <SiteHeader />
      <section className="course-detail">
        <div>
          <p className="section-kicker">
            {course.grade?.name ?? 'مساق مدرسي'} · {course.subject?.name ?? 'منهج منظم'}
          </p>
          <h1>{course.title}</h1>
          <p className="lede">{course.description}</p>
          <div className="course-facts">
            <span>وصول لمدة {course.accessDurationDays ?? 365} يوماً</span>
            <span>{course.modules?.length ?? 0} وحدات</span>
          </div>
        </div>
        <aside className="enroll-card">
          <small>قيمة الاشتراك</small>
          <strong>
            {Number(course.price) === 0 ? 'مجاني' : `${course.price} ${course.currency}`}
          </strong>
          <Link className="primary-button" href="/register">
            ابدأ التعلّم ←
          </Link>
          <p>الدفع لا يفعّل الاشتراك إلا بعد التأكيد الآمن.</p>
        </aside>
      </section>
      <section className="content-section syllabus">
        <p className="section-kicker">خريطة المساق</p>
        <h2>ما الذي ستتعلّمه؟</h2>
        {course.modules?.map((module, index) => (
          <article key={module.id}>
            <b>{String(index + 1).padStart(2, '0')}</b>
            <div>
              <h3>{module.title}</h3>
              <p>
                {module.lessons.map((lesson) => lesson.title).join(' · ') || 'تُضاف الدروس قريباً'}
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
