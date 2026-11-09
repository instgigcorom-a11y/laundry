import sharp from 'sharp';
import { stat } from 'node:fs/promises';

// Deterministic re-encoding of the existing photograph; no image generation.
for (const width of [480, 768, 1145]) {
  const output = `public/images/home-laundry-hero-${width}.webp`;
  await sharp('public/images/home-laundry-hero.png').resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(output);
  console.log(`${output}: ${(await stat(output)).size} bytes`);
}
await sharp('public/whatsapp-icon.png').resize(76, 76).webp({ quality: 85 }).toFile('public/whatsapp-icon.webp');

// Social-only derivative: reuse the existing photograph and official logo.
// It is referenced in metadata, not downloaded as visible page content.
const logo = await sharp('public/prem-power-laundry-logo.svg').resize({ width: 420 }).png().toBuffer();
await sharp('public/images/home-laundry-hero-1145.webp').resize(1200, 630, { fit: 'cover', position: 'centre' }).composite([{ input: logo, left: 40, top: 40 }]).jpeg({ quality: 82, mozjpeg: true }).toFile('public/images/ppl-wash-social.jpg');
