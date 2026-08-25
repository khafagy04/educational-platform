'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { apiBase, type Course, type Grade } from '@/lib/api';
type Subject = { id: string; name: string };
export default function Catalog() {
  const [courses, setCourses] = useState<Course[]>([]),
    [grades, setGrades] = useState<Grade[]>([]),
    [subjects, setSubjects] = useState<Subject[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [gradeId, setGradeId] = useState(''),
    [subjectId, setSubjectId] = useState(''),
    [pricing, setPricing] = useState('all'),
    [sort, setSort] = useState('newest');
  useEffect(() => {
    void fetch(`${apiBase}/grades`)
      .then((r) => r.json())
      .then((x) => setGrades(x.data.grades));
  }, []);
  useEffect(() => {
    if (!gradeId) return;
    void fetch(`${apiBase}/subjects?gradeId=${gradeId}`)
      .then((r) => r.json())
      .then((x) => setSubjects(x.data.subjects));
  }, [gradeId]);
  useEffect(() => {
    const q = new URLSearchParams({ page: String(page), pageSize: '12', search, pricing, sort });
    if (gradeId) q.set('gradeId', gradeId);
    if (subjectId) q.set('subjectId', subjectId);
    void fetch(`${apiBase}/courses?${q}`)
      .then((r) => r.json())
      .then((x) => {
        setCourses(x.data.courses);
        setTotal(x.data.total);
      });
  }, [page, search, gradeId, subjectId, pricing, sort]);
  return (
    <main>
      <SiteHeader />
      <section className="listing-hero">
        <p className="section-kicker">دليل مِداد</p>
        <h1>ابحث عن المساق المناسب.</h1>
      </section>
      <section className="catalog-layout">
        <aside className="catalog-filters">
          <label>
            بحث
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="العنوان أو الوصف"
            />
          </label>
          <label>
            الصف
            <select
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSubjectId('');
                if (!e.target.value) setSubjects([]);
                setPage(1);
              }}
            >
              <option value="">كل الصفوف</option>
              {grades.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المادة
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">كل المواد</option>
              {subjects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            السعر
            <select
              value={pricing}
              onChange={(e) => {
                setPricing(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">الكل</option>
              <option value="free">مجاني</option>
              <option value="paid">مدفوع</option>
            </select>
          </label>
          <label>
            الترتيب
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">الأحدث</option>
              <option value="price-asc">السعر: الأقل</option>
              <option value="price-desc">السعر: الأعلى</option>
              <option value="popularity">الأكثر مشاهدة</option>
            </select>
          </label>
        </aside>
        <div>
          <p>{total} مساق</p>
          <div className="course-grid">
            {courses.map((x) => (
              <Link className="course-card" href={`/courses/${x.slug}`} key={x.id}>
                <span>{x.subject?.name}</span>
                <h2>{x.title}</h2>
                <p>{x.description.slice(0, 130)}</p>
                <b>{Number(x.price) === 0 ? 'مجاني' : `${x.price} ${x.currency}`}</b>
              </Link>
            ))}
          </div>
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage((x) => x - 1)}>
              السابق
            </button>
            <span>{page}</span>
            <button disabled={page * 12 >= total} onClick={() => setPage((x) => x + 1)}>
              التالي
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
