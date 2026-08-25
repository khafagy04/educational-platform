'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  TimerReset,
  Triangle,
  Variable,
  type LucideIcon,
} from 'lucide-react';
import type { Course } from '@/lib/api';
import styles from '@/app/home.module.css';

const visuals: { Icon: LucideIcon; className: string; code: string }[] = [
  { Icon: Variable, className: styles.courseVisualBlue, code: 'س + ص' },
  { Icon: Triangle, className: styles.courseVisualCoral, code: '∠ 90°' },
  { Icon: TimerReset, className: styles.courseVisualMango, code: 'خطّة' },
];

export function HomeCourseShowcase({ courses }: { courses: Course[] }) {
  const grades = useMemo(
    () =>
      Array.from(new Set(courses.map((course) => course.grade?.name).filter(Boolean))) as string[],
    [courses],
  );
  const [grade, setGrade] = useState<string>('all');
  const reduceMotion = useReducedMotion();
  const visibleCourses =
    grade === 'all' ? courses : courses.filter((course) => course.grade?.name === grade);

  if (courses.length === 0) {
    return (
      <div className={styles.courseEmpty}>
        <BookOpen aria-hidden="true" />
        <h3>المساقات تُرتّب الآن</h3>
        <p>افتح صفحة المساقات لترى كل ما أصبح متاحاً.</p>
        <Link href="/courses">
          عرض المساقات <ArrowLeft aria-hidden="true" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.gradeTabs} role="group" aria-label="تصفية المساقات حسب الصف">
        <button type="button" aria-pressed={grade === 'all'} onClick={() => setGrade('all')}>
          كل الصفوف
        </button>
        {grades.slice(0, 4).map((name) => (
          <button
            type="button"
            aria-pressed={grade === name}
            onClick={() => setGrade(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      <motion.div className={styles.courseGrid} layout aria-live="polite">
        <AnimatePresence mode="popLayout">
          {visibleCourses.slice(0, 6).map((course, index) => {
            const visual = visuals[index % visuals.length];
            const moduleCount = course.modules?.length ?? 0;
            return (
              <motion.article
                className={styles.courseCard}
                key={course.id}
                layout
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <div className={`${styles.courseVisual} ${visual.className}`}>
                  <span className={styles.courseTag}>{course.grade?.name ?? 'مساق مدرسي'}</span>
                  <span className={styles.courseIcon}>
                    <visual.Icon aria-hidden="true" />
                  </span>
                  <span className={styles.courseCode}>{visual.code}</span>
                </div>
                <div className={styles.courseBody}>
                  <small>{course.subject?.name ?? 'منهج منظم'}</small>
                  <h3>{course.title}</h3>
                  <p>{course.description.slice(0, 120)}</p>
                  <div className={styles.courseMeta}>
                    <span>
                      <BookOpen aria-hidden="true" size={14} />{' '}
                      {moduleCount > 0 ? `${moduleCount} وحدات` : 'مسار متدرّج'}
                    </span>
                    <span>
                      <Clock3 aria-hidden="true" size={14} /> وصول{' '}
                      {course.accessDurationDays ?? 365} يوم
                    </span>
                  </div>
                  <Link href={`/courses/${course.slug}`}>
                    اعرف تفاصيل المساق <ArrowLeft aria-hidden="true" size={16} />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
