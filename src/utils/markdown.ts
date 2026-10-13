import { marked } from 'marked';
import katex from 'katex';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Parses and renders LaTeX formulas in text using KaTeX
 */
function renderMathInText(text: string): string {
  if (!text) return '';

  // Replace block math $$formula$$
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return `<div class="katex-block my-3 overflow-x-auto py-2 text-center">${katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      })}</div>`;
    } catch {
      return `$$\n${math}\n$$`;
    }
  });

  // Replace inline math $formula$ (ensuring not currency like $10 or $100)
  processed = processed.replace(/(?<!\$)\$(?!\$)((?:[^\s$]|\\\$)+?(?:[^\s$]|\\\$)*?)\$(?!\$)/g, (_, math) => {
    // Skip if it looks like a currency amount (e.g. only digits and periods/commas)
    if (/^\d+(?:[.,]\d+)?$/.test(math.trim())) {
      return `$${math}$`;
    }
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${math}$`;
    }
  });

  return processed;
}

/**
 * Strips markdown and math syntax to produce clean plain text for Text-to-Speech
 */
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/\$\$([\s\S]+?)\$\$/g, ' [formula] ')
    .replace(/(?<!\$)\$(?!\$)[\s\S]+?\$(?!\$)/g, ' [formula] ')
    .replace(/```[\s\S]*?```/g, ' [Code Block] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s*(.*)/g, '$1. ')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/>\s*(.*)/g, '$1')
    .replace(/[-*+]\s+/g, '')
    .replace(/\d+\.\s+/g, '')
    .replace(/\|.*?\|/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Sanitizes and renders markdown and mathematical notation to HTML string safely
 */
export function renderMarkdown(content: string): string {
  if (!content) return '';
  try {
    // Process math notation first
    const withMath = renderMathInText(content);
    // Parse markdown
    const rawHtml = marked.parse(withMath) as string;
    return rawHtml;
  } catch (err) {
    console.error('Markdown parse error:', err);
    return content;
  }
}
