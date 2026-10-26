import prisma from '../config/database';

export const logAudit = async (params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  branchId?: string;
  ipAddress?: string;
  oldData?: any;
  newData?: any;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: params.userId,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        branch_id: params.branchId,
        ip_address: params.ipAddress,
        old_data: params.oldData ? JSON.stringify(params.oldData) : null,
        new_data: params.newData ? JSON.stringify(params.newData) : null,
      },
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
};