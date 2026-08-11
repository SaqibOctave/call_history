import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import env from '../../config/env.mjs';
import AppError from '../../utils/AppError.mjs';

// One MCP client connection per provider, spawned on first use and reused after that.
const clients = new Map();

function getServerConfig(provider) {
  const config = env.scraping.mcpServers[provider];
  if (!config) {
    throw new AppError(`Unknown scraper provider: ${provider}`, 400);
  }
  return config;
}

async function getClient(provider) {
  if (clients.has(provider)) return clients.get(provider);

  const { command, args, env: serverEnv } = getServerConfig(provider);
  const transport = new StdioClientTransport({
    command,
    args,
    env: { ...process.env, ...(serverEnv || {}) },
  });

  const client = new Client({ name: 'scraping-orchestrator', version: '1.0.0' });

  // The underlying MCP server is a child process and can die mid-session (crash,
  // OOM, etc). Evict it from the cache so the next call spawns a fresh one instead
  // of reusing a dead connection.
  client.onclose = () => clients.delete(provider);
  client.onerror = () => clients.delete(provider);

  await client.connect(transport);

  clients.set(provider, client);
  return client;
}

export async function callTool(provider, toolName, toolArgs) {
  const client = await getClient(provider);
  const result = await client.callTool({ name: toolName, arguments: toolArgs });

  if (result.isError) {
    const message = Array.isArray(result.content)
      ? result.content.map((c) => c.text || '').join(' ')
      : `MCP tool "${toolName}" failed`;
    throw new AppError(`${provider} MCP tool "${toolName}" failed: ${message}`, 502);
  }

  return result;
}

export async function closeAll() {
  await Promise.all([...clients.values()].map((client) => client.close()));
  clients.clear();
}
