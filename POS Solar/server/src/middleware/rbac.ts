import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized: user not authenticated', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied: role '${req.user.role}' is not authorized to perform this operation.`,
        403
      );
    }

    next();
  };
};

export const requireAdmin = requireRoles(['ADMIN', 'CEO']);
export const requireCeoOrAdmin = requireRoles(['ADMIN', 'CEO']);
export const requireManagerOrAdmin = requireRoles(['ADMIN', 'CEO', 'MANAGER']);
export const requireDealerModuleAccess = requireRoles(['ADMIN', 'CEO', 'MANAGER']);
export const requireStaff = requireRoles(['ADMIN', 'CEO', 'MANAGER']);