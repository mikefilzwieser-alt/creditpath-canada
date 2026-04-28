const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const TEAL = "#00C9A7";
const WHITE = "#FFFFFF";

function cpSvg(size) {
  const fontSize = Math.round(size * 0.5);
  const y = Math.round(size * 0.56);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${TEAL}" />
  <text
    x="50%"
    y="${y}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="${WHITE}"
  >CP</text>
</svg>`;
}

function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(6 + 16, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function writePng(filePath, size) {
  const svg = cpSvg(size);
  await sharp(Buffer.from(svg)).png().toFile(filePath);
}

async function main() {
  const publicDir = path.join(__dirname, "..", "public");
  const favicon16Path = path.join(publicDir, "favicon-16x16.png");
  const favicon32Path = path.join(publicDir, "favicon-32x32.png");
  const applePath = path.join(publicDir, "apple-touch-icon.png");
  const icoPath = path.join(publicDir, "favicon.ico");

  await writePng(favicon16Path, 16);
  await writePng(favicon32Path, 32);
  await writePng(applePath, 180);

  const png32Buffer = await sharp(Buffer.from(cpSvg(32))).png().toBuffer();
  const icoBuffer = pngToIco(png32Buffer, 32);
  await fs.writeFile(icoPath, icoBuffer);

  console.log("Generated favicon files in /public");
}

main().catch((error) => {
  console.error("Failed to generate favicon files:", error);
  process.exit(1);
});
