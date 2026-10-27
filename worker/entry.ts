// Worker entry. worker/generated/content.json is written by scripts/build-worker-content.ts
// right before `wrangler deploy` and is not committed (it contains upcoming answers).
import content from './generated/content.json';
import { createWorker } from './src/app';
import type { WorkerContent } from './src/env';

export default createWorker(content as WorkerContent);
