// Vercel serverless entry — thin wrapper around the compiled Nest app.
// Imports from dist/ (tsc-compiled) so decorator metadata is preserved
// (Vercel's esbuild does not emit NestJS DI metadata).
import handler from '../dist/src/lambda';

export default handler;
