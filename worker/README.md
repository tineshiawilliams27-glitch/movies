# Lumen Forge worker

The worker is intentionally separate from the Vercel application. It is the home for long-running video, audio, and FFmpeg jobs.

## Contract

- Listen for queued job IDs from the Redis-compatible queue.
- Fetch job metadata from the application API.
- Generate scene-sized assets with the configured provider adapter.
- Upload media to private object storage.
- Report `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, or `CANCELLED` state and real progress back to the application.
- Render final exports with FFmpeg only after all referenced media assets are available.

The current `index.ts` provides a protected health endpoint as a deployment scaffold. Add the GPU runtime and FFmpeg process runner on the worker host, not in Vercel functions.
