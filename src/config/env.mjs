import 'dotenv/config';

export default {
  scraping: {
    defaultProvider: process.env.SCRAPER_PROVIDER || 'playwright',
    requestTimeoutMs: Number(process.env.SCRAPER_TIMEOUT_MS ?? 30000),

    mcpServers: {
      playwright: {
        command: process.env.MCP_PLAYWRIGHT_COMMAND || 'npx',
        // --isolated: each connection gets its own browser profile, so a leftover or
        // concurrent session never collides with "Browser is already in use".
        args: (process.env.MCP_PLAYWRIGHT_ARGS || '-y @playwright/mcp@latest --isolated').split(' '),
      },
      fetch: {
        command: process.env.MCP_FETCH_COMMAND || 'uvx',
        args: (process.env.MCP_FETCH_ARGS || 'mcp-server-fetch').split(' '),
      },
      firecrawl: {
        command: process.env.MCP_FIRECRAWL_COMMAND || 'npx',
        args: (process.env.MCP_FIRECRAWL_ARGS || '-y firecrawl-mcp').split(' '),
        env: {
          FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
        },
      },
    },
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  flow: {
    // 'summary': OpenAI condenses scraped content into ~summaryWordLimit words for
    // role_messages. 'full': the scraped content (up to maxContentChars) is used
    // as-is, no LLM call.
    contentMode: process.env.FLOW_CONTENT_MODE === 'full' ? 'full' : 'summary',
    summaryWordLimit: Number(process.env.FLOW_SUMMARY_WORD_LIMIT ?? 300),
    maxContentChars: Number(process.env.FLOW_MAX_CONTENT_CHARS ?? 60000),
  },

  knowledgeBase: {
    // Mimetypes accepted for knowledgeBase.type === 'file' uploads (POST /api/agents).
    // Each type here must have a matching extraction branch in
    // src/services/knowledgeBase/fileExtractor.mjs — this only controls which of the
    // *implemented* types are currently allowed, not add new ones.
    allowedFileTypes: (process.env.KB_ALLOWED_FILE_TYPES || 'application/pdf,text/csv')
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean),
    maxFileSizeBytes: Number(process.env.KB_MAX_FILE_SIZE_BYTES ?? 25 * 1024 * 1024),
  },
};
