// SPDX-License-Identifier: MIT
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output'; // outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output

mkdirSync(out, { recursive: true });

cpSync(join(__dirname, 'game'), join(out, 'game'), { recursive: true });

const screenshotsSrc = join(__dirname, 'screenshots');
if (existsSync(screenshotsSrc)) {
  cpSync(screenshotsSrc, join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000
  })
);
