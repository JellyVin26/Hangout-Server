// Prepares the Prisma schema + client for Vercel (Postgres) builds.
// Keeps prisma/schema.prisma (SQLite) as the single source of truth for local dev.
const fs = require('fs');
const { execSync } = require('child_process');

const src = fs.readFileSync('prisma/schema.prisma', 'utf8');
const postgres = src
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('// SQLite used for local dev; Postgres for prod (swap the datasource URL).', '// Postgres schema generated from schema.prisma for Vercel deploys.');

fs.writeFileSync('prisma/schema.postgres.prisma', postgres);

// Generate the Prisma client bound to the Postgres engine
execSync('npx prisma generate --schema prisma/schema.postgres.prisma', { stdio: 'inherit' });
console.log('✓ Postgres schema + client generated');
