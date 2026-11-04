import sharp from 'sharp';
import { stat } from 'node:fs/promises';

// Deterministic re-encoding of the existing photograph; no image generation.
for (const width of [480, 768, 1145]) {
  const output = `public/images/home-laundry-hero-${width}.webp`;
  await sharp('public/images/home-laundry-hero.png').resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(output);
  console.log(`${output}: ${(await stat(output)).size} bytes`);
}
await sharp('public/whatsapp-icon.png').resize(76, 76).webp({ quality: 85 }).toFile('public/whatsapp-icon.webp');
