/**
 * Stitch Playwright demo videos + stills into Rakshak-Demo.mp4 when ffmpeg is available.
 *
 * Usage: npx ts-node utils/stitch-demo.ts
 *    or: npm run e2e:stitch
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const STILLS = path.join(ROOT, 'test-results', 'demo-stills');
const OUT = path.join(ROOT, 'Rakshak-Demo.mp4');
const WORK = path.join(ROOT, 'test-results', 'demo-stitch');

function hasFfmpeg(): boolean {
  return spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
}

function findVideos(): string[] {
  const dir = path.join(ROOT, 'test-results');
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.webm') || ent.name.endsWith('.mp4')) found.push(p);
    }
  };
  walk(dir);
  return found.sort();
}

function main(): void {
  if (!hasFfmpeg()) {
    console.error('ffmpeg not found — skipping Rakshak-Demo.mp4 stitch. Install ffmpeg to enable.');
    process.exit(0);
  }

  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(STILLS, { recursive: true });

  const stills = fs
    .readdirSync(STILLS)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(STILLS, f));

  const videos = findVideos().filter((v) => v.includes('demo') || v.includes('rakshak'));
  const inputs = videos.length ? videos : stills;

  if (!inputs.length) {
    console.error('No demo videos or stills found. Run: npm run e2e:demo');
    process.exit(1);
  }

  const listFile = path.join(WORK, 'concat.txt');
  const segments: string[] = [];

  if (stills.length) {
    // Build short clips from stills for title / section cards
    stills.forEach((png, i) => {
      const seg = path.join(WORK, `still-${String(i).padStart(2, '0')}.mp4`);
      spawnSync(
        'ffmpeg',
        [
          '-y',
          '-loop',
          '1',
          '-i',
          png,
          '-c:v',
          'libx264',
          '-t',
          '2.5',
          '-pix_fmt',
          'yuv420p',
          '-vf',
          'scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2',
          seg,
        ],
        { stdio: 'inherit' },
      );
      if (fs.existsSync(seg)) segments.push(seg);
    });
  }

  for (const v of videos) {
    const seg = path.join(WORK, `vid-${path.basename(v)}.mp4`);
    spawnSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        v,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-vf',
        'scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2',
        '-an',
        seg,
      ],
      { stdio: 'inherit' },
    );
    if (fs.existsSync(seg)) segments.push(seg);
  }

  if (!segments.length) {
    console.error('No segments produced');
    process.exit(1);
  }

  fs.writeFileSync(listFile, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', OUT],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) {
    // re-encode fallback for mixed codecs
    spawnSync(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listFile,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        OUT,
      ],
      { stdio: 'inherit' },
    );
  }

  console.log(`Wrote ${OUT}`);
}

main();
