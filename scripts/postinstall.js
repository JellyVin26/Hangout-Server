// Conditional postinstall: generates the Prisma client for the right engine.
// On Vercel (VERCEL env var set), uses the Postgres schema.
// Locally, uses the default SQLite schema.
const { execSync } = require('child_process');

if (process.env.VERCEL) {
  console.log('▶ Vercel build detected — generating Postgres Prisma client...');
  // Generate the Postgres schema from the SQLite source
  const fs = require('fs');
  const src = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const postgres = src.replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync('prisma/schema.postgres.prisma', postgres);
  execSync('npx prisma generate --schema prisma/schema.postgres.prisma', { stdio: 'inherit' });
  console.log('✓ Postgres Prisma client generated');
} else {
  console.log('▶ Local install — generating SQLite Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✓ SQLite Prisma client generated');
}
