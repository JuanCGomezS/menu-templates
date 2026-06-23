import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('Falta FIREBASE_PROJECT_ID o PUBLIC_FIREBASE_PROJECT_ID en .env.');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['firebase-tools', 'deploy', '--only', 'firestore:rules', '--project', projectId],
  { stdio: 'inherit', shell: true }
);

process.exit(result.status ?? 1);
