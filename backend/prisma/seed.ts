import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  CourseStatus,
  EducationStage,
  EnrollmentStatus,
  LessonType,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  QuestionType,
  QuizStatus,
  UserRole,
  VideoProvider,
  VideoStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../src/generated/prisma/enums.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const now = new Date();
const oneYearFromNow = new Date(now);
oneYearFromNow.setUTCDate(oneYearFromNow.getUTCDate() + 365);

async function seedUsers() {
  const [instructorPasswordHash, adminPasswordHash, studentPasswordHash] = await Promise.all([
    bcrypt.hash(process.env.SEED_INSTRUCTOR_PASSWORD ?? 'Instructor!2026', 12),
    bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin!2026', 12),
    bcrypt.hash(process.env.SEED_STUDENT_PASSWORD ?? 'Student!2026', 12),
  ]);

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@example.local' },
    update: {
      name: 'الأستاذ أحمد محمود',
      passwordHash: instructorPasswordHash,
      role: UserRole.INSTRUCTOR,
      emailVerifiedAt: now,
    },
    create: {
      name: 'الأستاذ أحمد محمود',
      email: 'instructor@example.local',
      phone: '+201000000001',
      passwordHash: instructorPasswordHash,
      role: UserRole.INSTRUCTOR,
      emailVerifiedAt: now,
      wallet: { create: {} },
      notificationPreference: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.local' },
    update: {
      name: 'مدير المنصة',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      emailVerifiedAt: now,
    },
    create: {
      name: 'مدير المنصة',
      email: 'admin@example.local',
      phone: '+201000000004',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      emailVerifiedAt: now,
      wallet: { create: {} },
      notificationPreference: { create: {} },
    },
  });

  return { instructor, studentPasswordHash };
}

async function seedGradesAndSubjects() {
  const gradeDefinitions = [
    {
      name: 'الصف الرابع الابتدائي',
      slug: 'primary-4',
      stage: EducationStage.PRIMARY,
      sortOrder: 4,
    },
    {
      name: 'الصف الخامس الابتدائي',
      slug: 'primary-5',
      stage: EducationStage.PRIMARY,
      sortOrder: 5,
    },
    {
      name: 'الصف السادس الابتدائي',
      slug: 'primary-6',
      stage: EducationStage.PRIMARY,
      sortOrder: 6,
    },
    {
      name: 'الصف الأول الإعدادي',
      slug: 'preparatory-1',
      stage: EducationStage.PREPARATORY,
      sortOrder: 1,
    },
    {
      name: 'الصف الثاني الإعدادي',
      slug: 'preparatory-2',
      stage: EducationStage.PREPARATORY,
      sortOrder: 2,
    },
    {
      name: 'الصف الثالث الإعدادي',
      slug: 'preparatory-3',
      stage: EducationStage.PREPARATORY,
      sortOrder: 3,
    },
    {
      name: 'الصف الأول الثانوي',
      slug: 'secondary-1',
      stage: EducationStage.SECONDARY,
      sortOrder: 1,
    },
    {
      name: 'الصف الثاني الثانوي',
      slug: 'secondary-2',
      stage: EducationStage.SECONDARY,
      sortOrder: 2,
    },
    {
      name: 'الصف الثالث الثانوي',
      slug: 'secondary-3',
      stage: EducationStage.SECONDARY,
      sortOrder: 3,
    },
  ];

  for (const grade of gradeDefinitions) {
    await prisma.grade.upsert({
      where: { slug: grade.slug },
      update: grade,
      create: grade,
    });
  }

  const targetGrade = await prisma.grade.findUniqueOrThrow({
    where: { slug: 'preparatory-2' },
  });

  const mathematics = await prisma.subject.upsert({
    where: { gradeId_slug: { gradeId: targetGrade.id, slug: 'mathematics' } },
    update: { name: 'الرياضيات', sortOrder: 1, isActive: true },
    create: {
      gradeId: targetGrade.id,
      name: 'الرياضيات',
      slug: 'mathematics',
      sortOrder: 1,
    },
  });

  await prisma.subject.upsert({
    where: { gradeId_slug: { gradeId: targetGrade.id, slug: 'science' } },
    update: { name: 'العلوم', sortOrder: 2, isActive: true },
    create: {
      gradeId: targetGrade.id,
      name: 'العلوم',
      slug: 'science',
      sortOrder: 2,
    },
  });

  return { mathematics, targetGrade };
}

async function seedCourse(instructorId: string, gradeId: string, subjectId: string) {
  const course = await prisma.course.upsert({
    where: { slug: 'algebra-foundations-prep-2' },
    update: {
      gradeId,
      subjectId,
      createdById: instructorId,
      title: 'أساسيات الجبر للصف الثاني الإعدادي',
      description: 'مساق عملي لفهم المعادلات والتعبيرات الجبرية من الفكرة حتى التطبيق.',
      price: '450.00',
      status: CourseStatus.PUBLISHED,
      publishedAt: now,
    },
    create: {
      gradeId,
      subjectId,
      createdById: instructorId,
      title: 'أساسيات الجبر للصف الثاني الإعدادي',
      slug: 'algebra-foundations-prep-2',
      description: 'مساق عملي لفهم المعادلات والتعبيرات الجبرية من الفكرة حتى التطبيق.',
      price: '450.00',
      thumbnailFileKey: 'seed/courses/algebra-foundations/thumbnail.webp',
      accessDurationDays: 365,
      status: CourseStatus.PUBLISHED,
      publishedAt: now,
    },
  });

  const firstModule = await prisma.courseModule.upsert({
    where: { courseId_sortOrder: { courseId: course.id, sortOrder: 1 } },
    update: { title: 'لغة الجبر', description: 'المتغيرات والتعبيرات الجبرية خطوة بخطوة.' },
    create: {
      courseId: course.id,
      title: 'لغة الجبر',
      description: 'المتغيرات والتعبيرات الجبرية خطوة بخطوة.',
      sortOrder: 1,
    },
  });

  const secondModule = await prisma.courseModule.upsert({
    where: { courseId_sortOrder: { courseId: course.id, sortOrder: 2 } },
    update: { title: 'حل المعادلات', description: 'استراتيجيات الحل والتحقق من الإجابة.' },
    create: {
      courseId: course.id,
      title: 'حل المعادلات',
      description: 'استراتيجيات الحل والتحقق من الإجابة.',
      sortOrder: 2,
    },
  });

  const introduction = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: firstModule.id, slug: 'what-is-algebra' } },
    update: { title: 'ما الجبر؟', type: LessonType.VIDEO, isFree: true, sortOrder: 1 },
    create: {
      moduleId: firstModule.id,
      title: 'ما الجبر؟',
      slug: 'what-is-algebra',
      description: 'مدخل بصري يربط الرموز بمواقف من الحياة اليومية.',
      type: LessonType.VIDEO,
      durationSec: 720,
      isFree: true,
      sortOrder: 1,
    },
  });

  await prisma.video.upsert({
    where: { lessonId: introduction.id },
    update: { status: VideoStatus.READY, durationSec: 720 },
    create: {
      lessonId: introduction.id,
      provider: VideoProvider.CLOUDFLARE_STREAM,
      providerVideoId: 'seed-algebra-introduction',
      status: VideoStatus.READY,
      durationSec: 720,
    },
  });

  const workbook = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: firstModule.id, slug: 'algebraic-expressions-workbook' } },
    update: { title: 'تدريبات التعبيرات الجبرية', type: LessonType.PDF, sortOrder: 2 },
    create: {
      moduleId: firstModule.id,
      title: 'تدريبات التعبيرات الجبرية',
      slug: 'algebraic-expressions-workbook',
      description: 'ورقة عمل مرتبة من التأسيس إلى التحدي.',
      type: LessonType.PDF,
      sortOrder: 2,
    },
  });

  await prisma.attachment.upsert({
    where: { fileKey: 'seed/courses/algebra-foundations/algebraic-expressions.pdf' },
    update: { lessonId: workbook.id, title: 'ورقة عمل التعبيرات الجبرية' },
    create: {
      lessonId: workbook.id,
      title: 'ورقة عمل التعبيرات الجبرية',
      fileKey: 'seed/courses/algebra-foundations/algebraic-expressions.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 245_760n,
      sortOrder: 1,
    },
  });

  const equationLesson = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: secondModule.id, slug: 'solve-one-step-equations' } },
    update: { title: 'حل معادلات الخطوة الواحدة', type: LessonType.TEXT, sortOrder: 1 },
    create: {
      moduleId: secondModule.id,
      title: 'حل معادلات الخطوة الواحدة',
      slug: 'solve-one-step-equations',
      description: 'افهم معنى الحفاظ على توازن طرفي المعادلة.',
      type: LessonType.TEXT,
      textContent: 'المعادلة تشبه الميزان: ما نفعله في طرف نفعله في الطرف الآخر.',
      sortOrder: 1,
    },
  });

  const quizLesson = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: secondModule.id, slug: 'module-assessment' } },
    update: { title: 'اختبار الوحدة', type: LessonType.QUIZ, sortOrder: 2 },
    create: {
      moduleId: secondModule.id,
      title: 'اختبار الوحدة',
      slug: 'module-assessment',
      description: 'اختبار يجمع بين الاختيار من متعدد والتفسير الكتابي.',
      type: LessonType.QUIZ,
      sortOrder: 2,
    },
  });

  const quiz = await prisma.quiz.upsert({
    where: { lessonId: quizLesson.id },
    update: {
      moduleId: secondModule.id,
      title: 'اختبار المعادلات الأساسي',
      timeLimitSec: 1_200,
      passingScore: '60.00',
      maxAttempts: 3,
      status: QuizStatus.PUBLISHED,
    },
    create: {
      moduleId: secondModule.id,
      lessonId: quizLesson.id,
      title: 'اختبار المعادلات الأساسي',
      description: 'اختبر قدرتك على الحل وشرح سبب صحة خطواتك.',
      timeLimitSec: 1_200,
      passingScore: '60.00',
      maxAttempts: 3,
      status: QuizStatus.PUBLISHED,
    },
  });

  const multipleChoice = await prisma.question.upsert({
    where: { quizId_sortOrder: { quizId: quiz.id, sortOrder: 1 } },
    update: { type: QuestionType.MCQ, prompt: 'ما قيمة س في المعادلة س + ٥ = ١٢؟', points: '5.00' },
    create: {
      quizId: quiz.id,
      type: QuestionType.MCQ,
      prompt: 'ما قيمة س في المعادلة س + ٥ = ١٢؟',
      points: '5.00',
      sortOrder: 1,
    },
  });

  const options = [
    { text: '٥', isCorrect: false, sortOrder: 1 },
    { text: '٧', isCorrect: true, sortOrder: 2 },
    { text: '١٢', isCorrect: false, sortOrder: 3 },
    { text: '١٧', isCorrect: false, sortOrder: 4 },
  ];

  for (const option of options) {
    await prisma.questionOption.upsert({
      where: {
        questionId_sortOrder: { questionId: multipleChoice.id, sortOrder: option.sortOrder },
      },
      update: option,
      create: { ...option, questionId: multipleChoice.id },
    });
  }

  await prisma.question.upsert({
    where: { quizId_sortOrder: { quizId: quiz.id, sortOrder: 2 } },
    update: {
      type: QuestionType.ESSAY,
      prompt: 'اشرح لماذا يجب تنفيذ العملية نفسها على طرفي المعادلة.',
      points: '5.00',
    },
    create: {
      quizId: quiz.id,
      type: QuestionType.ESSAY,
      prompt: 'اشرح لماذا يجب تنفيذ العملية نفسها على طرفي المعادلة.',
      points: '5.00',
      sortOrder: 2,
    },
  });

  return { course, equationLesson, introduction, quiz };
}

async function seedDiscoveryCatalog(instructorId: string, gradeId: string, subjectId: string) {
  for (let index = 1; index <= 55; index += 1) {
    const indexText = String(index);
    const slug = `catalog-course-${indexText.padStart(2, '0')}`;
    const price = index % 5 === 0 ? '0.00' : `${String(100 + index * 10)}.00`;
    await prisma.course.upsert({
      where: { slug },
      update: {
        gradeId,
        subjectId,
        createdById: instructorId,
        price,
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(now.getTime() - index * 86_400_000),
      },
      create: {
        gradeId,
        subjectId,
        createdById: instructorId,
        title: `تدريب الرياضيات المتدرّج ${indexText}`,
        slug,
        description: `مساق تدريبي رقم ${indexText} يشرح مهارة رياضية محددة بأمثلة واضحة وتمارين متدرجة.`,
        price,
        accessDurationDays: 180,
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(now.getTime() - index * 86_400_000),
      },
    });
  }
}

async function seedStudentExperience(
  studentPasswordHash: string,
  gradeId: string,
  courseId: string,
  introductionLessonId: string,
) {
  const student = await prisma.user.upsert({
    where: { email: 'student@example.local' },
    update: {
      name: 'مريم محمد علي',
      gradeId,
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      emailVerifiedAt: now,
    },
    create: {
      name: 'مريم محمد علي',
      email: 'student@example.local',
      phone: '+201000000002',
      parentPhone: '+201000000003',
      governorate: 'القاهرة',
      school: 'مدرسة النور الإعدادية',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      gradeId,
      emailVerifiedAt: now,
      notificationPreference: { create: {} },
    },
  });

  const wallet = await prisma.wallet.upsert({
    where: { userId: student.id },
    update: { balance: '500.00', currency: 'EGP' },
    create: { userId: student.id, balance: '500.00', currency: 'EGP' },
  });

  await prisma.walletTransaction.upsert({
    where: { idempotencyKey: 'seed-wallet-top-up' },
    update: { status: WalletTransactionStatus.COMPLETED, balanceAfter: '950.00' },
    create: {
      walletId: wallet.id,
      type: WalletTransactionType.TOP_UP,
      status: WalletTransactionStatus.COMPLETED,
      amount: '950.00',
      currency: 'EGP',
      balanceAfter: '950.00',
      idempotencyKey: 'seed-wallet-top-up',
      description: 'شحن تجريبي للمحفظة',
      completedAt: now,
    },
  });

  const order = await prisma.order.upsert({
    where: { idempotencyKey: 'seed-order-algebra-student' },
    update: { status: OrderStatus.PAID, paidAt: now },
    create: {
      userId: student.id,
      courseId,
      status: OrderStatus.PAID,
      amount: '450.00',
      currency: 'EGP',
      courseTitleSnapshot: 'أساسيات الجبر للصف الثاني الإعدادي',
      idempotencyKey: 'seed-order-algebra-student',
      paidAt: now,
    },
  });

  const payment = await prisma.payment.upsert({
    where: { providerPaymentId: 'seed-wallet-payment-algebra' },
    update: { status: PaymentStatus.PAID, paidAt: now },
    create: {
      userId: student.id,
      orderId: order.id,
      provider: PaymentProvider.WALLET,
      status: PaymentStatus.PAID,
      amount: '450.00',
      currency: 'EGP',
      providerPaymentId: 'seed-wallet-payment-algebra',
      paidAt: now,
    },
  });

  await prisma.walletTransaction.upsert({
    where: { idempotencyKey: 'seed-wallet-purchase-algebra' },
    update: { status: WalletTransactionStatus.COMPLETED, balanceAfter: '500.00' },
    create: {
      walletId: wallet.id,
      orderId: order.id,
      paymentId: payment.id,
      type: WalletTransactionType.COURSE_PURCHASE,
      status: WalletTransactionStatus.COMPLETED,
      amount: '450.00',
      currency: 'EGP',
      balanceAfter: '500.00',
      idempotencyKey: 'seed-wallet-purchase-algebra',
      description: 'شراء تجريبي لمساق أساسيات الجبر',
      completedAt: now,
    },
  });

  const enrollment = await prisma.enrollment.upsert({
    where: { orderId: order.id },
    update: { status: EnrollmentStatus.ACTIVE, expiresAt: oneYearFromNow },
    create: {
      userId: student.id,
      courseId,
      orderId: order.id,
      status: EnrollmentStatus.ACTIVE,
      purchasedPrice: '450.00',
      currency: 'EGP',
      startsAt: now,
      expiresAt: oneYearFromNow,
    },
  });

  await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: introductionLessonId },
    },
    update: {
      progressPct: '68.00',
      lastPositionSec: 490,
      watchedSeconds: 490,
      lastViewedAt: now,
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: introductionLessonId,
      progressPct: '68.00',
      lastPositionSec: 490,
      watchedSeconds: 490,
      lastViewedAt: now,
    },
  });

  await prisma.courseFavorite.upsert({
    where: { userId_courseId: { userId: student.id, courseId } },
    update: {},
    create: { userId: student.id, courseId },
  });

  await prisma.courseView.upsert({
    where: { userId_courseId: { userId: student.id, courseId } },
    update: { viewCount: 4, lastViewedAt: now },
    create: { userId: student.id, courseId, viewCount: 4, lastViewedAt: now },
  });

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.learningActivity.upsert({
    where: { userId_activityDate: { userId: student.id, activityDate: today } },
    update: { watchedSeconds: 490 },
    create: { userId: student.id, activityDate: today, watchedSeconds: 490 },
  });

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: student.id,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'تم تأكيد اشتراكك',
    },
  });

  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: student.id,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'تم تأكيد اشتراكك',
        body: 'يمكنك الآن بدء مساق أساسيات الجبر ومتابعة تقدّمك.',
        data: { courseId, orderId: order.id },
      },
    });
  }
}

async function seedManagedContent(instructorId: string) {
  const faqs = [
    {
      sortOrder: 1,
      question: 'هل أستطيع متابعة الدروس من الهاتف؟',
      answer: 'نعم، تعمل المنصة على الهاتف والجهاز اللوحي والكمبيوتر.',
    },
    {
      sortOrder: 2,
      question: 'كم تستمر صلاحية المساق؟',
      answer: 'تظهر مدة الوصول في صفحة المساق، والمدة الافتراضية سنة كاملة.',
    },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.upsert({
      where: { sortOrder: faq.sortOrder },
      update: faq,
      create: faq,
    });
  }

  const settings = [
    { key: 'brand.name', value: 'مِداد', description: 'اسم المنصة الظاهر للطلاب' },
    { key: 'homepage.yearsExperience', value: 12, description: 'سنوات خبرة المدرّس' },
    { key: 'homepage.satisfactionPct', value: 96, description: 'نسبة رضا تجريبية' },
  ];

  for (const setting of settings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: { ...setting, updatedById: instructorId },
      create: { ...setting, updatedById: instructorId },
    });
  }
}

async function main() {
  const { instructor, studentPasswordHash } = await seedUsers();
  const { mathematics, targetGrade } = await seedGradesAndSubjects();
  const { course, introduction } = await seedCourse(instructor.id, targetGrade.id, mathematics.id);
  await seedDiscoveryCatalog(instructor.id, targetGrade.id, mathematics.id);
  await seedStudentExperience(studentPasswordHash, targetGrade.id, course.id, introduction.id);
  await seedManagedContent(instructor.id);

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.grade.count(),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.quiz.count(),
  ]);

  console.log(
    'Seed complete:',
    `${String(counts[0])} users,`,
    `${String(counts[1])} grades,`,
    `${String(counts[2])} courses,`,
    `${String(counts[3])} lessons,`,
    `${String(counts[4])} quizzes.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
