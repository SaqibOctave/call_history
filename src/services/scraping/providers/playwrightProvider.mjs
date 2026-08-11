import * as mcpClientManager from '../mcpClientManager.mjs';

// browser_evaluate wraps its return value as `### Result\n<JSON-stringified value>\n### Ran ...`.
// Unwrap that down to the plain decoded string so the normalizer sees clean text.
function unwrapEvaluateResult(mcpResult) {
  const block = mcpResult?.content?.find((c) => c.type === 'text');
  if (!block) return '';

  const match = block.text.match(/^### Result\n([\s\S]*?)\n### /);
  const jsonSlice = match ? match[1] : block.text.replace(/^### Result\n/, '');

  try {
    return JSON.parse(jsonSlice);
  } catch {
    return jsonSlice;
  }
}

// Navigates a real browser to the page, then reads back document.body.innerText.
// (browser_snapshot returns Playwright's accessibility tree — useful for driving
// clicks/actions, but mostly automation markup, not the page's actual content.)
export async function scrape(url) {
  await mcpClientManager.callTool('playwright', 'browser_navigate', { url });
  const result = await mcpClientManager.callTool('playwright', 'browser_evaluate', {
    function: '() => document.body.innerText',
  });

  const text = unwrapEvaluateResult(result);
  return { toolName: 'browser_evaluate', result: { content: [{ type: 'text', text }] } };
}
