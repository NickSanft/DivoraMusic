// Generate per-track peak arrays for the cassette's progress-bar
// waveform. Reads each MP3 in public/audio/, decodes it via ffmpeg
// into raw PCM, downsamples into N peaks (one max-absolute-value
// sample per bucket), and writes the result to src/waveforms.json.
//
// At runtime, cassette.js loads waveforms.json and renders the
// active track's peaks as an SVG path behind the progress bar.
//
// Usage:
//   npm run waveforms:generate
//
// Re-run when the track list changes or any MP3 is re-encoded.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');
const OUT = path.join(ROOT, 'src', 'waveforms.json');

// One peak per pixel-bucket. 240 gives plenty of resolution for
// progress bars up to ~720px (browsers can smooth-stretch the SVG).
const PEAKS_PER_TRACK = 240;

// Match tracks.js — same id ↔ filename mapping.
const TRACKS = [
  { id: 'gyrefolk-docks', file: 'gyrefolk-docks.mp3' },
  { id: 'corruption-can-be-fun', file: 'corruption-can-be-fun.mp3' },
  { id: 'origins-of-the-gyre', file: 'origins-of-the-gyre-no-intro.mp3' },
];

function ffmpegPcm(filePath) {
  return new Promise((resolve, reject) => {
    // Decode to mono 16-bit signed little-endian, 8 kHz. That's
    // plenty of resolution for a visual peaks display while keeping
    // the buffer small.
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      filePath,
      '-ac',
      '1',
      '-ar',
      '8000',
      '-f',
      's16le',
      '-',
    ];
    const proc = spawn('ffmpeg', args);
    const chunks = [];
    proc.stdout.on('data', (c) => chunks.push(c));
    let stderr = '';
    proc.stderr.on('data', (c) => (stderr += c.toString()));
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`ffmpeg exited ${code}: ${stderr}`));
      else resolve(Buffer.concat(chunks));
    });
    proc.on('error', reject);
  });
}

function bufferToPeaks(buf, count) {
  // 16-bit signed little-endian samples
  const sampleCount = buf.length / 2;
  const bucketSize = Math.max(1, Math.floor(sampleCount / count));
  const peaks = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const start = i * bucketSize;
    const end = Math.min(sampleCount, start + bucketSize);
    let maxAbs = 0;
    for (let j = start; j < end; j += 1) {
      const sample = buf.readInt16LE(j * 2);
      const abs = Math.abs(sample);
      if (abs > maxAbs) maxAbs = abs;
    }
    peaks[i] = maxAbs / 32768; // 0..1
  }
  // Optional smoothing: 3-tap moving average so visuals don't look spiky.
  const smoothed = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const a = peaks[Math.max(0, i - 1)];
    const b = peaks[i];
    const c = peaks[Math.min(count - 1, i + 1)];
    smoothed[i] = (a + b + c) / 3;
  }
  // Round to 3 decimals to keep the JSON small.
  return Array.from(smoothed, (v) => Math.round(v * 1000) / 1000);
}

async function main() {
  const out = {};
  for (const t of TRACKS) {
    const filePath = path.join(AUDIO_DIR, t.file);
    process.stdout.write(`${t.id} ... `);
    const pcm = await ffmpegPcm(filePath);
    out[t.id] = bufferToPeaks(pcm, PEAKS_PER_TRACK);
    process.stdout.write(`${out[t.id].length} peaks\n`);
  }
  await fs.writeFile(OUT, `${JSON.stringify(out)}\n`);
  const stat = await fs.stat(OUT);
  // eslint-disable-next-line no-console
  console.log(`✓ Wrote ${path.relative(ROOT, OUT)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('waveform generation failed:', err);
  process.exit(1);
});
