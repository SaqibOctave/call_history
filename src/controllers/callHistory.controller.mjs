import * as service from '../services/callHistory.service.mjs';
import { sendSuccess, sendError } from '../utils/response.mjs';
import logger from '../config/logger.mjs';

export async function getAllCalls(req, res) {
  try {
    const result = await service.getAllCalls(req.query);
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getAllCalls: ${err.message}`);
    sendError(res, err);
  }
}

export async function getCallById(req, res) {
  try {
    const call = await service.getCallById(req.params.id);
    sendSuccess(res, call);
  } catch (err) {
    logger.error(`getCallById: ${err.message}`);
    sendError(res, err);
  }
}

