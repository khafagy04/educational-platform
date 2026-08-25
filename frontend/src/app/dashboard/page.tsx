'use client';

import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  LoaderCircle,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { clientApi } from '@/lib/client-api';
import styles from './dashboard.module.css';

type Home = {
  stats: {
    overallCompletionPct: number;
    totalLearningHours: number;
    certificatesCount: number;
    enrolledCoursesCount: number;
  };
  weeklyActivity: { activityDate: string; watchedSeconds: number }[];
  continueLearning: {
    course: { id: string; title: string };
    lastProgress: { progressPct: string } | null;
  }[];
  recommended: { id: string; title: string; slug: string }[];
  recentlyViewed: { course: { id: string; title: string; slug: string } }[];
};

type WeekDay = {
  key: string;
  shortLabel: string;
  fullLabel: string;
  watchedSeconds: number;
};

function clampPercent(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : 0;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildWeekActivity(activity: Home['weeklyActivity']): WeekDay[] {
  const secondsByDate = new Map<string, number>();

  for (const item of activity) {
    const dateKey = item.activityDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (!dateKey) continue;
    const seconds = Number.isFinite(item.watchedSeconds) ? Math.max(0, item.watchedSeconds) : 0;
    secondsByDate.set(dateKey, (secondsByDate.get(dateKey) ?? 0) + seconds);
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = localDateKey(date);
    return {
      key,
      shortLabel: date.toLocaleDateString('ar-EG', { weekday: 'short' }),
      fullLabel: date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      watchedSeconds: secondsByDate.get(key) ?? 0,
    };
  });
}

function LearningTrail({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg className={styles.learningTrail} viewBox="0 0 620 260" aria-hidden="true">
      <motion.path
        d="M44 217 C119 151 169 244 249 166 S382 45 469 111 S544 112 588 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="7 10"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 1.15, ease: 'easeInOut' }}
      />
      <circle cx="44" cy="217" r="9" />
      <circle cx="249" cy="166" r="9" />
      <circle cx="469" cy="111" r="9" />
      <circle cx="588" cy="44" r="9" />
    </svg>
  );
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' as const } },
};

export default function DashboardHome() {
  const shouldReduceMotion = useReducedMotion();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void clientApi<{ data: Home }>('/dashboard/student/home', { signal: controller.signal })
      .then((response) => setHome(response.data))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'تعذّر تحميل دفتر التعلّم. حاول مرة أخرى.',
        );
      });

    return () => controller.abort();
  }, [requestKey]);

  const weekActivity = useMemo(() => (home ? buildWeekActivity(home.weeklyActivity) : []), [home]);

  if (error) {
    return (
      <section className={styles.statePanel} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">
          <RefreshCw size={24} />
        </span>
        <div>
          <h1>لم يصل ملخصك بعد</h1>
          <p>{error}</p>
        </div>
        <button
          className={styles.retryButton}
          type="button"
          onClick={() => {
            setError('');
            setHome(null);
            setRequestKey((key) => key + 1);
          }}
        >
          <RefreshCw size={17} aria-hidden="true" />
          أعد المحاولة
        </button>
      </section>
    );
  }

  if (!home) {
    return (
      <section className={styles.statePanel} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.stateIcon} aria-hidden="true">
          <LoaderCircle className={styles.loader} size={25} />
        </span>
        <div>
          <h1>نرتّب دفترك</h1>
          <p>نجمع آخر تقدّمك وخطوتك التالية…</p>
        </div>
      </section>
    );
  }

  const completion = clampPercent(home.stats.overallCompletionPct);
  const leadCourse = home.continueLearning[0];
  const leadProgress = clampPercent(leadCourse?.lastProgress?.progressPct);
  const remainingCourses = home.continueLearning.slice(1, 4);
  const maxWatchedSeconds = Math.max(1, ...weekActivity.map((day) => day.watchedSeconds));
  const weeklyMinutes = Math.round(
    weekActivity.reduce((total, day) => total + day.watchedSeconds, 0) / 60,
  );
  const todayLabel = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <motion.div
      className={styles.page}
      variants={listVariants}
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
    >
      <motion.header className={styles.intro} variants={itemVariants}>
        <div>
          <span className={styles.eyebrow}>مساحة المذاكرة · {todayLabel}</span>
          <h1>مكانك محفوظ. نكمل من آخر سطر؟</h1>
          <p>ابدأ بخطوة واحدة واضحة؛ دفترك سيتكفّل بالباقي.</p>
        </div>
        <Link className={styles.browseLink} href="/dashboard/courses">
          <BookOpenCheck size={18} aria-hidden="true" />
          اختر ما ستكمله
        </Link>
      </motion.header>

      <motion.section
        className={styles.overviewGrid}
        variants={itemVariants}
        aria-label="ملخص التعلّم"
      >
        <article className={styles.continueCard}>
          <LearningTrail reducedMotion={Boolean(shouldReduceMotion)} />
          <div className={styles.continueContent}>
            <span className={styles.nextBadge}>
              <Play size={14} fill="currentColor" aria-hidden="true" />
              خطوتك التالية
            </span>
            {leadCourse ? (
              <>
                <div className={styles.continueCopy}>
                  <p>آخر مساق فتحته</p>
                  <h2>{leadCourse.course.title}</h2>
                </div>
                <div
                  className={styles.courseProgress}
                  role="progressbar"
                  aria-label={`تقدّمك في ${leadCourse.course.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={leadProgress}
                >
                  <div className={styles.progressLabels}>
                    <span>المسار المكتمل</span>
                    <strong>{leadProgress.toLocaleString('ar-EG')}٪</strong>
                  </div>
                  <span className={styles.progressTrack}>
                    <motion.span
                      initial={shouldReduceMotion ? false : { scaleX: 0 }}
                      animate={{ scaleX: leadProgress / 100 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: 0.2 }}
                    />
                  </span>
                </div>
                <Link
                  className={styles.continueAction}
                  href={`/dashboard/courses/${leadCourse.course.id}`}
                >
                  أكمل من آخر نقطة
                  <ArrowLeft size={18} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <div className={styles.emptyContinue}>
                <h2>اختر أول سطر في مسارك</h2>
                <p>لا توجد دروس معلّقة الآن. افتح مساقاتك وحدد ما تريد البدء به.</p>
                <Link className={styles.continueAction} href="/dashboard/courses">
                  افتح مساقاتي
                  <ArrowLeft size={18} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </article>

        <aside className={styles.pulsePanel} aria-label="نبض تقدّمك">
          <div className={styles.pulseHeading}>
            <span>
              <Sparkles size={17} aria-hidden="true" />
              نبض تقدّمك
            </span>
            <small>من كل مساقاتك</small>
          </div>
          <div
            className={styles.progressRing}
            style={{ '--completion': `${completion * 3.6}deg` } as CSSProperties}
            role="progressbar"
            aria-label="نسبة التقدّم الكلي"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
          >
            <span>
              <strong>{completion.toLocaleString('ar-EG')}٪</strong>
              <small>مكتمل</small>
            </span>
          </div>
          <dl className={styles.metrics}>
            <div>
              <dt>
                <Clock3 size={17} aria-hidden="true" />
                ساعات التعلّم
              </dt>
              <dd>{home.stats.totalLearningHours.toLocaleString('ar-EG')}</dd>
            </div>
            <div>
              <dt>
                <BookOpenCheck size={17} aria-hidden="true" />
                المساقات
              </dt>
              <dd>{home.stats.enrolledCoursesCount.toLocaleString('ar-EG')}</dd>
            </div>
            <div>
              <dt>
                <Award size={17} aria-hidden="true" />
                الشهادات
              </dt>
              <dd>{home.stats.certificatesCount.toLocaleString('ar-EG')}</dd>
            </div>
          </dl>
        </aside>
      </motion.section>

      <motion.section className={styles.learningGrid} variants={itemVariants}>
        <article className={styles.weekPanel} aria-labelledby="weekly-activity-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionIcon} aria-hidden="true">
                <CalendarDays size={19} />
              </span>
              <div>
                <p>آخر سبعة أيام</p>
                <h2 id="weekly-activity-title">إيقاع مذاكرتك</h2>
              </div>
            </div>
            <strong>{weeklyMinutes.toLocaleString('ar-EG')} دقيقة</strong>
          </div>
          <div className={styles.activityChart}>
            {weekActivity.map((day) => {
              const height = day.watchedSeconds
                ? Math.max(14, (day.watchedSeconds / maxWatchedSeconds) * 100)
                : 7;
              const minutes = Math.round(day.watchedSeconds / 60);
              return (
                <div
                  className={styles.activityDay}
                  key={day.key}
                  role="img"
                  aria-label={`${day.fullLabel}: ${minutes.toLocaleString('ar-EG')} دقيقة`}
                >
                  <span className={styles.activityValue} aria-hidden="true">
                    {minutes > 0 ? minutes.toLocaleString('ar-EG') : '—'}
                  </span>
                  <span className={styles.activityRail} aria-hidden="true">
                    <motion.span
                      initial={shouldReduceMotion ? false : { height: '7%' }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: 0.16 }}
                    />
                  </span>
                  <small aria-hidden="true">{day.shortLabel}</small>
                </div>
              );
            })}
          </div>
        </article>

        <article className={styles.nextPanel} aria-labelledby="next-steps-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionIcon} aria-hidden="true">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <p>بعد خطوتك الحالية</p>
                <h2 id="next-steps-title">على خطّك</h2>
              </div>
            </div>
          </div>
          {remainingCourses.length > 0 ? (
            <ol className={styles.nextList}>
              {remainingCourses.map((item, index) => {
                const progress = clampPercent(item.lastProgress?.progressPct);
                return (
                  <li key={item.course.id}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {(index + 2).toLocaleString('ar-EG')}
                    </span>
                    <div>
                      <small>{progress.toLocaleString('ar-EG')}٪ مكتمل</small>
                      <strong>{item.course.title}</strong>
                    </div>
                    <Link
                      href={`/dashboard/courses/${item.course.id}`}
                      aria-label={`متابعة ${item.course.title}`}
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles.nextEmpty}>
              <CheckCircle2 size={24} aria-hidden="true" />
              <p>خطّك واضح الآن. أكمل الدرس الحالي ثم سنرتّب الخطوة التالية.</p>
            </div>
          )}
        </article>
      </motion.section>

      {home.recommended.length > 0 && (
        <motion.section className={styles.recommendedSection} variants={itemVariants}>
          <div className={styles.recommendedHeading}>
            <div>
              <span>اختيارات مبنية على مسارك</span>
              <h2>قد يناسبك بعد ذلك</h2>
            </div>
            <Link href="/courses">
              كل المساقات
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.recommendedGrid}>
            {home.recommended.slice(0, 3).map((course, index) => (
              <Link
                className={styles.recommendedCard}
                data-tone={index + 1}
                href={`/courses/${encodeURIComponent(course.slug)}`}
                key={course.id}
              >
                <span className={styles.recommendedIcon} aria-hidden="true">
                  <Sparkles size={19} />
                </span>
                <small>مقترح لمسارك</small>
                <strong>{course.title}</strong>
                <span className={styles.cardAction}>
                  اعرف أكثر
                  <ArrowLeft size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
