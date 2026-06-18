import * as service from '../services/callHistory.service.mjs';
import logger from '../config/logger.mjs';

export async function createCall(req, res) {
  try {
    const call = await service.createCall(req.body);
    res.status(201).json(call);
  } catch (err) {
    logger.error(`createCall: ${err.message}`);
    res.status(err.status ?? 400).json({ error: err.message });
  }
}

export async function getAllCalls(req, res) {
  try {
    const result = await service.getAllCalls(req.query);
    res.json(result);
  } catch (err) {
    logger.error(`getAllCalls: ${err.message}`);
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function getCallById(req, res) {
  try {
    const call = await service.getCallById(req.params.id);
    res.json(call);
  } catch (err) {
    logger.error(`getCallById: ${err.message}`);
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
