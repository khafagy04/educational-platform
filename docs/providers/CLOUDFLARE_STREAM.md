# Cloudflare Stream adapter

The production adapter provisions one-time direct-upload URLs so video bytes do not pass through the Express process. It creates assets with signed URLs required, a fifteen-minute upload expiry, lesson metadata, and the hosts derived from `CORS_ALLOWED_ORIGINS` as Allowed Origins.

Student playback uses Cloudflare's token endpoint with an explicit expiry from `VIDEO_PLAYBACK_TTL_SECONDS` (600 seconds by default). The API returns a signed iframe URL containing the token and never returns the permanent video ID.

## Environment

- `VIDEO_PROVIDER=cloudflare`
- `VIDEO_PROVIDER_ACCOUNT_ID`
- `VIDEO_PROVIDER_API_TOKEN` with Stream Write permission
- `VIDEO_CUSTOMER_CODE` used in the signed iframe hostname
- `VIDEO_PLAYBACK_TTL_SECONDS=600`
- `CORS_ALLOWED_ORIGINS` containing every approved frontend origin

Local development uses `VIDEO_PROVIDER=local`; it is deterministic infrastructure emulation, not provider acceptance evidence.

## Real-provider smoke checklist

1. Create a video upload for a dedicated test lesson as an instructor.
2. Upload a supported test video through the one-time URL before it expires.
3. Confirm the permanent-ID player and manifest are inaccessible.
4. Confirm an active enrollment receives a working signed iframe URL.
5. Confirm no login returns 401 and non-enrolled/expired accounts return 403.
6. Confirm playback stops after the configured expiry and fails from a disallowed origin.
7. Replace and delete the test asset, then confirm provider cleanup.
8. Review application and provider logs for credential, upload-URL, token, and permanent-ID leakage.

Implementation references: [Direct upload API](https://developers.cloudflare.com/api/resources/stream/subresources/direct_upload/methods/create/), [secure Stream playback](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/), and [video upload options](https://developers.cloudflare.com/stream/uploading-videos/).
