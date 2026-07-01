# CV Rank

Rubric-first CV readiness checker for Kuza Kizazi.

## V1 scope

- Upload PDF or DOCX CVs.
- Optional job description matching.
- Rule-based profile classification.
- Profile-specific scoring rubrics.
- ATS parsing warning when extraction quality is poor.
- Suggestion-only feedback.
- Paid report download placeholder for Flutterwave.
- CTA path into `cv.kuzakizazi.com` for users who need to rebuild their CV.

## Suggested domain

Use `cvrank.kuzakizazi.com` for the checker. It is clear and pairs well with `cv.kuzakizazi.com`.

Other options:

- `reviewcv.kuzakizazi.com`
- `scorecv.kuzakizazi.com`
- `cvcheck.kuzakizazi.com`

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill payment keys when Flutterwave is ready.

## Coolify

Deploy with the included `Dockerfile` or `docker-compose.yml`.

Set these environment variables in Coolify:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CV_BUILDER_URL`
- `REPORT_PRICE_KES`
- `FLUTTERWAVE_PUBLIC_KEY`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_BASE_URL`
- `FLUTTERWAVE_WEBHOOK_SECRET`
- `FLUTTERWAVE_SECRET_HASH`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_REPLY_TO`

Use this health check path in Coolify:

```txt
/api/health
```

If you deploy with Docker Compose, keep the `cvrank_data` volume attached so paid report records survive container restarts during the V1 file-storage phase.

## Flutterwave

Set the Flutterwave redirect URL to:

```txt
https://cvrank.kuzakizazi.com/payment/complete
```

Set the webhook URL to:

```txt
https://cvrank.kuzakizazi.com/api/payments/flutterwave/webhook
```

The app verifies successful transactions server-side before unlocking the report download.

## Email

Resend is used to email the paid report download link after payment verification. Configure `RESEND_API_KEY` and a verified sender in `RESEND_FROM`.
