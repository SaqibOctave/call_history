import * as orchestrator from '../services/scraping/orchestrator.mjs';
import * as flowGenerator from '../services/scraping/flowGenerator.mjs';

export async function scrape(req, res) {
  const { url, provider } = req.body;
  const data = await orchestrator.scrape(url, { provider });
  res.json({ status: 'success', data });
}

export async function generateFlow(req, res) {
  const { url, provider } = req.body;
  const scraped = await orchestrator.scrape(url, { provider });
  const flow = await flowGenerator.generateFlow({ url: scraped.url, content: scraped.content });
  res.json({ status: 'success', data: flow });
}
