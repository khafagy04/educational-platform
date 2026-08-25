# Video delivery threat model

Status: Phase 6 local implementation review complete; real Cloudflare Stream verification pending.

## Assets and trust boundaries

Protected assets are provider API credentials, permanent provider video IDs, one-time instructor upload URLs, signed playback tokens, paid course content, and enrollment state. Browser requests, access tokens, provider responses, upload clients, and future provider webhooks are untrusted. Controllers validate requests, the video service authorizes access, the repository is the only Prisma boundary, and the provider adapter is the only Cloudflare boundary.

## Threats and controls

| Threat                                            | Control                                                                                                                         | Verification                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Public playback by permanent ID                   | Every created Cloudflare asset sets `requireSignedURLs: true`; student responses never include `providerVideoId`                | Integration tests reject the private asset ID and field name in upload and playback responses |
| Playback by an unauthenticated user               | Access JWT middleware runs before token issuance                                                                                | Integration test expects 401 without a bearer token                                           |
| Playback by a non-enrolled or expired student     | Repository requires the exact course, `ACTIVE` status, `startsAt <= now`, and `expiresAt > now` before contacting the provider  | Integration tests expect 403 for an outsider and an expired enrollment                        |
| Long-lived token sharing                          | Playback grants default to 600 seconds and are issued on demand; issuance is rate limited                                       | Integration test checks an expiry near ten minutes                                            |
| Hotlinking a stolen signed token                  | Provider asset creation applies the configured application hosts as Cloudflare Allowed Origins                                  | Real-domain verification remains a provider gate                                              |
| Provider credential exposure to browsers          | The API creates a scoped one-time direct-upload URL; the Cloudflare API token remains server-side                               | Upload response contains only the one-time URL, status, and expiry                            |
| Large or unreliable uploads exhausting API memory | Video bytes upload directly from the instructor client to the provider instead of traversing Express                            | Provider boundary test uses upload provisioning rather than multipart server buffering        |
| Upload URL reuse or interception                  | Provider upload URL is single-use and expires after fifteen minutes; it is not stored in PostgreSQL                             | Adapter sends an explicit expiry and persists only provider, provider ID, and status          |
| Cross-lesson asset substitution                   | Provider creation binds lesson ID in metadata and the database has one video per lesson plus a unique provider asset constraint | Prisma schema constraints and replacement integration test                                    |
| Orphaned provider assets on database failure      | Newly provisioned assets are deleted if persistence fails; replacement deletes the previous provider asset                      | Integration test proves replacement and deletion call the provider boundary                   |
| Token/provider abuse                              | Token issuance is rate limited; provider calls have a 15-second timeout and map failures to a generic 503                       | Static review and application error boundary                                                  |

## Residual risks and deployment gates

- A revoked or expired enrollment may retain access until its already-issued playback token expires, bounded by ten minutes.
- The current process-local limiter must move to Redis before horizontal scaling in Phase 12.
- Provider webhook handling or status polling is still needed to synchronize upload/processing failures and duration metadata.
- Real Cloudflare acceptance must prove private playback, ten-minute expiry, allowed-origin enforcement, upload completion, deletion, and secret redaction with an actual test asset.
- Browser CSP `frame-src` must allow only the configured Stream customer domain in the deployment phase.

## Review checklist

- Permanent provider IDs never appear in public or student JSON.
- Provider credentials are environment-only and never sent to the browser.
- Cloudflare assets are private at creation and carry an origin allowlist.
- Playback checks authentication and current enrollment before token generation.
- Upload URLs and playback grants are explicitly short-lived.
- Real-provider evidence remains pending and is not represented as passed.
