# Lumen Forge rendering worker

The worker is a separate Node service for long-running video, audio, and FFmpeg jobs. It polls the Redis-compatible queue, fetches job metadata from the Next.js application, runs the existing provider pipeline, and reports progress through the protected internal API.

## Run locally

From the repository root:

```bash
pnpm exec tsx worker/index.ts
```

## Deploy the worker

Deploy `Dockerfile.worker` as a long-running container service. Do not deploy the worker as a Vercel serverless function: it maintains a polling loop and runs jobs that can exceed request limits.

The Next.js app remains on Vercel. The worker should run on a persistent container host with a public HTTPS URL, while Redis, Postgres, and Blob remain managed services.

### Required environment variables

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `WORKER_API_URL` — public HTTPS URL of the Next.js app
- `WORKER_API_SECRET` — same value configured in the Next.js app
- provider credentials used by the selected adapters

Recommended runtime settings:

- `PORT=8080` (the container listens on this port)
- `WORKER_QUEUE_KEY=generation:pending`
- `WORKER_POLL_INTERVAL_MS=1000`
- `NODE_ENV=production`

The worker authenticates internal API requests with the `x-worker-secret` header and `WORKER_API_SECRET`. Provider adapters use their named credentials only; legacy aliases are not supported.

## Health checks

- `GET /health` returns `200` when the worker is configured and `503` when `WORKER_API_SECRET` is missing.
- `GET /ready` requires the `x-worker-secret` header and is suitable for an authenticated readiness check.

Configure the container platform's liveness probe as `GET /health` on port `8080`. If the platform cannot send custom headers, use `/health` for both liveness and readiness.

## Service wiring

1. Deploy the Next.js app to Vercel and set its database, Blob, Redis, auth, and provider variables.
2. Deploy this worker container and set the same Redis variables, provider variables, `WORKER_API_URL`, and `WORKER_API_SECRET`.
3. Set the Vercel app's `WORKER_API_URL` to the worker's public HTTPS URL only if the web app calls worker endpoints directly; the worker itself uses `WORKER_API_URL` to call the Next.js internal job API.
4. Point the worker platform health check at `/health`.
5. Submit a small generation job and verify that it leaves `generation:pending`, progresses, and writes its result to private Blob storage.

Never commit provider tokens or `WORKER_API_SECRET`; configure them through the hosting platforms' secret/environment-variable settings.
