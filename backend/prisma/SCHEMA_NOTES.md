# Schema notes

The Prisma schema is the locked persistence contract as of Phase 2. Monetary values use fixed-precision decimals and EGP defaults; timestamps that represent events use timezone-aware PostgreSQL columns. Future changes require a reviewed migration and an update to this document.

## Identity and access

### User

Stores students, instructors, and administrators in one identity table. Email is the login identity, passwords are bcrypt hashes, suspension and email verification are explicit, and student profile fields may link to a grade. Private object storage is referenced by key rather than a public avatar URL.

### VerificationToken

Represents one-time email-verification and password-reset challenges. Only a token hash is persisted; expiry and `usedAt` make consumption auditable and prevent reuse.

### RefreshToken

Stores hashed refresh tokens with device/IP context, expiry, revocation, token-family membership, and replacement links. These fields support rotation, replay detection, and family-wide revocation.

### AuditLog

Records security and administrative actions with an optional actor, target type/id, safe JSON metadata, request IP, user agent, and immutable creation time. Sensitive secrets and full payment payloads must never be written here.

## Catalogue and learning content

### Grade

Defines an ordered school year within primary, preparatory, or secondary education. Stage/order and slug uniqueness keep navigation deterministic; inactive grades remain available for historical references.

### Subject

Defines a subject within one grade. Slug and display order are unique inside the grade, and deletion is restricted while related courses exist.

### Course

Contains the sellable learning product, including its grade/subject, creator, publication state, access duration, EGP decimal price, and private thumbnail key. Orders snapshot the title and price so later catalogue edits do not rewrite purchase history.

### CourseModule

Groups ordered lessons inside a course. The `(courseId, sortOrder)` constraint provides stable curriculum ordering and cascading deletion is limited to the owned lesson/quiz tree.

### Lesson

Represents video, PDF, quiz, or text material with stable per-module slug/order. `isFree` controls previews, `isRequired` feeds completion rules, and type-specific records hold video, attachment, or quiz data.

### Video

Tracks a lesson's private streaming-provider asset and its processing lifecycle. Provider identifiers are unique and playback URLs are intentionally not persisted so services can issue short-lived signed access.

### Attachment

Stores attachment metadata and a private object key, never a permanent public URL. File key and per-lesson ordering are unique; authorization is checked before issuing a signed download URL.

## Commerce and entitlement

### Wallet

Provides one versioned EGP balance per user. The version supports optimistic concurrency while the transaction ledger remains the auditable source of balance changes.

### WalletTransaction

Records top-ups, course purchases, and administrative adjustments with explicit lifecycle state and post-transaction balance. Unique provider references, payment links, and idempotency keys prevent duplicate credit or debit processing.

### Order

Represents a user's intent to buy one course. It persists decimal amount, currency, and course-title snapshot independently of future catalogue changes, with an optional idempotency key and explicit expiry/payment timestamps.

### Payment

Tracks wallet or Fawaterk payment attempts against an order. Provider payment/session IDs are unique, failures are retained, and `paidAt` distinguishes confirmed funds from pending callbacks.

### PaymentWebhookEvent

Is the webhook inbox and idempotency boundary. Provider/event uniqueness prevents replay, while payload hash, lifecycle state, processing time, and failure reason support safe retries without storing unnecessary raw secrets.

### Enrollment

Is the historical course entitlement created from exactly one paid order. It snapshots purchase price and access dates and owns progress, attempts, and one certificate. The service layer must serialize purchase/renewal and allow at most one currently active entitlement per user/course.

## Progress, quizzes, and credentials

### LessonProgress

Stores one progress row per enrollment and lesson, including percentage, media position, total watched seconds, completion, and first/last activity times. Updates are idempotent and constrained to the owning enrollment.

### Quiz

Defines an optional module/lesson assessment with publication state, passing percentage, attempt cap, and optional time limit. Published questions are snapshotted when an attempt begins.

### Question

Stores an ordered MCQ or essay prompt with decimal point value. It is authoring data; attempt-time copies prevent later instructor edits from changing an existing attempt.

### QuestionOption

Stores the ordered choices and correctness flag for an MCQ authoring question. Correctness is never returned to a student before grading.

### QuizAttempt

Tracks an enrolled student's numbered attempt, frozen maximum score, deadline, submission, review, and grading lifecycle. `(userId, quizId, attemptNumber)` prevents duplicate attempt numbers.

### AttemptQuestion

Freezes prompt, type, points, and order for a particular attempt while optionally retaining a link to its source question. This is the immutable grading record even if source content is later edited or removed.

### AttemptQuestionOption

Freezes an MCQ option's text, correctness, and order for one attempt question. Student-facing serializers must omit `isCorrectSnapshot` until the attempt is eligible for review.

### AttemptAnswer

Stores one answer per attempt question: a selected frozen option or essay text. Automatic and manual points remain separate, with optional instructor feedback, grader, and grading timestamp.

### Certificate

Represents one idempotently generated certificate per enrollment, with a globally unique certificate number, generation status, private file key, issue time, and retry failure information.

## Student experience and managed content

### CourseFavorite

Stores a student's saved course once per user/course pair. Cascade deletion keeps this convenience data independent from financial history.

### CourseView

Aggregates first/last viewing time and count for one user/course pair. It supports recently viewed courses and popularity signals without recording an unbounded row for every page hit.

### LearningActivity

Aggregates daily watched time, completed lessons, and submitted quizzes per user. The unique user/date key makes dashboard and streak updates idempotent.

### Testimonial

Stores one rating/comment per user/course with pending, approved, or rejected moderation state. Moderator identity and time provide accountability; only approved records are public.

### FAQ

Stores centrally managed question/answer content with unique ordering and active state. Inactive entries remain editable but are excluded from public responses.

### PlatformSetting

Stores typed JSON values under unique keys for centrally managed platform content and metrics. Optional updater identity and timestamps provide a lightweight change trail alongside audit logs.

### Notification

Stores a user's in-app notification with type, localized title/body, optional structured navigation data, and read timestamp. The indexed unread feed supports pagination without exposing another user's messages.

### NotificationPreference

Provides one preference record per user for email and in-app payment, course-update, and quiz-result channels. Defaults opt into transactional communication and can be changed from the student profile.
