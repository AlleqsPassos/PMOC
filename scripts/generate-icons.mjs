// Gera os ícones do manifest/PWA a partir de scripts/icon-source.svg.
// Placeholder de marca (monograma "P+" em azul petróleo) até a identidade
// visual definitiva ser fornecida — ver AGENTS.md/seção 42 do briefing.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const svgPath = path.join(root, "scripts", "icon-source.svg");
const outDir = path.join(root, "public", "icons");

await mkdir(outDir, { recursive: true });
const svg = await readFile(svgPath);

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, file));
  console.log(`✓ ${file}`);
}

// Maskable: mesmo desenho com ~20% de padding de segurança (safe zone),
// fundo sólido preenchendo o quadrado inteiro.
const maskableSize = 512;
const innerSize = Math.round(maskableSize * 0.6);
await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: "#204a5c",
  },
})
  .composite([
    {
      input: await sharp(svg, { density: 384 }).resize(innerSize, innerSize).toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toFile(path.join(outDir, "icon-512-maskable.png"));
console.log("✓ icon-512-maskable.png");
