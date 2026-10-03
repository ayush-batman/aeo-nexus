# Laya worker (cloud half + local worker)

Convex side (additive): table `layaAnnotations`; `convex/layaAnnotations.ts`; HTTP routes `GET /laya/pending?classifierVersion=&after=&limit=` and `POST /laya/annotations`, both bearer-protected by the Convex env var `LAYA_WORKER_SECRET` (fail closed when unset).

Rollout: `npx convex env set LAYA_WORKER_SECRET <random>` then `npx convex deploy` on the target deployment, then on the Mac run `scripts/laya/worker.mjs` (see the header for env). `LAYA_CLASSIFY_CMD` is the adapter that calls laya-mlx; it is not wired here.
