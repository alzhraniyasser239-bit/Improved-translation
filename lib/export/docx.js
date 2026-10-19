import * as cheerio from 'cheerio';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { isRtl } from '../languages.js';

const SKIP = new Set(['script', 'style', 'noscript', 'head', 'svg', 'template', 'img', 'picture', 'video', 'audio', 'canvas']);
const INLINE = new Set([
  'a', 'span', 'b', 'strong', 'i', 'em', 'u', 'small', 'sup', 'sub', 'mark', 'abbr', 'cite', 'code',
  'label', 'font', 'time', 's', 'del', 'ins', 'br', 'q', 'kbd', 'samp', 'var', 'bdi', 'bdo',
]);
const HEADINGS = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
};

/**
 * Converts translated HTML to a Word document.
 * Supported: headings, paragraphs, bold/italic/underline, links (as styled text),
 * bullet and numbered lists, block quotes and tables. Right-to-left languages get
 * right-to-left paragraphs so Arabic, Hebrew and Persian read correctly in Word.
 * Images are not embedded.
 */
export async function htmlToDocxBuffer(html, { title = 'Translation', lang = 'en' } = {}) {
  const $ = cheerio.load(html);
  const rtl = isRtl(lang);
  const children = [];

  /* ---- inline content → flat list of text segments ---- */
  function segments(nodes, fmt = {}, out = []) {
    for (const node of nodes || []) {
      if (node.type === 'text') {
        const text = node.data.replace(/\s+/g, ' ');
        if (text) out.push({ text, ...fmt });
      } else if (node.type === 'tag' && !SKIP.has(node.name)) {
        if (node.name === 'br') {
          out.push({ br: true });
          continue;
        }
        const next = { ...fmt };
        if (node.name === 'b' || node.name === 'strong') next.bold = true;
        if (node.name === 'i' || node.name === 'em' || node.name === 'cite') next.italics = true;
        if (node.name === 'u') next.underline = true;
        if (node.name === 'a') {
          next.underline = true;
          next.color = '1F4FD8';
        }
        segments(node.children, next, out);
        // Separate flattened block elements (e.g. <div> inside <li>) with a space.
        if (!INLINE.has(node.name)) out.push({ text: ' ' });
      }
    }
    return out;
  }

  const hasText = (segs) => segs.some((s) => s.text && s.text.trim());

  function makeRuns(segs) {
    const list = segs.slice();
    // Trim whitespace at both ends of the paragraph.
    while (list.length && list[0].text !== undefined && !list[0].text.trim()) list.shift();
    while (list.length && list[list.length - 1].text !== undefined && !list[list.length - 1].text.trim()) list.pop();
    if (list.length && list[0].text !== undefined) list[0] = { ...list[0], text: list[0].text.trimStart() };
    const last = list.length - 1;
    if (last >= 0 && list[last].text !== undefined) list[last] = { ...list[last], text: list[last].text.trimEnd() };

    return list.map((s) =>
      s.br
        ? new TextRun({ break: 1 })
        : new TextRun({
            text: s.text,
            bold: s.bold,
            italics: s.italics,
            underline: s.underline ? {} : undefined,
            color: s.color,
            rightToLeft: rtl,
          })
    );
  }

  function addParagraph(segs, options = {}) {
    if (!hasText(segs)) return;
    children.push(
      new Paragraph({
        children: makeRuns(segs),
        bidirectional: rtl,
        spacing: { after: 160 },
        ...options,
      })
    );
  }

  /* ---- lists ---- */
  function addList(listNode, level = 0) {
    let n = 0;
    for (const li of (listNode.children || []).filter((c) => c.type === 'tag' && c.name === 'li')) {
      const inline = [];
      const nested = [];
      for (const c of li.children || []) {
        if (c.type === 'tag' && (c.name === 'ul' || c.name === 'ol')) nested.push(c);
        else inline.push(c);
      }
      n += 1;
      const segs = segments(inline);
      if (hasText(segs)) {
        if (listNode.name === 'ol') {
          segs.unshift({ text: `${n}. ` });
          addParagraph(segs, { indent: { left: 720 + level * 360 }, spacing: { after: 80 } });
        } else {
          addParagraph(segs, { numbering: { reference: 'bullets', level: Math.min(level, 3) }, spacing: { after: 80 } });
        }
      }
      nested.forEach((l) => addList(l, level + 1));
    }
  }

  /* ---- tables ---- */
  function addTable(tableNode) {
    const rows = $(tableNode)
      .find('tr')
      .toArray()
      .map((tr) => {
        const cells = $(tr).children('td, th').toArray();
        if (cells.length === 0) return null;
        return new TableRow({
          children: cells.map((cell) => {
            const segs = segments(cell.children, cell.name === 'th' ? { bold: true } : {});
            const runs = hasText(segs) ? makeRuns(segs) : [];
            return new TableCell({
              children: [new Paragraph({ children: runs, bidirectional: rtl })],
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
            });
          }),
        });
      })
      .filter(Boolean);
    if (rows.length === 0) return;
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, visuallyRightToLeft: rtl }));
    children.push(new Paragraph({ children: [] })); // Word needs a paragraph after a table
  }

  /* ---- block structure ---- */
  function walk(nodes, ctx = { indent: 0 }) {
    let buffer = [];
    const flush = () => {
      if (buffer.length) {
        addParagraph(segments(buffer), ctx.indent ? { indent: { left: ctx.indent } } : {});
        buffer = [];
      }
    };
    for (const node of nodes || []) {
      if (node.type === 'text') {
        buffer.push(node);
        continue;
      }
      if (node.type !== 'tag' || SKIP.has(node.name)) continue;
      if (INLINE.has(node.name)) {
        buffer.push(node);
        continue;
      }
      flush();
      if (HEADINGS[node.name]) {
        addParagraph(segments(node.children, { bold: true }), {
          heading: HEADINGS[node.name],
          spacing: { before: 240, after: 120 },
        });
      } else if (node.name === 'ul' || node.name === 'ol') {
        addList(node);
      } else if (node.name === 'table') {
        addTable(node);
      } else if (node.name === 'blockquote') {
        walk(node.children, { indent: (ctx.indent || 0) + 720 });
      } else {
        walk(node.children, ctx); // div, section, p, article ...
      }
    }
    flush();
  }

  walk($('body').get(0)?.children);
  if (children.length === 0) children.push(new Paragraph({ children: [] }));

  const doc = new Document({
    title,
    creator: 'Smart Document & Page Translator',
    styles: {
      default: { document: { run: { font: { ascii: 'Calibri', hAnsi: 'Calibri', cs: 'Arial' }, size: 22 } } },
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: level % 2 ? '◦' : '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
