import { createRequire } from 'node:module';
// Version-pinned upstream's runtime boundary. It is bundled independently because
// its legacy compiler configuration and globals differ from this strict TS app.
export const E: any = createRequire(import.meta.url)('../.engine/engine.cjs');
