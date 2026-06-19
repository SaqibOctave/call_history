import * as service from '../services/user.service.mjs';
import { sendSuccess, sendCreated, sendError } from '../utils/response.mjs';
import logger from '../config/logger.mjs';

export async function createUser(req, res) {
  try {
    const user = await service.createUser(req.body);
    sendCreated(res, user);
  } catch (err) {
    logger.error(`createUser: ${err.message}`);
    sendError(res, err);
  }
}

export async function getAllUsers(req, res) {
  try {
    const result = await service.getAllUsers(req.query);
    sendSuccess(res, result);
  } catch (err) {
    logger.error(`getAllUsers: ${err.message}`);
    sendError(res, err);
  }
}

export async function getUserById(req, res) {
  try {
    const user = await service.getUserById(req.params.id);
    sendSuccess(res, user);
  } catch (err) {
    logger.error(`getUserById: ${err.message}`);
    sendError(res, err);
  }
}

export async function updateUser(req, res) {
  try {
    const updated = await service.updateUser(req.params.id, req.body);
    sendSuccess(res, updated);
  } catch (err) {
    logger.error(`updateUser: ${err.message}`);
    sendError(res, err);
  }
}

export async function deleteUser(req, res) {
  try {
    const deleted = await service.deleteUser(req.params.id);
    sendSuccess(res, { message: 'User deleted successfully', data: deleted });
  } catch (err) {
    logger.error(`deleteUser: ${err.message}`);
    sendError(res, err);
  }
}
