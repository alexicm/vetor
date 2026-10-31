import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../tests/fixtures");

async function main() {
  await mkdir(root, { recursive: true });

  await sharp({
    create: {
      width: 240,
      height: 180,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 120,
            height: 80,
            channels: 4,
            background: { r: 255, g: 90, b: 31, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: 40,
        top: 30,
      },
    ])
    .png()
    .toFile(path.join(root, "png-transparente.png"));

  await sharp({
    create: {
      width: 320,
      height: 200,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 80,
            height: 80,
            channels: 3,
            background: { r: 20, g: 20, b: 20 },
          },
        })
          .jpeg()
          .toBuffer(),
        left: 40,
        top: 60,
      },
    ])
    .jpeg({ quality: 90 })
    .toFile(path.join(root, "jpg-fundo-branco.jpg"));

  await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
            <rect x="28" y="28" width="200" height="200" rx="24" fill="#111111"/>
            <path d="M72 176 L128 72 L184 176 Z" fill="#ff5a1f"/>
          </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(path.join(root, "logo-monocromatico.png"));

  await sharp({
    create: {
      width: 360,
      height: 240,
      channels: 3,
      background: { r: 246, g: 232, b: 214 },
    },
  })
    .composite([
      {
        input: await circle(90, "#1d4ed8"),
        left: 40,
        top: 50,
      },
      {
        input: await circle(70, "#16a34a"),
        left: 150,
        top: 80,
      },
      {
        input: await circle(50, "#dc2626"),
        left: 250,
        top: 40,
      },
    ])
    .png()
    .toFile(path.join(root, "ilustracao-colorida.png"));

  await writeFile(
    path.join(root, "svg-multiplos-paths.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
      <path d="M12 12 h80 v40 h-80 z" fill="#111111"/>
      <path d="M108 20 l40 0 l0 70 l-40 0 z" fill="#ff5a1f"/>
      <circle cx="50" cy="86" r="18" fill="#d4d4d4"/>
    </svg>`,
    "utf8",
  );

  await writeFile(
    path.join(root, "svg-viewbox.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
      <g transform="translate(10 5) scale(1.2)">
        <rect x="0" y="0" width="40" height="30" fill="#111" opacity="0.9"/>
        <path d="M50 5 h20 v20 h-20 z" fill="#ff5a1f"/>
      </g>
    </svg>`,
    "utf8",
  );

  const single = await PDFDocument.create();
  const font = await single.embedFont(StandardFonts.Helvetica);
  const page = single.addPage([400, 300]);
  page.drawText("VETOR pagina unica", { x: 48, y: 160, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
  await writeFile(path.join(root, "pdf-uma-pagina.pdf"), await single.save());

  const multi = await PDFDocument.create();
  const multiFont = await multi.embedFont(StandardFonts.Helvetica);
  for (const label of ["Uma", "Duas", "Tres"]) {
    const next = multi.addPage([400, 300]);
    next.drawText(`Pagina ${label}`, {
      x: 48,
      y: 150,
      size: 22,
      font: multiFont,
      color: rgb(0.07, 0.07, 0.07),
    });
  }
  await writeFile(path.join(root, "pdf-varias-paginas.pdf"), await multi.save());

  await sharp({
    create: {
      width: 2000,
      height: 1400,
      channels: 3,
      background: { r: 240, g: 240, b: 240 },
    },
  })
    .jpeg({ quality: 80 })
    .toFile(path.join(root, "alta-resolucao.jpg"));

  await writeFile(path.join(root, "arquivo-invalido.bin"), Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]));

  console.log(`Fixtures geradas em ${root}`);
}

async function circle(size: number, color: string) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}"/></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
