import bcrypt from 'bcryptjs';
import UserRole from '../config/user_role.enum.mjs';
import * as repo from '../repositories/user.repository.mjs';
import { HTTP_STATUS, createError } from '../utils/response.mjs';

const VALID_ROLES   = Object.values(UserRole);
const EMAIL_REGEX   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS   = 10;

function parseUserId(idParam) {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) {
    throw createError('user_id must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }
  return id;
}

export async function createUser(data) {
  const { first_name, last_name, username, email, password, role } = data;

  if (!first_name?.trim()) throw createError('first_name is required', HTTP_STATUS.BAD_REQUEST);
  if (!last_name?.trim())  throw createError('last_name is required',  HTTP_STATUS.BAD_REQUEST);
  if (!username?.trim())   throw createError('username is required',   HTTP_STATUS.BAD_REQUEST);
  if (!email?.trim())      throw createError('email is required',      HTTP_STATUS.BAD_REQUEST);
  if (!password)           throw createError('password is required',   HTTP_STATUS.BAD_REQUEST);

  if (!EMAIL_REGEX.test(email)) {
    throw createError('Invalid email format', HTTP_STATUS.BAD_REQUEST);
  }
  if (password.length < 8) {
    throw createError('password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
  }
  if (role && !VALID_ROLES.includes(role)) {
    throw createError(`role must be one of: ${VALID_ROLES.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const [existingEmail, existingUsername] = await Promise.all([
    repo.findUserByEmail(email),
    repo.findUserByUsername(username),
  ]);

  if (existingEmail)    throw createError('Email already in use',    HTTP_STATUS.BAD_REQUEST);
  if (existingUsername) throw createError('Username already in use', HTTP_STATUS.BAD_REQUEST);

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  return repo.insertUser({ ...data, password: hashedPassword });
}

export async function getAllUsers(query) {
  const limit = Math.min(parseInt(query.limit ?? 25, 10), 100);
  const page  = Math.max(parseInt(query.page  ?? 1,  10), 1);

  if (isNaN(limit) || isNaN(page)) {
    throw createError('limit and page must be numbers', HTTP_STATUS.BAD_REQUEST);
  }

  const role              = query.role              ?? null;
  const organization_name = query.organization_name ?? null;

  if (role && !VALID_ROLES.includes(role)) {
    throw createError(`role must be one of: ${VALID_ROLES.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const offset = (page - 1) * limit;
  const { data, total } = await repo.findAllUsers({ limit, offset, role, organization_name });

  return {
    data,
    pagination: { total, limit, page, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUserById(idParam) {
  const id   = parseUserId(idParam);
  const user = await repo.findUserById(id);
  if (!user) throw createError('User not found', HTTP_STATUS.NOT_FOUND);
  return user;
}

export async function updateUser(idParam, data) {
  const id = parseUserId(idParam);

  const { email, username, password, role } = data;

  if (email !== undefined) {
    if (!EMAIL_REGEX.test(email)) throw createError('Invalid email format', HTTP_STATUS.BAD_REQUEST);
    const existing = await repo.findUserByEmail(email);
    if (existing && existing.user_id != id) throw createError('Email already in use', HTTP_STATUS.BAD_REQUEST);
  }

  if (username !== undefined) {
    const existing = await repo.findUserByUsername(username);
    if (existing && existing.user_id != id) throw createError('Username already in use', HTTP_STATUS.BAD_REQUEST);
  }

  if (password !== undefined) {
    if (password.length < 8) throw createError('password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
    data.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw createError(`role must be one of: ${VALID_ROLES.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const updated = await repo.updateUserById(id, data);
  if (!updated) throw createError('User not found', HTTP_STATUS.NOT_FOUND);
  return updated;
}

export async function deleteUser(idParam) {
  const id      = parseUserId(idParam);
  const deleted = await repo.deleteUserById(id);
  if (!deleted) throw createError('User not found', HTTP_STATUS.NOT_FOUND);
  return deleted;
}
