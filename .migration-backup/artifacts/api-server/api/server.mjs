/**
 * Vercel entry point — plain JS, no TypeScript compilation needed.
 * buildCommand runs esbuild first, producing dist/handler.mjs (fully bundled).
 * This shim just re-exports the bundled handler for Vercel to serve.
 */
import handler from '../dist/handler.mjs';
export default handler;
