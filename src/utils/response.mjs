import { StatusCodes } from 'http-status-codes';

export const HTTP_STATUS = {
  OK:                    StatusCodes.OK,
  CREATED:               StatusCodes.CREATED,
  BAD_REQUEST:           StatusCodes.BAD_REQUEST,
  UNAUTHORIZED:          StatusCodes.UNAUTHORIZED,
  FORBIDDEN:             StatusCodes.FORBIDDEN,
  NOT_FOUND:             StatusCodes.NOT_FOUND,
  INTERNAL_SERVER_ERROR: StatusCodes.INTERNAL_SERVER_ERROR,
};

export function sendSuccess(res, data) {
  return res.status(HTTP_STATUS.OK).json(data);
}

export function sendCreated(res, data) {
  return res.status(HTTP_STATUS.CREATED).json(data);
}

export function sendError(res, err) {
  // Two error shapes exist in this codebase: createError() below sets `.status`,
  // while AppError (src/utils/AppError.mjs, used by the scraping/knowledge-base
  // modules) sets `.statusCode`. Check both so either kind maps to its real HTTP
  // status instead of silently falling back to 500.
  const status = err.status ?? err.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
  return res.status(status).json({ error: err.message });
}

export function createError(message, status) {
  return Object.assign(new Error(message), { status });
}
