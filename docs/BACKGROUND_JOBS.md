# Background Jobs

BullMQ uses Redis with four queues: email, certificates, maintenance, and video. Production Compose enables queues and configures Redis with AOF persistence plus the required `noeviction` policy.

- API producers only wait for Redis to accept the job; SMTP delivery and certificate rendering happen in workers.
- Every job defaults to four attempts with exponential backoff. Failed attempts emit structured logs containing queue, job ID, attempt count, and error message; the last 1,000 failed jobs remain inspectable through BullMQ APIs.
- The enrollment-expiry scheduler runs daily at 02:00 UTC and replaces the Phase 7 process timer when queues are enabled.
- The video scheduler runs every five minutes. The current local/Cloudflare upload contract uses provider/webhook state, so its processor is a polling heartbeat; a provider-specific status fetch can be added behind the existing video-provider boundary without changing scheduling.
- Queue mode is controlled by `JOB_QUEUE_ENABLED`. It defaults off for isolated unit/API tests and is on in Compose deployments.
