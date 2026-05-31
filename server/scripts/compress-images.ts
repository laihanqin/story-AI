import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DIRS = [
  path.join(__dirname, '..', 'public', 'characters'),
  path.join(__dirname, '..', 'public', 'stories'),
];

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;

async function compressFile(filePath: string): Promise<{ saved: number } | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null;

  const originalSize = fs.statSync(filePath).size;
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, ext);
  const webpPath = path.join(dir, `${baseName}.webp`);

  // Skip if webp already exists and is newer
  if (fs.existsSync(webpPath) && fs.statSync(webpPath).mtime >= fs.statSync(filePath).mtime) {
    return null;
  }

  try {
    let pipeline = sharp(filePath)
      .resize(MAX_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' });

    // Also create optimized jpg (for JPEGs) or keep as webp only (for PNGs)
    if (ext === '.png') {
      await pipeline.webp({ quality: WEBP_QUALITY }).toFile(webpPath);
      const webpSize = fs.statSync(webpPath).size;
      return { saved: originalSize - webpSize };
    } else {
      // For JPEGs, compress the original in-place AND create webp
      const tmpPath = filePath + '.tmp';
      await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmpPath);
      const newSize = fs.statSync(tmpPath).size;
      fs.unlinkSync(filePath);
      fs.renameSync(tmpPath, filePath);

      // Generate webp version
      await sharp(filePath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);

      return { saved: originalSize - newSize };
    }
  } catch (err) {
    console.error(`  ❌ ${path.basename(filePath)}: ${(err as Error).message}`);
    return null;
  }
}

async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('🖼️  图片压缩优化...\n');

  let totalSaved = 0;
  let totalProcessed = 0;
  const totalFiles: string[] = [];

  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = (await walk(dir)).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    totalFiles.push(...files);
  }

  // Show current state
  const currentTotal = totalFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`  找到 ${totalFiles.length} 张图片，当前总大小: ${(currentTotal / 1024 / 1024).toFixed(1)} MB\n`);

  for (const filePath of totalFiles) {
    const result = await compressFile(filePath);
    if (result) {
      totalSaved += result.saved;
      totalProcessed++;
      const pct = ((result.saved / (fs.statSync(filePath).size + result.saved)) * 100).toFixed(0);
      console.log(`  ✅ ${path.basename(filePath)} — 节省 ${(result.saved / 1024).toFixed(0)} KB (${pct}%)`);
    }
  }

  // Calculate new total
  const afterFiles: string[] = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    afterFiles.push(...(await walk(dir)).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.includes('.tmp')));
  }
  const afterTotal = afterFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);

  console.log(`\n📊 处理了 ${totalProcessed} 张图片`);
  console.log(`   压缩前: ${(currentTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   总体节省: ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(console.error);
