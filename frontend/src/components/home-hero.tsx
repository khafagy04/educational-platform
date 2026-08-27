'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, BadgeCheck, CheckCircle2, Lightbulb, PencilRuler, Play, X } from 'lucide-react';
import styles from '@/app/home.module.css';

export function HomeHero() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!previewOpen) return;
    const previewTrigger = previewButton.current;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false);
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previewTrigger?.focus();
    };
  }, [previewOpen]);

  return (
    <>
      <section className={styles.hero} id="top">
        <motion.div
          className={styles.heroCopy}
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className={styles.eyebrow}>نظام مذاكرة مصمم للمنهج المصري</p>
          <h1>
            لو المنهج زحمة… نرتّبه <span>خطوة خطوة.</span>
          </h1>
          <p className={styles.heroLead}>
            شرح واضح، تدريب في مكانه، ومؤشر واحد يقول لك تعمل إيه بعد كده. مفيش تشتّت بين فيديوهات
            وملفات ورسائل.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="#courses">
              ابدأ من مستواك <ArrowLeft aria-hidden="true" size={18} />
            </Link>
            <button
              ref={previewButton}
              className={styles.secondaryAction}
              type="button"
              onClick={() => setPreviewOpen(true)}
            >
              <Play aria-hidden="true" size={17} /> شاهد دقيقة من الشرح
            </button>
          </div>
          <div className={styles.heroProof} aria-label="مزايا البدء">
            {['اختبار تحديد مستوى مجاني', 'متابعة أسبوعية', 'يعمل على الموبايل'].map((label) => (
              <span key={label}>
                <CheckCircle2 aria-hidden="true" size={15} /> {label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.aside
          className={styles.trailStage}
          aria-label="مسار التعلّم من الفهم إلى الإتقان"
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.trailHeading}>
            <small>معاينة خطّ الفهم</small>
            <strong>مثال: الجبر · الدرس الرابع</strong>
          </div>
          <svg className={styles.trailSvg} viewBox="0 0 500 260" aria-hidden="true">
            <path className={styles.trailBase} d="M440 88 C350 22 330 235 235 176 S104 49 34 108" />
            <motion.path
              className={styles.trailActive}
              d="M440 88 C350 22 330 235 235 176 S104 49 34 108"
              initial={reduceMotion ? { pathLength: 0.74 } : { pathLength: 0 }}
              animate={{ pathLength: 0.74 }}
              transition={{ duration: reduceMotion ? 0 : 1.7, delay: 0.3, ease: 'easeInOut' }}
            />
          </svg>
          <span className={`${styles.trailNode} ${styles.nodeUnderstand}`}>
            <Lightbulb aria-hidden="true" />
            <em>افهم الفكرة</em>
          </span>
          <span className={`${styles.trailNode} ${styles.nodeTry}`}>
            <PencilRuler aria-hidden="true" />
            <em>جرّب بإيدك</em>
          </span>
          <span className={`${styles.trailNode} ${styles.nodeMaster}`}>
            <BadgeCheck aria-hidden="true" />
            <em>أتقن السؤال</em>
          </span>
          <div className={styles.progressBubble}>
            <small>تقدّم المثال</small>
            <strong>68%</strong>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="التقدّم في المساق"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={68}
            >
              <motion.span
                initial={reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 0.5 }}
              />
            </div>
          </div>
        </motion.aside>
      </section>

      <AnimatePresence>
        {previewOpen && (
          <motion.div
            className={styles.previewBackdrop}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPreviewOpen(false);
            }}
          >
            <motion.section
              className={styles.previewDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lesson-preview-title"
              aria-describedby="lesson-preview-description"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
            >
              <header>
                <div>
                  <small>معاينة طريقة الشرح</small>
                  <h2 id="lesson-preview-title">المعادلة مش حفظ… هي ميزان.</h2>
                </div>
                <button ref={closeButton} type="button" onClick={() => setPreviewOpen(false)}>
                  <X aria-hidden="true" /> <span className={styles.srOnly}>إغلاق المعاينة</span>
                </button>
              </header>
              <div className={styles.previewBoard}>
                <span className={styles.previewEquation}>ص = ٢س + ٣</span>
                <span className={styles.previewAxisX} />
                <span className={styles.previewAxisY} />
                <motion.span
                  className={styles.previewGraph}
                  initial={reduceMotion ? { rotate: 24 } : { scaleX: 0, rotate: 24 }}
                  animate={{ scaleX: 1, rotate: 24 }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                />
                <span className={styles.previewCaption}>
                  كل حركة على طرف… تتكرر على الطرف الآخر.
                </span>
              </div>
              <footer id="lesson-preview-description">
                مثال بصري لاتجاه الفيديو، الترجمة، والرسومات داخل الدرس.
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
