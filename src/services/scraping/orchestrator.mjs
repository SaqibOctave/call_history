import env from '../../config/env.mjs';
import AppError from '../../utils/AppError.mjs';
import providers from './providers/index.mjs';
import * as normalizer from './normalizer.mjs';

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AppError('Scrape request timed out', 504)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function scrape(url, { provider } = {}) {
  const selected = provider || env.scraping.defaultProvider;
  const adapter = providers[selected];
  if (!adapter) {
    throw new AppError(`Unsupported scraper provider: ${selected}`, 400);
  }

  const { toolName, result } = await withTimeout(adapter.scrape(url), env.scraping.requestTimeoutMs);
  return normalizer.normalize({ provider: selected, url, toolName, result });
}
