// Every MCP tool returns content as an array of typed blocks (text/image/resource).
// This flattens the text blocks into one string so callers get a consistent shape
// no matter which scraper produced the result.
function extractText(mcpResult) {
  const content = mcpResult?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n\n');
}

export function normalize({ provider, url, toolName, result }) {
  return {
    url,
    provider,
    tool: toolName,
    fetchedAt: new Date().toISOString(),
    content: extractText(result),
    raw: result,
  };
}
