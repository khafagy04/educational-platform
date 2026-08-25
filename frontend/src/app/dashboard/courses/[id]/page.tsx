'use client';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  CirclePlay,
  Clock3,
  Download,
  FileQuestion,
  FileText,
  ListVideo,
  LoaderCircle,
  NotebookPen,
  Play,
  RefreshCw,
  Save,
  TriangleAlert,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { clientApi } from '@/lib/client-api';
import styles from './player.module.css';

type Attachment = {
  id: string;
  title: string;
  mimeType: string;
};

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  textContent: string | null;
  durationSec: number | null;
  attachments: Attachment[];
  quiz: { id: string; title: string } | null;
  video: { status: string; durationSec?: number | null } | null;
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
  quizzes: { id: string; title: string }[];
};

type LessonProgress = {
  progressPct: string;
  completed: boolean;
  lastPositionSec: number;
  watchedSeconds?: number;
};

type Player = {
  enrollment: { course: { id: string; title: string; modules: Module[] } };
  progressByLesson: Record<string, LessonProgress>;
};

type ProgressInput = {
  progressPct: number;
  lastPositionSec: number;
  watchedSeconds: number;
  completed: boolean;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const numberFormatter = new Intl.NumberFormat('ar-EG');

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds < 1) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${numberFormatter.format(minutes)}:${String(remainder).padStart(2, '0')}`;
}

function formatPosition(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${numberFormatter.format(minutes)}:${String(remainder).padStart(2, '0')}`;
}

function lessonTypeLabel(type: string) {
  return (
    {
      VIDEO: 'درس فيديو',
      TEXT: 'درس قراءة',
      PDF: 'ملف ومرفقات',
      QUIZ: 'اختبار قصير',
    }[type] ?? 'درس'
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function initialLessonFor(player: Player) {
  const lessons = player.enrollment.course.modules.flatMap((module) => module.lessons);
  return (
    lessons.find((item) => {
      const progress = player.progressByLesson[item.id];
      return progress && !progress.completed && Number(progress.progressPct) > 0;
    }) ??
    lessons.find((item) => !player.progressByLesson[item.id]?.completed) ??
    lessons[0] ??
    null
  );
}

function readLocalNote(courseId: string, lessonId: string | null) {
  if (!lessonId) return { value: '', state: 'idle' as const };
  try {
    return {
      value: localStorage.getItem(`midad:lesson-note:${courseId}:${lessonId}`) ?? '',
      state: 'idle' as const,
    };
  } catch {
    return { value: '', state: 'error' as const };
  }
}

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<Player | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [playback, setPlayback] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [requestingVideo, setRequestingVideo] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState(0);
  const [visibleProgress, setVisibleProgress] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState<'idle' | 'saved' | 'error'>('idle');

  const selectedRef = useRef<string | null>(null);
  const progressQueueRef = useRef<Promise<void>>(Promise.resolve());
  const autoSavePendingRef = useRef(false);
  const lastAutoSavePositionRef = useRef(0);
  const lastAutoSaveWatchedSecondsRef = useRef(0);
  const watchedSecondsRef = useRef(0);
  const lastObservedVideoPositionRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    void clientApi<{ data: Player }>(`/me/courses/${id}/player`)
      .then((response) => {
        if (cancelled) return;
        const player = response.data;
        const firstLesson = initialLessonFor(player);
        const firstLessonId = firstLesson?.id ?? null;
        const progress = firstLessonId ? player.progressByLesson[firstLessonId] : undefined;
        const savedPosition = progress?.lastPositionSec ?? 0;
        const storedNote = readLocalNote(id, firstLessonId);

        selectedRef.current = firstLessonId;
        setData(player);
        setSelected(firstLessonId);
        setPositionSec(savedPosition);
        setVisibleProgress(Number(progress?.progressPct ?? 0));
        setVideoDurationSec(firstLesson?.durationSec ?? firstLesson?.video?.durationSec ?? 0);
        setSaveState('idle');
        setSaveError('');
        setNote(storedNote.value);
        setNoteState(storedNote.state);
        lastAutoSavePositionRef.current = savedPosition;
        lastAutoSaveWatchedSecondsRef.current = progress?.watchedSeconds ?? 0;
        watchedSecondsRef.current = progress?.watchedSeconds ?? 0;
        lastObservedVideoPositionRef.current = null;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(errorMessage(error, 'تعذّر فتح المساق. تحقق من اتصالك وحاول مرة أخرى.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, retryKey]);

  const allLessons = useMemo(
    () => data?.enrollment.course.modules.flatMap((module) => module.lessons) ?? [],
    [data],
  );

  const lesson = useMemo(
    () => allLessons.find((item) => item.id === selected) ?? null,
    [allLessons, selected],
  );

  const lessonProgress = selected ? data?.progressByLesson[selected] : undefined;
  const lessonDuration = lesson?.durationSec ?? lesson?.video?.durationSec ?? 0;
  const lessonIndex = lesson ? allLessons.findIndex((item) => item.id === lesson.id) : -1;
  const previousLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 ? (allLessons[lessonIndex + 1] ?? null) : null;

  const courseProgress = useMemo(() => {
    if (allLessons.length === 0 || !data) return 0;
    const total = allLessons.reduce(
      (sum, item) => sum + Number(data.progressByLesson[item.id]?.progressPct ?? 0),
      0,
    );
    return Math.round(total / allLessons.length);
  }, [allLessons, data]);

  const completedLessons = useMemo(
    () => allLessons.filter((item) => data?.progressByLesson[item.id]?.completed).length,
    [allLessons, data],
  );

  const queueProgress = useCallback((lessonId: string, input: ProgressInput, quiet = false) => {
    const task = progressQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (!quiet && selectedRef.current === lessonId) {
          setSaveState('saving');
          setSaveError('');
        }

        try {
          const response = await clientApi<{ data: { progress: LessonProgress } }>(
            `/lessons/${lessonId}/progress`,
            {
              method: 'POST',
              body: JSON.stringify(input),
            },
          );
          const savedProgress = response.data.progress;

          setData((current) => {
            if (!current) return current;
            return {
              ...current,
              progressByLesson: {
                ...current.progressByLesson,
                [lessonId]: {
                  progressPct: String(savedProgress.progressPct),
                  completed: savedProgress.completed,
                  lastPositionSec: savedProgress.lastPositionSec,
                  watchedSeconds: savedProgress.watchedSeconds,
                },
              },
            };
          });

          if (selectedRef.current === lessonId) {
            const authoritativeWatchedSeconds = savedProgress.watchedSeconds ?? 0;
            watchedSecondsRef.current = Math.max(
              watchedSecondsRef.current,
              authoritativeWatchedSeconds,
            );
            lastAutoSaveWatchedSecondsRef.current = Math.max(
              lastAutoSaveWatchedSecondsRef.current,
              authoritativeWatchedSeconds,
            );
            setVisibleProgress(Number(savedProgress.progressPct));
            setSaveState('saved');
            setSaveError('');
          }
        } catch (error: unknown) {
          if (selectedRef.current === lessonId) {
            setSaveState('error');
            setSaveError(errorMessage(error, 'لم يُحفظ التقدّم. حاول مرة أخرى.'));
          }
        }
      });

    progressQueueRef.current = task;
    return task;
  }, []);

  function selectLesson(lessonId: string) {
    if (lessonId === selectedRef.current) {
      setOutlineOpen(false);
      return;
    }

    flushCurrentVideoProgress();
    const nextLessonData = allLessons.find((item) => item.id === lessonId);
    const progress = data?.progressByLesson[lessonId];
    const savedPosition = progress?.lastPositionSec ?? 0;
    const storedNote = readLocalNote(id, lessonId);

    selectedRef.current = lessonId;
    setSelected(lessonId);
    setPlayback('');
    setVideoError('');
    setAttachmentError('');
    setOutlineOpen(false);
    setPositionSec(savedPosition);
    setVisibleProgress(Number(progress?.progressPct ?? 0));
    setVideoDurationSec(nextLessonData?.durationSec ?? nextLessonData?.video?.durationSec ?? 0);
    setSaveState('idle');
    setSaveError('');
    setNote(storedNote.value);
    setNoteState(storedNote.state);
    lastAutoSavePositionRef.current = savedPosition;
    lastAutoSaveWatchedSecondsRef.current = progress?.watchedSeconds ?? 0;
    watchedSecondsRef.current = progress?.watchedSeconds ?? 0;
    lastObservedVideoPositionRef.current = null;
  }

  function flushCurrentVideoProgress() {
    const video = videoElementRef.current;
    const lessonId = selectedRef.current;
    if (!video || !lessonId) return;

    recordWatchedInterval(video, true);
    const input = currentProgressInput(video);
    lastAutoSavePositionRef.current = input.lastPositionSec;
    lastAutoSaveWatchedSecondsRef.current = input.watchedSeconds;
    void queueProgress(lessonId, input, true);
  }

  function retryLoad() {
    selectedRef.current = null;
    setData(null);
    setSelected(null);
    setLoadError('');
    setRetryKey((value) => value + 1);
  }

  async function requestPlayback() {
    if (!lesson || lesson.type !== 'VIDEO') return;
    setRequestingVideo(true);
    setVideoError('');
    try {
      const response = await clientApi<{ data: { playback: { url: string } } }>(
        `/lessons/${lesson.id}/video-token`,
      );
      setPlayback(response.data.playback.url);
    } catch (error: unknown) {
      setVideoError(errorMessage(error, 'تعذّر تجهيز الفيديو المحمي. حاول مرة أخرى.'));
    } finally {
      setRequestingVideo(false);
    }
  }

  async function downloadAttachment(attachmentId: string) {
    setAttachmentLoading(attachmentId);
    setAttachmentError('');
    try {
      const response = await clientApi<{ data: { download: { url: string } } }>(
        `/attachments/${attachmentId}/download`,
      );
      window.open(response.data.download.url, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      setAttachmentError(errorMessage(error, 'تعذّر تنزيل الملف. حاول مرة أخرى.'));
    } finally {
      setAttachmentLoading(null);
    }
  }

  function currentProgressInput(video: HTMLVideoElement, completed = false): ProgressInput {
    const duration = Number.isFinite(video.duration) ? video.duration : lessonDuration;
    const current = Math.min(86_400, Math.max(0, Math.floor(video.currentTime)));
    const calculatedPct = duration > 0 ? Math.min(100, Math.round((current / duration) * 100)) : 0;
    return {
      progressPct: completed ? 100 : Math.min(99, calculatedPct),
      lastPositionSec: current,
      watchedSeconds: Math.min(86_400, Math.floor(watchedSecondsRef.current)),
      completed,
    };
  }

  function recordWatchedInterval(video: HTMLVideoElement, includeFinalInterval = false) {
    const current = Math.max(0, video.currentTime);
    const previous = lastObservedVideoPositionRef.current;
    lastObservedVideoPositionRef.current = current;

    if (previous === null || video.seeking || (video.paused && !includeFinalInterval)) return;

    const mediaSeconds = current - previous;
    const largestNaturalStep = Math.max(5, 5 * Math.max(1, video.playbackRate));
    if (mediaSeconds > 0 && mediaSeconds <= largestNaturalStep) {
      watchedSecondsRef.current = Math.min(86_400, watchedSecondsRef.current + mediaSeconds);
    }
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const duration = Number.isFinite(video.duration) ? video.duration : lessonDuration;
    setVideoDurationSec(duration);
    const resumeAt = lessonProgress?.lastPositionSec ?? 0;
    if (resumeAt > 0 && duration > 1) {
      video.currentTime = Math.min(resumeAt, duration - 1);
      setPositionSec(video.currentTime);
    }
    lastObservedVideoPositionRef.current = video.currentTime;
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    if (!lesson) return;
    const video = event.currentTarget;
    recordWatchedInterval(video);
    const input = currentProgressInput(video);
    setPositionSec(input.lastPositionSec);
    setVisibleProgress((current) => Math.max(current, input.progressPct));

    if (
      (Math.abs(input.lastPositionSec - lastAutoSavePositionRef.current) >= 15 ||
        input.watchedSeconds - lastAutoSaveWatchedSecondsRef.current >= 15) &&
      !autoSavePendingRef.current
    ) {
      lastAutoSavePositionRef.current = input.lastPositionSec;
      lastAutoSaveWatchedSecondsRef.current = input.watchedSeconds;
      autoSavePendingRef.current = true;
      void queueProgress(lesson.id, input, true).finally(() => {
        autoSavePendingRef.current = false;
      });
    }
  }

  function handlePause(event: SyntheticEvent<HTMLVideoElement>) {
    if (!lesson || event.currentTarget.ended) return;
    recordWatchedInterval(event.currentTarget, true);
    const input = currentProgressInput(event.currentTarget);
    if (
      Math.abs(input.lastPositionSec - lastAutoSavePositionRef.current) < 2 &&
      input.watchedSeconds - lastAutoSaveWatchedSecondsRef.current < 2
    )
      return;
    lastAutoSavePositionRef.current = input.lastPositionSec;
    lastAutoSaveWatchedSecondsRef.current = input.watchedSeconds;
    void queueProgress(lesson.id, input, true);
  }

  function handleEnded(event: SyntheticEvent<HTMLVideoElement>) {
    if (!lesson) return;
    recordWatchedInterval(event.currentTarget, true);
    const input = currentProgressInput(event.currentTarget, true);
    lastAutoSavePositionRef.current = input.lastPositionSec;
    lastAutoSaveWatchedSecondsRef.current = input.watchedSeconds;
    void queueProgress(lesson.id, input);
  }

  function markComplete() {
    if (!lesson) return;
    const input: ProgressInput = {
      progressPct: 100,
      lastPositionSec: Math.min(86_400, Math.floor(positionSec)),
      watchedSeconds: Math.min(86_400, Math.floor(watchedSecondsRef.current)),
      completed: true,
    };
    void queueProgress(lesson.id, input);
  }

  function saveNote() {
    if (!selected) return;
    try {
      const storageKey = `midad:lesson-note:${id}:${selected}`;
      if (note.trim()) localStorage.setItem(storageKey, note);
      else localStorage.removeItem(storageKey);
      setNoteState('saved');
    } catch {
      setNoteState('error');
    }
  }

  if (loadError) {
    return (
      <main className={styles.statePage}>
        <section className={styles.statePanel} role="alert">
          <span className={styles.stateIcon}>
            <TriangleAlert aria-hidden="true" />
          </span>
          <p className={styles.eyebrow}>تعذّر فتح الدفتر</p>
          <h1>لم نصل إلى محتوى المساق.</h1>
          <p>{loadError}</p>
          <div className={styles.stateActions}>
            <button type="button" onClick={retryLoad}>
              <RefreshCw aria-hidden="true" /> حاول مرة أخرى
            </button>
            <button type="button" onClick={() => router.push('/dashboard/courses')}>
              العودة إلى مساقاتي
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={styles.statePage} aria-busy="true" aria-live="polite">
        <section className={styles.loadingPanel}>
          <LoaderCircle className={styles.spinner} aria-hidden="true" />
          <p className={styles.eyebrow}>نجهّز موضعك الأخير</p>
          <h1>جارٍ فتح المساق…</h1>
          <div className={styles.loadingLines} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.playerPage}>
      <header className={styles.topbar}>
        <button
          className={styles.iconButton}
          type="button"
          onClick={() => {
            flushCurrentVideoProgress();
            router.push('/dashboard/courses');
          }}
          aria-label="العودة إلى مساقاتي"
        >
          <ArrowRight aria-hidden="true" />
        </button>

        <div className={styles.courseIdentity}>
          <span>
            مساقاتي · {numberFormatter.format(completedLessons)} من{' '}
            {numberFormatter.format(allLessons.length)} دروس
          </span>
          <h1>{data.enrollment.course.title}</h1>
        </div>

        <div className={styles.courseProgress}>
          <div className={styles.courseProgressCopy}>
            <span>تقدّم المساق</span>
            <strong>{numberFormatter.format(courseProgress)}٪</strong>
          </div>
          <span
            className={styles.courseProgressTrack}
            role="progressbar"
            aria-label="تقدّم المساق"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={courseProgress}
          >
            <motion.span
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: courseProgress / 100 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </span>
        </div>

        <button
          className={`${styles.iconButton} ${styles.outlineToggle}`}
          type="button"
          aria-controls="course-outline"
          aria-expanded={outlineOpen}
          aria-label={outlineOpen ? 'إخفاء محتوى المساق' : 'عرض محتوى المساق'}
          onClick={() => setOutlineOpen((value) => !value)}
        >
          <ListVideo aria-hidden="true" />
        </button>
      </header>

      <div className={styles.workspace}>
        <section className={styles.lessonWorkspace}>
          <AnimatePresence mode="wait" initial={false}>
            {lesson ? (
              <motion.div
                className={styles.lessonSurface}
                key={lesson.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <header className={styles.lessonHeader}>
                  <div>
                    <p className={styles.eyebrow}>
                      {lessonTypeLabel(lesson.type)} · الدرس{' '}
                      {numberFormatter.format(lessonIndex + 1)}
                    </p>
                    <h2>{lesson.title}</h2>
                    {lesson.description && <p>{lesson.description}</p>}
                  </div>
                  <div className={styles.lessonProgressBadge}>
                    <span>{numberFormatter.format(Math.round(visibleProgress))}٪</span>
                    <small>{lessonProgress?.completed ? 'مكتمل' : 'محفوظ'}</small>
                  </div>
                </header>

                <section className={styles.mediaPanel} aria-label="محتوى الدرس">
                  {lesson.type === 'VIDEO' ? (
                    playback ? (
                      <video
                        ref={videoElementRef}
                        className={styles.video}
                        key={playback}
                        controls
                        playsInline
                        preload="metadata"
                        src={playback}
                        onLoadedMetadata={handleLoadedMetadata}
                        onPlay={(event) => {
                          lastObservedVideoPositionRef.current = event.currentTarget.currentTime;
                        }}
                        onSeeking={(event) => {
                          lastObservedVideoPositionRef.current = event.currentTarget.currentTime;
                        }}
                        onSeeked={(event) => {
                          lastObservedVideoPositionRef.current = event.currentTarget.currentTime;
                        }}
                        onTimeUpdate={handleTimeUpdate}
                        onPause={handlePause}
                        onEnded={handleEnded}
                        onError={() => {
                          setPlayback('');
                          setVideoError(
                            'انتهت صلاحية رابط الفيديو أو تعذّر تشغيله. اطلب رابطاً جديداً.',
                          );
                        }}
                      />
                    ) : (
                      <div className={styles.videoCover}>
                        <span className={styles.learningTrail} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <div className={styles.videoCoverCopy}>
                          <span className={styles.videoLessonNumber}>
                            الدرس {numberFormatter.format(lessonIndex + 1)}
                          </span>
                          <strong>{lesson.title}</strong>
                          {lessonDuration > 0 && (
                            <span className={styles.videoDuration}>
                              <Clock3 aria-hidden="true" /> {formatDuration(lessonDuration)} دقيقة
                            </span>
                          )}
                        </div>
                        {lesson.video?.status === 'READY' ? (
                          <button
                            className={styles.playButton}
                            type="button"
                            onClick={() => void requestPlayback()}
                            disabled={requestingVideo}
                          >
                            {requestingVideo ? (
                              <LoaderCircle className={styles.spinner} aria-hidden="true" />
                            ) : (
                              <Play aria-hidden="true" fill="currentColor" />
                            )}
                            <span>
                              {requestingVideo ? 'جارٍ تجهيز الرابط…' : 'تشغيل الفيديو المحمي'}
                            </span>
                          </button>
                        ) : (
                          <div className={styles.videoStatus}>
                            <Clock3 aria-hidden="true" />
                            {lesson.video?.status === 'FAILED'
                              ? 'تعذّر تجهيز الفيديو. تواصل مع الدعم.'
                              : 'الفيديو قيد التجهيز وسيظهر هنا عند اكتماله.'}
                          </div>
                        )}
                        {videoError && (
                          <div className={styles.inlineError} role="alert">
                            <TriangleAlert aria-hidden="true" />
                            <span>{videoError}</span>
                          </div>
                        )}
                      </div>
                    )
                  ) : lesson.type === 'TEXT' ? (
                    <article className={styles.textLesson}>
                      <BookOpen aria-hidden="true" />
                      <div>{lesson.textContent ?? 'لم يُضف نص الدرس بعد.'}</div>
                    </article>
                  ) : (
                    <article className={styles.documentLesson}>
                      <FileText aria-hidden="true" />
                      <strong>
                        {lesson.type === 'QUIZ' ? 'اختبار الدرس جاهز' : 'ملفات الدرس بالأسفل'}
                      </strong>
                      <p>
                        {lesson.type === 'QUIZ'
                          ? 'ابدأ الاختبار عندما تكون مستعداً؛ سيُحفظ تقييمك داخل المنصة.'
                          : 'نزّل المرفقات وافتحها، ثم سجّل إكمال الدرس عندما تنتهي.'}
                      </p>
                    </article>
                  )}
                </section>

                <div className={styles.playbackMeta}>
                  <span>
                    <CirclePlay aria-hidden="true" />
                    {playback
                      ? `${formatPosition(positionSec)} / ${formatPosition(videoDurationSec)}`
                      : lessonProgress?.lastPositionSec
                        ? `ستكمل من ${formatPosition(lessonProgress.lastPositionSec)}`
                        : 'ابدأ عندما تكون جاهزاً'}
                  </span>
                  <span className={styles.saveIndicator} data-state={saveState} role="status">
                    {saveState === 'saving' && (
                      <LoaderCircle className={styles.spinner} aria-hidden="true" />
                    )}
                    {saveState === 'saved' && <CheckCircle2 aria-hidden="true" />}
                    {saveState === 'error' && <TriangleAlert aria-hidden="true" />}
                    {saveState === 'idle' && <Save aria-hidden="true" />}
                    {saveState === 'saving'
                      ? 'جارٍ حفظ التقدّم'
                      : saveState === 'saved'
                        ? 'تم حفظ التقدّم'
                        : saveState === 'error'
                          ? saveError
                          : 'يُحفظ الفيديو تلقائياً'}
                  </span>
                </div>

                <div className={styles.lessonInfoGrid}>
                  <section className={styles.notesPanel}>
                    <div className={styles.panelHeading}>
                      <span className={styles.panelIcon}>
                        <NotebookPen aria-hidden="true" />
                      </span>
                      <div>
                        <h3>ملاحظاتي على هذا الجهاز</h3>
                        <p>تُحفظ في هذا المتصفح فقط، ولا تُرسل إلى المدرّس أو حسابك.</p>
                      </div>
                    </div>
                    <textarea
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        setNoteState('idle');
                      }}
                      placeholder="اكتب الفكرة بطريقتك، أو سجّل سؤالاً للعودة إليه…"
                      aria-label="ملاحظة محلية على الدرس"
                    />
                    <div className={styles.noteActions}>
                      <button type="button" onClick={saveNote}>
                        <Save aria-hidden="true" /> حفظ على هذا الجهاز
                      </button>
                      <span role="status">
                        {noteState === 'saved' && 'حُفظت محلياً.'}
                        {noteState === 'error' && 'تعذّر الحفظ في هذا المتصفح.'}
                      </span>
                    </div>
                  </section>

                  <section className={styles.resourcesPanel}>
                    <div className={styles.panelHeading}>
                      <span className={styles.panelIcon}>
                        <Download aria-hidden="true" />
                      </span>
                      <div>
                        <h3>ملفات الدرس</h3>
                        <p>
                          {lesson.attachments.length
                            ? `${numberFormatter.format(lesson.attachments.length)} مرفقات`
                            : 'لا توجد مرفقات لهذا الدرس.'}
                        </p>
                      </div>
                    </div>
                    {lesson.attachments.length > 0 && (
                      <div className={styles.attachmentList}>
                        {lesson.attachments.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => void downloadAttachment(item.id)}
                            disabled={attachmentLoading === item.id}
                          >
                            <span>
                              <FileText aria-hidden="true" />
                              <span>
                                <strong>{item.title}</strong>
                                <small>{item.mimeType}</small>
                              </span>
                            </span>
                            {attachmentLoading === item.id ? (
                              <LoaderCircle className={styles.spinner} aria-hidden="true" />
                            ) : (
                              <Download aria-hidden="true" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {attachmentError && (
                      <p className={styles.resourceError} role="alert">
                        {attachmentError}
                      </p>
                    )}
                  </section>
                </div>

                <footer className={styles.lessonFooter}>
                  <div className={styles.sequenceActions}>
                    <button
                      type="button"
                      disabled={!previousLesson}
                      onClick={() => previousLesson && selectLesson(previousLesson.id)}
                    >
                      <ArrowRight aria-hidden="true" /> الدرس السابق
                    </button>
                    <button
                      type="button"
                      disabled={!nextLesson}
                      onClick={() => nextLesson && selectLesson(nextLesson.id)}
                    >
                      الدرس التالي <ArrowLeft aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles.completionActions}>
                    {lesson.quiz && (
                      <button
                        className={styles.quizButton}
                        type="button"
                        onClick={() => {
                          flushCurrentVideoProgress();
                          router.push(`/dashboard/quizzes/${lesson.quiz?.id}`);
                        }}
                      >
                        <FileQuestion aria-hidden="true" /> ابدأ اختبار الدرس
                      </button>
                    )}
                    <button
                      className={styles.completeButton}
                      type="button"
                      onClick={markComplete}
                      disabled={saveState === 'saving' || lessonProgress?.completed}
                    >
                      <CheckCircle2 aria-hidden="true" />
                      {lessonProgress?.completed ? 'الدرس مكتمل' : 'سجّل إكمال الدرس'}
                    </button>
                  </div>
                </footer>
              </motion.div>
            ) : (
              <motion.section
                className={styles.emptyLesson}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <BookOpen aria-hidden="true" />
                <h2>لا توجد دروس منشورة بعد.</h2>
                <p>سيظهر محتوى المساق هنا بمجرد أن يضيف المدرّس أول درس.</p>
                <button type="button" onClick={() => router.push('/dashboard/courses')}>
                  العودة إلى مساقاتي
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </section>

        <aside
          className={`${styles.outline} ${!outlineOpen ? styles.outlineClosed : ''}`}
          id="course-outline"
          aria-label="محتوى المساق"
        >
          <header className={styles.outlineHeader}>
            <div>
              <span className={styles.outlineIcon}>
                <ListVideo aria-hidden="true" />
              </span>
              <div>
                <p>خطّ الفهم</p>
                <h2>محتوى المساق</h2>
              </div>
            </div>
            <button
              className={styles.mobileClose}
              type="button"
              onClick={() => setOutlineOpen(false)}
              aria-label="إخفاء محتوى المساق"
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <span>
              اكتمل {numberFormatter.format(completedLessons)} من{' '}
              {numberFormatter.format(allLessons.length)}
            </span>
          </header>

          <div className={styles.moduleList}>
            {data.enrollment.course.modules.map((module, moduleIndex) => (
              <section className={styles.module} key={module.id}>
                <header>
                  <span>{String(moduleIndex + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{module.title}</h3>
                    <p>{numberFormatter.format(module.lessons.length)} دروس</p>
                  </div>
                </header>
                <div className={styles.lessonList}>
                  {module.lessons.map((item) => {
                    const progress = data.progressByLesson[item.id];
                    const active = item.id === selected;
                    const itemDuration = item.durationSec ?? item.video?.durationSec;
                    return (
                      <button
                        className={`${styles.lessonRow} ${active ? styles.lessonRowActive : ''}`}
                        type="button"
                        key={item.id}
                        onClick={() => selectLesson(item.id)}
                        aria-current={active ? 'step' : undefined}
                      >
                        <span
                          className={styles.lessonState}
                          data-complete={progress?.completed || undefined}
                        >
                          {progress?.completed ? (
                            <Check aria-hidden="true" />
                          ) : active ? (
                            <Play aria-hidden="true" fill="currentColor" />
                          ) : (
                            <Circle aria-hidden="true" />
                          )}
                        </span>
                        <span className={styles.lessonRowCopy}>
                          <strong>{item.title}</strong>
                          <small>
                            {lessonTypeLabel(item.type)}
                            {itemDuration ? ` · ${formatDuration(itemDuration)}` : ''}
                          </small>
                        </span>
                        {progress && Number(progress.progressPct) > 0 && !progress.completed && (
                          <span className={styles.rowProgress}>
                            {Math.round(Number(progress.progressPct))}٪
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {module.quizzes.map((quiz) => (
                    <button
                      className={`${styles.lessonRow} ${styles.quizRow}`}
                      type="button"
                      key={quiz.id}
                      onClick={() => {
                        flushCurrentVideoProgress();
                        router.push(`/dashboard/quizzes/${quiz.id}`);
                      }}
                    >
                      <span className={styles.lessonState}>
                        <FileQuestion aria-hidden="true" />
                      </span>
                      <span className={styles.lessonRowCopy}>
                        <strong>{quiz.title}</strong>
                        <small>اختبار الوحدة</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
