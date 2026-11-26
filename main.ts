import { buildDossier } from './vendor/makefun-game.ts';
import { copySync } from 'fs-extra';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

copySync(resolve(__dirname, 'game'), resolve(out, 'game'));
copySync(resolve(__dirname, 'screenshots'), resolve(out, 'screenshots'));

buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
});
