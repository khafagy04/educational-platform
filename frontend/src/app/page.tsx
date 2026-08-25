import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Lightbulb, PencilRuler, Zap } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { FaqAccordion } from '@/components/faq-accordion';
import { HomeCourseShowcase } from '@/components/home-course-showcase';
import { HomeHero } from '@/components/home-hero';
import { SiteHeader } from '@/components/site-header';
import { apiGet, type Course } from '@/lib/api';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [coursesData, testimonialsData, faqData, settingsData] = await Promise.all([
    apiGet<{ data: { courses: Course[]; total: number } }>(
      '/courses?page=1&pageSize=9&sort=newest',
      {
        data: { courses: [], total: 0 },
      },
    ),
    apiGet<{
      data: {
        testimonials: {
          id: string;
          rating: number;
          comment: string;
          user: { name: string };
          course: { title: string };
        }[];
      };
    }>('/testimonials', { data: { testimonials: [] } }),
    apiGet<{ data: { faqs: { id: string; question: string; answer: string }[] } }>('/faqs', {
      data: { faqs: [] },
    }),
    apiGet<{ data: { settings: { key: string; value: unknown }[] } }>('/settings/public', {
      data: { settings: [] },
    }),
  ]);

  const settings = new Map(settingsData.data.settings.map((item) => [item.key, item.value]));
  const faqs = faqData.data.faqs.length
    ? faqData.data.faqs
    : [
        {
          id: 'start',
          question: 'هل أستطيع تجربة المنصة قبل الاشتراك؟',
          answer: 'نعم. ابدأ بالمساقات المجانية واختبار تحديد المستوى، ثم اختر المسار المناسب لك.',
        },
        {
          id: 'mobile',
          question: 'هل تعمل الدروس على الموبايل؟',
          answer: 'نعم. الواجهة ومشغّل الدرس مصممان للعمل من الموبايل والكمبيوتر.',
        },
      ];
  const testimonials = testimonialsData.data.testimonials.slice(0, 2);
  const courseCount = settings.get('homepage.courseCount') ?? coursesData.data.total;
  const yearsExperience = settings.get('homepage.yearsExperience');
  const satisfactionPct = settings.get('homepage.satisfactionPct');

  return (
    <main className={styles.home}>
      <Link className={styles.announcement} href="/placement-test">
        <Zap aria-hidden="true" size={15} />
        <span>
          <strong>اختبار تحديد المستوى متاح</strong> — اعرف نقطة البداية المناسبة في 8 دقائق
        </span>
      </Link>
      <SiteHeader />
      <HomeHero />

      <section className={styles.proofBand} aria-label="أرقام المنصة">
        <div>
          <strong>{String(courseCount)}</strong>
          <span>مساقاً مرتباً</span>
        </div>
        {yearsExperience != null && (
          <div>
            <strong>{String(yearsExperience)}</strong>
            <span>سنة خبرة</span>
          </div>
        )}
        {satisfactionPct != null && (
          <div>
            <strong>{String(satisfactionPct)}%</strong>
            <span>رضا الطلاب</span>
          </div>
        )}
        <div>
          <strong>24/7</strong>
          <span>تقدّم محفوظ</span>
        </div>
      </section>

      <section className={styles.section} id="courses">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>ابدأ من مكانك الحقيقي</p>
            <h2>اختَر مكانك في المنهج</h2>
          </div>
          <p>بدل كتالوج طويل، سترى صفك أولاً ثم المساقات الأنسب للحظة الحالية.</p>
        </div>
        <HomeCourseShowcase courses={coursesData.data.courses} />
      </section>

      <section className={styles.methodSection} id="approach">
        <div className={styles.methodGrid}>
          <div className={styles.methodCopy}>
            <p className={styles.sectionKicker}>خطّ الفهم</p>
            <h2>
              كل درس له <span>خط نهاية واضح.</span>
            </h2>
            <p>
              نفس الثلاث خطوات تظهر في الصفحة، الدرس، والاختبار؛ فتتعرف على مكانك من غير شرح إضافي
              أو قوائم مربكة.
            </p>
          </div>
          <div className={styles.methodSteps}>
            <article className={styles.methodStep}>
              <span className={styles.methodIcon}>
                <Lightbulb aria-hidden="true" />
              </span>
              <div>
                <strong>افهم</strong>
                <p>فيديو مركّز، خريطة فكرة، ومثال واحد مشروح.</p>
              </div>
              <small>7 د</small>
            </article>
            <article className={styles.methodStep}>
              <span className={styles.methodIcon}>
                <PencilRuler aria-hidden="true" />
              </span>
              <div>
                <strong>جرّب</strong>
                <p>سؤال في مكانه مع تلميح عندما تحتاجه.</p>
              </div>
              <small>12 د</small>
            </article>
            <article className={styles.methodStep}>
              <span className={styles.methodIcon}>
                <BadgeCheck aria-hidden="true" />
              </span>
              <div>
                <strong>اتقن</strong>
                <p>اختبار قصير يوضح ما أتقنته وما يحتاج مراجعة.</p>
              </div>
              <small>5 د</small>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} id="about">
        <div className={styles.teacherPanel}>
          <div className={styles.teacherVisual} aria-hidden="true">
            م
          </div>
          <div className={styles.teacherCopy}>
            <p className={styles.sectionKicker}>عن المدرّس</p>
            <h2>لا تحفظ خطوة لم تفهم سببها.</h2>
            <p>
              نبني الدرس كما تُبنى المسألة على السبورة: سؤال واضح، فكرة واحدة في كل مرة، ثم تدريب
              يكشف الفهم الحقيقي.
            </p>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className={styles.voiceSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>صوت الطالب قبل الأرقام</p>
              <h2>الإحساس بالتقدّم هو المنتج</h2>
            </div>
            <p>تجارب حقيقية مرتبطة بالمساق الذي درسه الطالب.</p>
          </div>
          <div className={styles.voiceGrid}>
            <div className={styles.testimonialList}>
              {testimonials.map((item) => (
                <blockquote key={item.id}>
                  <p>«{item.comment}»</p>
                  <footer>
                    {item.user.name} · {item.course.title}
                  </footer>
                </blockquote>
              ))}
            </div>
            <div className={styles.finalPanel}>
              <div>
                <h2>مش محتاج تذاكر أكتر. محتاج تعرف تبدأ منين.</h2>
                <p>اختبار مجاني، 8 دقائق، والنتيجة تظهر فوراً.</p>
              </div>
              <Link className={styles.finalAction} href="/placement-test">
                حدّد نقطة البداية <ArrowLeft aria-hidden="true" size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.faqSection} id="faq">
        <div className={styles.faqHeading}>
          <p className={styles.sectionKicker}>قبل أن تبدأ</p>
          <h2>أسئلة مباشرة، وإجابات أوضح.</h2>
          <p>هذه أكثر الإجابات التي تساعدك قبل اختيار المساق المناسب.</p>
        </div>
        <div className={styles.faqPanel}>
          <FaqAccordion items={faqs} />
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <Link className={styles.footerBrand} href="/">
            <BrandMark /> مِداد
          </Link>
          <p>منصة تعليمية عربية تجعل الخطوة التالية واضحة.</p>
        </div>
        <nav className={styles.footerLinks} aria-label="روابط التذييل">
          <Link href="/courses">المساقات</Link>
          <Link href="/#approach">طريقة المذاكرة</Link>
          <Link href="/#faq">الأسئلة الشائعة</Link>
          <Link href="/login">دخول الطلاب</Link>
        </nav>
      </footer>
    </main>
  );
}
