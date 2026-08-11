import * as mcpClientManager from '../mcpClientManager.mjs';

// Plain HTTP GET + HTML-to-markdown conversion, no JS execution.
export async function scrape(url) {
  const result = await mcpClientManager.callTool('fetch', 'fetch', { url });
  return { toolName: 'fetch', result };
}
