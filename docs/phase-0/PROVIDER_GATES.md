# Provider and Environment Gates

No real secret belongs in Git. Each provider receives a documented environment-variable contract and a test/sandbox adapter.

| Gate                        | Needed by           | Required evidence                                                                         |
| --------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| Locked Prisma schema        | Phase 2             | `backend/prisma/schema.prisma` plus compatibility review                                  |
| Email provider              | Phase 4             | Sandbox credentials, verified sender/domain and delivery test                             |
| Video provider choice       | Phase 6             | Account, signed-playback credentials, allowed domains and test asset                      |
| Fawaterk                    | Phase 7             | Current API/webhook documentation, sandbox credentials, webhook secret and test event IDs |
| Cloudflare R2               | Phase 5/10          | Private bucket, scoped credentials, CORS policy and signed URL test                       |
| Domains                     | Frontend/deployment | Public, API and staging hostnames                                                         |
| VPS/hosting                 | Deployment          | Target OS/architecture, firewall policy and deployment credentials                        |
| Monitoring/email recipients | Operations          | Error-tracking project and operational alert destinations                                 |

## Current status

- Sequencing exception: the owner authorized implementation to continue with deterministic local adapters while credentials are unavailable. This does not waive any production/provider acceptance check.
- Email: SMTP implementation and smoke-test command are complete; sandbox credentials, verified sender, recipient, and received-message evidence are pending.
- Video: the Cloudflare Stream adapter, private direct-upload contract, signed playback flow, and local integration tests are complete; account credentials, customer code, real test asset, allowed-domain proof, and deletion proof remain pending.
- Fawaterk: hosted-checkout and HMAC webhook adapters, transactional/idempotent processing, and local PostgreSQL tests are complete; sandbox API/vendor keys, public webhook URL, paid test invoices, replay evidence, and settlement reconciliation remain pending.
- Cloudflare R2, domains, VPS, and monitoring credentials remain pending.

Local development adapters may make early work deterministic. Provider acceptance criteria require the real sandbox and cannot be waived by a local fake.
