import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';

export const getPackages = async (req: Request, res: Response) => {
  try {
    const packages = await prisma.solarPackage.findMany({
      where: { is_active: true },
      include: {
        items: {
          include: {
            package: false,
          },
        },
      },
      orderBy: { capacity_kw: 'asc' },
    });

    const enriched = await Promise.all(
      packages.map(async (pkg) => {
        const enrichedItems = await Promise.all(
          pkg.items.map(async (item) => {
            const product = await prisma.product.findUnique({
              where: { id: item.product_id },
              include: { brand: true, category: true },
            });
            const variant = item.variant_id
              ? await prisma.productVariant.findUnique({ where: { id: item.variant_id } })
              : null;
            return {
              ...item,
              product,
              variant,
            };
          })
        );
        return {
          ...pkg,
          items: enrichedItems,
        };
      })
    );

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createPackage = async (req: Request, res: Response) => {
  try {
    const { name, capacity_kw, package_type, description, base_price, items } = req.body;
    if (!name || !capacity_kw) {
      return sendError(res, 'Name and capacity in kW are required', 400);
    }

    const pkgCount = await prisma.solarPackage.count();
    const package_no = `PKG-${String(pkgCount + 1).padStart(2, '0')}KW-${Date.now().toString().slice(-4)}`;

    const newPkg = await prisma.solarPackage.create({
      data: {
        package_no,
        name,
        capacity_kw: Number(capacity_kw),
        package_type: package_type || 'ON_GRID',
        description,
        base_price: Number(base_price) || 0,
        items: items && items.length > 0 ? {
          create: items.map((i: any) => ({
            product_id: i.product_id,
            variant_id: i.variant_id || null,
            default_quantity: Number(i.quantity) || 1,
            notes: i.notes || null,
          })),
        } : undefined,
      },
      include: { items: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'SolarPackage',
      entityId: newPkg.id,
      newData: newPkg,
    });

    return sendSuccess(res, newPkg, 'Solar package created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, capacity_kw, package_type, description, base_price, items } = req.body;

    const existing = await prisma.solarPackage.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Solar package not found', 404);
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (capacity_kw !== undefined) dataToUpdate.capacity_kw = Number(capacity_kw);
    if (package_type) dataToUpdate.package_type = package_type;
    if (description !== undefined) dataToUpdate.description = description;
    if (base_price !== undefined) dataToUpdate.base_price = Number(base_price);

    if (items && Array.isArray(items)) {
      await prisma.solarPackageItem.deleteMany({ where: { package_id: id } });
      dataToUpdate.items = {
        create: items.map((i: any) => ({
          product_id: i.product_id,
          variant_id: i.variant_id || null,
          default_quantity: Number(i.quantity || i.default_quantity) || 1,
          notes: i.notes || null,
        })),
      };
    }

    const updated = await prisma.solarPackage.update({
      where: { id },
      data: dataToUpdate,
      include: { items: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'SolarPackage',
      entityId: id,
      newData: updated,
    });

    return sendSuccess(res, updated, 'Solar package updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deletePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.solarPackage.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Solar package not found', 404);
    }

    await prisma.solarPackageItem.deleteMany({ where: { package_id: id } });
    await prisma.solarPackage.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'SolarPackage',
      entityId: id,
      newData: { deleted: true },
    });

    return sendSuccess(res, null, 'Solar package deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};