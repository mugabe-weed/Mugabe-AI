import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Strips markdown syntax to produce plain text for Text-to-Speech
 */
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' [Code Block] ') // replace code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/#{1,6}\s*(.*)/g, '$1. ') // headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italics
    .replace(/>\s*(.*)/g, '$1') // blockquotes
    .replace(/[-*+]\s+/g, '') // bullet lists
    .replace(/\d+\.\s+/g, '') // numbered lists
    .replace(/\|.*?\|/g, '') // tables
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Sanitizes and renders markdown to HTML string safely
 */
export function renderMarkdown(content: string): string {
  if (!content) return '';
  try {
    const rawHtml = marked.parse(content) as string;
    return rawHtml;
  } catch (err) {
    console.error('Markdown parse error:', err);
    return content;
  }
}
