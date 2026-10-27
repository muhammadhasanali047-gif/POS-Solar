import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

const ALL_TABS = [
  'dashboard',
  'quick-flow',
  'pos',
  'quotations',
  'packages',
  'customers',
  'products',
  'inventory',
  'serials',
  'suppliers',
  'installations',
  'warranties',
  'claims',
  'settings',
  'access',
];

const DEFAULT_MAP: Record<string, string[]> = {
  dashboard: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  'quick-flow': ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  pos: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  quotations: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  packages: ['ADMIN', 'CEO', 'MANAGER'],
  customers: ['ADMIN', 'CEO', 'MANAGER', 'CASHIER'],
  products: ['ADMIN', 'CEO', 'MANAGER'],
  inventory: ['ADMIN', 'CEO', 'MANAGER'],
  serials: ['ADMIN', 'CEO', 'MANAGER'],
  suppliers: ['ADMIN', 'CEO', 'MANAGER'],
  installations: ['ADMIN', 'CEO', 'MANAGER'],
  warranties: ['ADMIN', 'CEO', 'MANAGER'],
  claims: ['ADMIN', 'CEO', 'MANAGER'],
  settings: ['ADMIN', 'CEO'],
  access: ['ADMIN', 'CEO'],
};

export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    let roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    if (roles.length === 0) {
      // Seed initial defaults if table is empty
      const initial = [
        { name: 'ADMIN', description: 'System Administrator', permissions: JSON.stringify(['*']) },
        {
          name: 'CEO',
          description: 'Chief Executive Officer',
          permissions: JSON.stringify(ALL_TABS),
        },
        {
          name: 'MANAGER',
          description: 'Operations & Branch Manager',
          permissions: JSON.stringify([
            'dashboard', 'quick-flow', 'pos', 'quotations', 'packages', 'customers',
            'products', 'inventory', 'serials', 'suppliers', 'installations',
            'warranties', 'claims'
          ]),
        },
        {
          name: 'CASHIER',
          description: 'Sales Cashier',
          permissions: JSON.stringify(['quick-flow', 'dashboard', 'pos', 'quotations', 'customers']),
        },
      ];

      for (const r of initial) {
        await prisma.role.create({ data: r });
      }
      roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    }

    // Build tab -> roles map
    const tabMap: Record<string, string[]> = {};
    for (const tab of ALL_TABS) {
      tabMap[tab] = ['ADMIN']; // Admin always has access
    }

    for (const r of roles) {
      if (r.name === 'ADMIN') continue;
      let allowedTabs: string[] = [];
      try {
        if (r.permissions) allowedTabs = JSON.parse(r.permissions);
      } catch {}

      for (const tab of ALL_TABS) {
        if (allowedTabs.includes('*') || allowedTabs.includes(tab)) {
          if (!tabMap[tab].includes(r.name)) {
            tabMap[tab].push(r.name);
          }
        }
      }
    }

    return sendSuccess(res, {
      permissions: tabMap,
      roles: roles.map((r) => ({ id: r.id, name: r.name, description: r.description })),
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return sendError(res, 'Permissions map is required', 400);
    }

    const rolesToUpdate = ['CEO', 'MANAGER', 'CASHIER'];

    for (const roleName of rolesToUpdate) {
      // Find all tabs where roleName is present in allowedRoles
      const allowedTabs: string[] = [];
      for (const [tabKey, allowedRoles] of Object.entries(permissions)) {
        if (Array.isArray(allowedRoles) && allowedRoles.includes(roleName)) {
          allowedTabs.push(tabKey);
        }
      }

      const existingRole = await prisma.role.findUnique({ where: { name: roleName } });
      if (existingRole) {
        await prisma.role.update({
          where: { name: roleName },
          data: { permissions: JSON.stringify(allowedTabs) },
        });
      } else {
        await prisma.role.create({
          data: {
            name: roleName,
            permissions: JSON.stringify(allowedTabs),
          },
        });
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'RolePermissions',
      entityId: 'global',
      newData: permissions,
    });

    return sendSuccess(res, { permissions }, 'Tab access permissions updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};
