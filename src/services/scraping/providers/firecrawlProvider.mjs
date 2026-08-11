import * as mcpClientManager from '../mcpClientManager.mjs';

// Firecrawl already returns clean markdown, so no further extraction is needed.
export async function scrape(url) {
  const result = await mcpClientManager.callTool('firecrawl', 'firecrawl_scrape', {
    url,
    formats: ['markdown'],
  });
  return { toolName: 'firecrawl_scrape', result };
}
