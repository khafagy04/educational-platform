import Link from 'next/link';
import { PlacementCheck } from '@/components/placement-check';

export default function PlacementTestPage() {
  return (
    <main className="placement-page">
      <header>
        <Link className="brand" href="/">
          <span className="brand-mark">م</span>
          <span>مِداد</span>
        </Link>
        <p className="section-kicker">فحص تمهيدي · ٣ أسئلة</p>
        <h1>لنحدّد أول سطر نبدأ منه.</h1>
        <p>اختر الإجابة الأقرب. لا درجات ولا ضغط—الهدف أن نقترح نقطة بداية مناسبة.</p>
      </header>
      <PlacementCheck />
    </main>
  );
}
