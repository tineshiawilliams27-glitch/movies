# Lumen Forge rendering worker

The worker is a separate Node service for long-running video, audio, and FFmpeg jobs. It polls the Redis-compatible queue, fetches job metadata from the Next.js application, runs the existing provider pipeline, and reports progress through the protected internal API.

## Run locally

From the repository root:

```bash
pnpm exec tsx worker/index.ts
```

Required environment variables:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `WORKER_API_URL`
- `WORKER_API_SECRET`
- provider credentials used by the selected adapters

Health is available at `GET /health` on `PORT` (default `8080`). Set `WORKER_QUEUE_KEY` to override the default `generation:pending` list.
