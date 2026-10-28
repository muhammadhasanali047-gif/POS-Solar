import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { ENV } from '../config/environment';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { branch: true },
    });

    if (!user || !user.is_active) {
      return sendError(res, 'Invalid email credentials or inactive account', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials provided', 401);
    }

    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      branch_id: user.branch_id,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      branchId: user.branch_id || undefined,
      ipAddress: req.ip,
      newData: { email: user.email, role: user.role },
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          branch: user.branch,
          phone: user.phone,
          avatar_url: user.avatar_url,
        },
      },
      'Authentication successful'
    );
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { branch: true },
    });
    if (!user) return sendError(res, 'User not found', 404);

    const { password_hash, ...safeUser } = user;
    return sendSuccess(res, safeUser);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { branch: true },
      orderBy: { created_at: 'desc' },
    });
    const safeUsers = users.map(({ password_hash, ...u }) => u);
    return sendSuccess(res, safeUsers);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, role, branch_id, phone } = req.body;
    if (!email || !password || !full_name || !role) {
      return sendError(res, 'Email, password, full_name, and role are required', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return sendError(res, 'A user with this email already exists', 400);

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password_hash,
        full_name,
        role: role.toUpperCase(),
        branch_id: branch_id || null,
        phone,
      },
      include: { branch: true },
    });

    const { password_hash: _, ...safeUser } = newUser;
    return sendSuccess(res, safeUser, 'User created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return sendError(res, 'Both current password and new password are required', 400);
    }

    if (new_password.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return sendError(res, 'User not found', 404);

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    });

    await logAudit({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      newData: { email: user.email },
    });

    return sendSuccess(res, null, 'Password updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { user_id, email, new_password } = req.body;

    if ((!user_id && !email) || !new_password) {
      return sendError(res, 'User ID or Email, and new password are required', 400);
    }

    if (new_password.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long', 400);
    }

    let user;
    if (user_id) {
      user = await prisma.user.findUnique({ where: { id: user_id } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    }

    if (!user) {
      return sendError(res, 'Target user account not found', 404);
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    });

    await logAudit({
      userId: req.user?.id || 'SYSTEM',
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      newData: { email: user.email, reset_by: req.user?.email },
    });

    return sendSuccess(
      res,
      { email: user.email, role: user.role, full_name: user.full_name },
      `Password for ${user.full_name} (${user.email}) updated successfully`
    );
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};