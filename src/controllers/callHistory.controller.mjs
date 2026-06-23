import * as service from '../services/callHistory.service.mjs';
import { sendSuccess, sendCreated, sendError } from '../utils/response.mjs';
import logger from '../config/logger.mjs';

export async function createCall(req, res) {
  try {
    const call = await service.createCall(req.body);
    sendCreated(res, call);
  } catch (err) {
    logger.error(`createCall: ${err.message}`);
    sendError(res, err);
  }
}

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

export async function deleteCall(req, res) {
  try {
    const deleted = await service.deleteCall(req.params.id);
    sendSuccess(res, { message: 'Call deleted successfully', data: deleted });
  } catch (err) {
    logger.error(`deleteCall: ${err.message}`);
    sendError(res, err);
  }
}

export async function bulkCreateCalls(req, res) {
  try {
    const calls = await service.bulkCreateCalls(req.body);
    sendCreated(res, { inserted: calls.length, data: calls });
  } catch (err) {
    logger.error(`bulkCreateCalls: ${err.message}`);
    sendError(res, err);
  }
}
