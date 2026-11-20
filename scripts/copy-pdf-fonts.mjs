import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Next.js bundles PDFKit into a server chunk. PDFKit still looks for its
 * standard AFM fonts at `<chunk-dir>/data/*.afm`, so copy them into the
 * build output after every build. Without this, PDF routes fail with ENOENT.
 */
const onOneDrive = process.platform === 'win32' && process.cwd().toLowerCase().includes('\\onedrive\\');
const distDir = onOneDrive
  ? path.relative(process.cwd(), path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'nwef-next'))
  : '.next';

const source = path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data');
const destination = path.join(process.cwd(), distDir, 'server', 'chunks', 'data');

if (!existsSync(source)) {
  console.warn('[pdf-fonts] PDFKit font data not found; skipping copy.');
  process.exit(0);
}

mkdirSync(destination, { recursive: true });
for (const entry of readdirSync(source)) {
  if (!entry.endsWith('.afm')) continue;
  cpSync(path.join(source, entry), path.join(destination, entry));
}
console.log(`[pdf-fonts] copied PDFKit metric fonts to ${path.relative(process.cwd(), destination)}`);
