const fs = require('fs');
const path = require('path');

// Allow overriding input/output via CLI args while preserving existing defaults
// Usage:
//   node scripts/generate-closure-pdf.js [input_md_path] [output_pdf_path]
// Examples:
//   node scripts/generate-closure-pdf.js
//   node scripts/generate-closure-pdf.js "docs/Project Completion Report.md" "docs/Project Completion Report.pdf"
const args = process.argv.slice(2);
const defaultMarkdown = path.resolve(__dirname, '..', 'docs', 'PROJECT_CLOSURE_REPORT.md');
const defaultOutput = path.resolve(__dirname, '..', 'docs', 'PROJECT_CLOSURE_REPORT.pdf');

const markdownPath = path.resolve(__dirname, '..', args[0] || defaultMarkdown);
const outputPath = path.resolve(__dirname, '..', args[1] || defaultOutput);

if (!fs.existsSync(markdownPath)) {
  console.error(`[ERROR] Markdown file not found: ${markdownPath}`);
  process.exit(1);
}

let content = fs.readFileSync(markdownPath, 'utf-8');

// Extract headings for TOC
const headingLines = [];
const lines = content.split('\n');
for (const line of lines) {
  const match = line.match(/^(#{1,3})\s+(.+)/);
  if (match) {
    const level = match[1].length;
    const text = match[2].replace(/\[TBD\]/g, '[TBD]').replace(/\*\*/g, '');
    headingLines.push({ level, text });
  }
}

// Build TOC markdown
let toc = '# Table of Contents\n\n';
for (const h of headingLines) {
  if (h.level === 1) continue; // skip the main title "Project Closure Report"
  const indent = '  '.repeat(h.level - 1);
  const anchor = h.text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  toc += `${indent}- [${h.text}](#${anchor})\n`;
}
toc += '\n---\n\n';

// Insert TOC after the front matter (title, metadata, horizontal rule)
const insertIndex = content.indexOf('---\n\n', content.indexOf('---\n') + 4) + 4;
content = content.slice(0, insertIndex) + toc + content.slice(insertIndex);

// Write modified markdown to temp file (next to the input markdown)
const docDir = path.dirname(markdownPath);
const baseName = path.basename(markdownPath, path.extname(markdownPath));
const tempMarkdown = path.join(docDir, `${baseName}._with_toc.md`);
fs.writeFileSync(tempMarkdown, content, 'utf-8');

console.log(`TOC generated for: ${markdownPath}`);
console.log('Running md-to-pdf...');

const { execSync } = require('child_process');

// Write config file to avoid shell quoting issues (next to the input markdown)
const configPath = path.join(docDir, '_pdf-config.json');
const pdfConfig = {
  stylesheet: [path.join(docDir, 'pdf.css')],
  "pdf-options": {
    format: "A4",
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
  }
};
fs.writeFileSync(configPath, JSON.stringify(pdfConfig), 'utf-8');

try {
  execSync(
    `npx md-to-pdf "${tempMarkdown}" --config-file "${configPath}"`,
    {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      timeout: 60000,
    }
  );

  // Move the output to the final name
  const tempPdf = tempMarkdown.replace('.md', '.pdf');
  if (fs.existsSync(tempPdf)) {
    fs.renameSync(tempPdf, outputPath);
    console.log(`\nPDF generated: ${outputPath}`);
  } else {
    console.error('PDF output not found at expected path:', tempPdf);
  }
} catch (err) {
  console.error('md-to-pdf failed:', err.message);
  process.exit(1);
} finally {
  // Cleanup temp files
  if (fs.existsSync(tempMarkdown)) fs.unlinkSync(tempMarkdown);
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
}
