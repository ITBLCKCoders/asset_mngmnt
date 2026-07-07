const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const MM_TO_PT = 72 / 25.4; // points per millimeter
const A4_W = 210 * MM_TO_PT; // 595.28 pt
const A4_H = 297 * MM_TO_PT; // 841.89 pt
const MARGIN_MM = 12; // per plan
const MARGIN = MARGIN_MM * MM_TO_PT; // ~34.02 pt

const CONTENT_W = A4_W - 2 * MARGIN;
const CONTENT_H = A4_H - 2 * MARGIN;

async function main() {
  const imagePath = path.resolve(__dirname, '..', 'docs', 'erd-full-system@6x-transparent.png');
  const outPath = path.resolve(__dirname, '..', 'docs', 'erd-full-system-3page.pdf');

  if (!fs.existsSync(imagePath)) {
    console.error('Image not found at:', imagePath);
    process.exit(1);
  }

  const imgBytes = fs.readFileSync(imagePath);

  const pdfDoc = await PDFDocument.create();
  const png = await pdfDoc.embedPng(imgBytes);

  const imgW = png.width;
  const imgH = png.height;

  // Scale to respect both width constraint and the need to cover 3 pages vertically
  const scaleByWidth = CONTENT_W / imgW;
  const scaleByHeightFor3Pages = (3 * CONTENT_H) / imgH;
  const scale = Math.min(scaleByWidth, scaleByHeightFor3Pages);

  const drawW = imgW * scale;
  const drawH = imgH * scale;

  // For horizontal split: ensure the image width spans 3 pages; center vertically
  const scaleByHeight = CONTENT_H / imgH;
  const scaleByWidthFor3Pages = (3 * CONTENT_W) / imgW;
  const scaleH = Math.max(scaleByHeight, scaleByWidthFor3Pages);

  const hDrawW = imgW * scaleH;
  const hDrawH = imgH * scaleH;

  const baseX = MARGIN; // left edge of content area
  const baseY = MARGIN + (CONTENT_H - hDrawH) / 2; // center vertically within content

  for (let i = 0; i < 3; i++) {
    const page = pdfDoc.addPage([A4_W, A4_H]);

    const x = baseX - i * CONTENT_W; // shift left by one content width per page
    const y = baseY; // vertically centered already

    page.drawImage(png, {
      x,
      y,
      width: hDrawW,
      height: hDrawH,
    });

    // Enforce clean white margins by overlaying rectangles
    page.drawRectangle({ x: 0, y: A4_H - MARGIN, width: A4_W, height: MARGIN, color: rgb(1, 1, 1) }); // top
    page.drawRectangle({ x: 0, y: 0, width: A4_W, height: MARGIN, color: rgb(1, 1, 1) }); // bottom
    page.drawRectangle({ x: 0, y: 0, width: MARGIN, height: A4_H, color: rgb(1, 1, 1) }); // left
    page.drawRectangle({ x: A4_W - MARGIN, y: 0, width: MARGIN, height: A4_H, color: rgb(1, 1, 1) }); // right
  }

  const bytes = await pdfDoc.save();
  fs.writeFileSync(outPath, bytes);
  console.log(`PDF generated: ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
