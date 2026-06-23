import * as service from '../services/reports.service.mjs';
import { sendSuccess, sendError } from '../utils/response.mjs';
import logger from '../config/logger.mjs';

export async function getWeeklyConversationQuality(req, res) {
  try {
    const result = await service.weeklyConversationQuality();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyConversationQuality: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyCallsByAgent(req, res) {
  try {
    const result = await service.weeklyCallsByAgent();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyCallsByAgent: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyUsageTotals(req, res) {
  try {
    const result = await service.weeklyUsageTotals();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyUsageTotals: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyAvgLlmLatency(req, res) {
  try {
    const result = await service.weeklyAvgLlmLatency();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyAvgLlmLatency: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyAvgTtsLatency(req, res) {
  try {
    const result = await service.weeklyAvgTtsLatency();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyAvgTtsLatency: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyInterruptionRate(req, res) {
  try {
    const result = await service.weeklyInterruptionRate();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyInterruptionRate: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyCallsByDay(req, res) {
  try {
    const result = await service.weeklyCallsByDay();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyCallsByDay: ${err.message}`);
    sendError(res, err);
  }
}

export async function getWeeklyTotalCalls(req, res) {
  try {
    const result = await service.weeklyTotalCalls();
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getWeeklyTotalCalls: ${err.message}`);
    sendError(res, err);
  }
}
