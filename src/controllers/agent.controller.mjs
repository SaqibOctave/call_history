
import * as service from '../services/agent.service.mjs';
import { sendSuccess, sendError } from '../utils/response.mjs';
import logger from '../config/logger.mjs';


export async function getAllAgents(req, res) {
  try {
    const result = await service.getAllAgents(req.query);
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getAllAgents: ${err.message}`);
    sendError(res, err);
  }
}

export async function getAgentById(req, res) {
  try {
    const agent = await service.getAgentById(req.params.id);
    sendSuccess(res, agent);
  } catch (err) {
    logger.error(`getAgentById: ${err.message}`);
    sendError(res, err);
  }
}