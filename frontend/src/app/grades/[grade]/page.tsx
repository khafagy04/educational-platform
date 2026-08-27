import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { apiGet, type Course, type Grade } from '@/lib/api';

export default async function GradePage({ params }: { params: Promise<{ grade: string }> }) {
  const { grade } = await params;
  const grades = await apiGet<{ data: { grades: Grade[] } }>('/grades', { data: { grades: [] } });
  const selected = grades.data.grades.find((item) => item.id === grade || item.slug === grade);
  const query = selected ? `?gradeId=${selected.id}&pageSize=50` : '?pageSize=50';
  const courses = await apiGet<{ data: { courses: Course[] } }>(`/courses${query}`, {
    data: { courses: [] },
  });
  return (
    <main>
      <SiteHeader />
      <section className="listing-hero">
        <p className="section-kicker">دليل الدروس</p>
        <h1>{selected?.name ?? 'كل المراحل'}</h1>
        <p>اختر المساق الذي يطابق منهجك، ثم راجع تفاصيله قبل الاشتراك.</p>
      </section>
      <section className="content-section">
        <div className="grade-chips">
          <Link href="/grades/all">الكل</Link>
          {grades.data.grades.map((item) => (
            <Link
              className={selected?.id === item.id ? 'active' : ''}
              href={`/grades/${item.id}`}
              key={item.id}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="course-grid">
          {courses.data.courses.map((course) => (
            <Link className="course-card" href={`/courses/${course.slug}`} key={course.id}>
              <span>{course.subject?.name ?? 'مادة دراسية'}</span>
              <h2>{course.title}</h2>
              <p>{course.description.slice(0, 150)}</p>
              <b>{Number(course.price) === 0 ? 'مجاني' : `${course.price} ${course.currency}`}</b>
            </Link>
          ))}
        </div>
        {courses.data.courses.length === 0 && (
          <div className="empty-state">
            <h2>لا توجد مساقات منشورة هنا بعد</h2>
            <p>اختر مرحلة أخرى أو عد لاحقاً بعد نشر المحتوى الجديد.</p>
          </div>
        )}
      </section>
    </main>
  );
}
