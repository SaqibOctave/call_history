import bcrypt from 'bcryptjs';
import { findUserByEmail } from '../repositories/user.repository.mjs';
import { saveRefreshToken, findRefreshToken, deleteRefreshToken, deleteAllUserRefreshTokens } from '../repositories/auth.repository.mjs';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.mjs';
import { sendSuccess, sendError, createError, HTTP_STATUS } from '../utils/response.mjs';
import logger from '../config/logger.mjs';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
  secure:   process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'strict',
  maxAge:   Number(process.env.COOKIE_MAX_AGE_DAYS || 7) * 24 * 60 * 60 * 1000,
};

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, createError('email and password are required', HTTP_STATUS.BAD_REQUEST));
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return sendError(res, createError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED));
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return sendError(res, createError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED));
    }

    const payload      = { user_id: user.user_id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await saveRefreshToken({ user_id: user.user_id, token: refreshToken, expires_at: expiresAt });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);

    logger.info(`User ${user.email} logged in`);

    sendSuccess(res, {
      access_token: accessToken,
      user: {
        user_id:           user.user_id,
        first_name:        user.first_name,
        last_name:         user.last_name,
        email:             user.email,
        role:              user.role,
        organization_name: user.organization_name,
        profile_pic:       user.profile_pic,
      },
    });
  } catch (err) {
    logger.error(`login: ${err.message}`);
    sendError(res, err);
  }
}

export async function refresh(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!token) {
      return sendError(res, createError('Refresh token required', HTTP_STATUS.UNAUTHORIZED));
    }

    const stored = await findRefreshToken(token);
    if (!stored || new Date(stored.expires_at) < new Date()) {
      return sendError(res, createError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED));
    }

    const payload     = verifyRefreshToken(token);
    const accessToken = signAccessToken({ user_id: payload.user_id, email: payload.email, role: payload.role });

    sendSuccess(res, { access_token: accessToken });
  } catch (err) {
    logger.error(`refresh: ${err.message}`);
    sendError(res, createError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED));
  }
}

export async function logout(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (token) {
      await deleteRefreshToken(token);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);

    logger.info(`User logged out`);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    logger.error(`logout: ${err.message}`);
    sendError(res, err);
  }
}

export async function logoutAll(req, res) {
  try {
    await deleteAllUserRefreshTokens(req.user.user_id);
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
    sendSuccess(res, { message: 'Logged out from all devices' });
  } catch (err) {
    logger.error(`logoutAll: ${err.message}`);
    sendError(res, err);
  }
}
