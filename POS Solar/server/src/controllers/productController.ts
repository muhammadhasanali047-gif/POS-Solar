import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logAudit } from '../middleware/audit';
import { FirebaseService } from '../services/firebaseService';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category_id, brand_id, search, is_serialized } = req.query;

    const where: any = { is_active: true };
    if (category_id) where.category_id = String(category_id);
    if (brand_id) where.brand_id = String(brand_id);
    if (is_serialized !== undefined) where.is_serialized = is_serialized === 'true';

    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { name: { contains: q } },
        { model_number: { contains: q } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        variants: true,
        inventories: {
          include: { warehouse: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enriched = products.map((p) => {
      const totalStock = p.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const availableStock = p.inventories.reduce((sum, inv) => sum + inv.available_qty, 0);
      return {
        ...p,
        totalStock,
        availableStock,
        isLowStock: totalStock <= p.min_stock_alert,
      };
    });

    return sendSuccess(res, enriched);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: true,
        inventories: { include: { warehouse: true } },
        serial_numbers: { take: 50 },
      },
    });
    if (!product) return sendError(res, 'Product not found', 404);
    return sendSuccess(res, product);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

async function resolveOrCreateCategoryId(input: string): Promise<string> {
  if (!input || !input.trim()) throw new Error('Category is required');
  const trimmed = input.trim();

  // Try finding by ID
  const byId = await prisma.category.findUnique({ where: { id: trimmed } });
  if (byId) return byId.id;

  // Try finding by Name
  const byName = await prisma.category.findFirst({
    where: { name: { equals: trimmed } },
  });
  if (byName) return byName.id;

  // Create new category
  const slug =
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || `cat-${Date.now()}`;

  const newCat = await prisma.category.create({
    data: {
      name: trimmed,
      slug,
      is_active: true,
    },
  });
  FirebaseService.syncCategory(newCat).catch(() => {});
  return newCat.id;
}

async function resolveOrCreateBrandId(input: string): Promise<string> {
  if (!input || !input.trim()) throw new Error('Brand is required');
  const trimmed = input.trim();

  // Try finding by ID
  const byId = await prisma.brand.findUnique({ where: { id: trimmed } });
  if (byId) return byId.id;

  // Try finding by Name
  const byName = await prisma.brand.findFirst({
    where: { name: { equals: trimmed } },
  });
  if (byName) return byName.id;

  // Create new brand
  const newBrand = await prisma.brand.create({
    data: {
      name: trimmed,
      is_active: true,
    },
  });
  FirebaseService.syncBrand(newBrand).catch(() => {});
  return newBrand.id;
}

export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      category_id,
      brand_id,
      model_number,
      description,
      is_serialized,
      min_stock_alert,
      purchase_price,
      sale_price,
      variants,
    } = req.body;

    if (!name || !category_id || !brand_id) {
      return sendError(res, 'Name, category, and brand are required fields', 400);
    }

    const resolvedCategoryId = await resolveOrCreateCategoryId(category_id);
    const resolvedBrandId = await resolveOrCreateBrandId(brand_id);

    const product = await prisma.product.create({
      data: {
        name,
        category_id: resolvedCategoryId,
        brand_id: resolvedBrandId,
        model_number,
        description,
        is_serialized: Boolean(is_serialized),
        min_stock_alert: Number(min_stock_alert) || 5,
        purchase_price: Number(purchase_price) || 0,
        sale_price: Number(sale_price) || 0,
        variants: variants && variants.length > 0 ? {
          create: variants.map((v: any) => ({
            name: v.name,
            sku: v.sku || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            barcode: v.barcode,
            wattage: v.wattage ? Number(v.wattage) : null,
            voltage: v.voltage ? Number(v.voltage) : null,
            capacity: v.capacity,
            technology: v.technology,
            dimensions: v.dimensions,
            weight: v.weight ? Number(v.weight) : null,
            warranty_years: v.warranty_years ? Number(v.warranty_years) : 1,
            purchase_price: v.purchase_price ? Number(v.purchase_price) : Number(purchase_price) || 0,
            sale_price: v.sale_price ? Number(v.sale_price) : Number(sale_price) || 0,
          }))
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      newData: product,
    });

    // Dual-write to Firebase Cloud Firestore
    FirebaseService.syncProduct(product).catch((err) => {
      console.error('[FIREBASE] Product cloud sync error:', err?.message || err);
    });

    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = { ...req.body };
    delete updateData.variants; // handled separately if needed
    delete updateData.id;
    delete updateData.category;
    delete updateData.brand;
    delete updateData.inventories;
    delete updateData.serial_numbers;
    delete updateData.totalStock;
    delete updateData.availableStock;

    if (updateData.purchase_price !== undefined) updateData.purchase_price = Number(updateData.purchase_price);
    if (updateData.sale_price !== undefined) updateData.sale_price = Number(updateData.sale_price);
    if (updateData.min_stock_alert !== undefined) updateData.min_stock_alert = Number(updateData.min_stock_alert);
    if (updateData.is_serialized !== undefined) updateData.is_serialized = Boolean(updateData.is_serialized);

    if (updateData.category_id) {
      updateData.category_id = await resolveOrCreateCategoryId(updateData.category_id);
    }
    if (updateData.brand_id) {
      updateData.brand_id = await resolveOrCreateBrandId(updateData.brand_id);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, brand: true, variants: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      newData: updated,
    });

    // Dual-write to Firebase Cloud Firestore
    FirebaseService.syncProduct(updated).catch((err) => {
      console.error('[FIREBASE] Product cloud update error:', err?.message || err);
    });

    return sendSuccess(res, updated, 'Product updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    const salesCount = await prisma.saleItem.count({ where: { product_id: id } });
    const purchaseCount = await prisma.purchaseItem.count({ where: { product_id: id } });

    if (salesCount > 0 || purchaseCount > 0) {
      // Soft-delete to preserve invoice & accounting integrity
      await prisma.product.update({
        where: { id },
        data: { is_active: false },
      });
      await logAudit({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Product',
        entityId: id,
        newData: { is_active: false, reason: 'Archived due to existing transaction history' },
      });
      FirebaseService.syncProduct({ id, is_active: false }).catch(() => {});
      return sendSuccess(res, null, 'Product archived and removed from active catalog.');
    }

    // Clean delete if no transaction history
    await prisma.solarPackageItem.deleteMany({ where: { product_id: id } });
    await prisma.serialNumber.deleteMany({ where: { product_id: id } });
    await prisma.inventoryTransaction.deleteMany({ where: { product_id: id } });
    await prisma.inventory.deleteMany({ where: { product_id: id } });
    await prisma.productVariant.deleteMany({ where: { product_id: id } });
    await prisma.product.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Product',
      entityId: id,
      newData: { deleted: true },
    });

    FirebaseService.deleteProduct(id).catch(() => {});

    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, categories);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, 'Category name is required', 400);
    }
    const trimmedName = name.trim();
    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName } },
          { slug: { equals: slug } },
        ],
      },
    });

    if (existing) {
      return sendError(res, 'A category with this name already exists', 400);
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug,
        description: description?.trim() || null,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      newData: category,
    });

    FirebaseService.syncCategory(category).catch(() => {});

    return sendSuccess(res, category, 'Category created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    const dataToUpdate: any = {};
    if (name && name.trim() && name.trim() !== category.name) {
      const trimmedName = name.trim();
      const slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const existing = await prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            { name: { equals: trimmedName } },
            { slug: { equals: slug } },
          ],
        },
      });

      if (existing) {
        return sendError(res, 'Another category with this name already exists', 400);
      }

      dataToUpdate.name = trimmedName;
      dataToUpdate.slug = slug;
    }

    if (description !== undefined) {
      dataToUpdate.description = description?.trim() || null;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Category',
      entityId: id,
      newData: updated,
    });

    FirebaseService.syncCategory(updated).catch(() => {});

    return sendSuccess(res, updated, 'Category updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    const productCount = await prisma.product.count({
      where: { category_id: id },
    });

    if (productCount > 0) {
      return sendError(
        res,
        `Cannot delete category "${category.name}". It is currently assigned to ${productCount} product(s). Please reassign or delete these products first.`,
        400
      );
    }

    await prisma.category.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Category',
      entityId: id,
      newData: { deleted: true, name: category.name },
    });

    return sendSuccess(res, null, `Category "${category.name}" deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, brands);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, country } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, 'Brand name is required', 400);
    }
    const trimmedName = name.trim();

    const existing = await prisma.brand.findFirst({
      where: {
        name: { equals: trimmedName },
      },
    });

    if (existing) {
      return sendError(res, `Brand "${trimmedName}" already exists`, 400);
    }

    const brand = await prisma.brand.create({
      data: {
        name: trimmedName,
        country: country?.trim() || null,
        is_active: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Brand',
      entityId: brand.id,
      newData: brand,
    });

    FirebaseService.syncBrand(brand).catch(() => {});

    return sendSuccess(res, brand, 'Brand created successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, country } = req.body;

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return sendError(res, 'Brand not found', 404);
    }

    const dataToUpdate: any = {};
    if (name && name.trim() && name.trim() !== brand.name) {
      const trimmedName = name.trim();
      const existing = await prisma.brand.findFirst({
        where: {
          id: { not: id },
          name: { equals: trimmedName },
        },
      });

      if (existing) {
        return sendError(res, `Another brand named "${trimmedName}" already exists`, 400);
      }
      dataToUpdate.name = trimmedName;
    }

    if (country !== undefined) {
      dataToUpdate.country = country?.trim() || null;
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Brand',
      entityId: id,
      newData: updated,
    });

    FirebaseService.syncBrand(updated).catch(() => {});

    return sendSuccess(res, updated, 'Brand updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return sendError(res, 'Brand not found', 404);
    }

    const productCount = await prisma.product.count({
      where: { brand_id: id },
    });

    if (productCount > 0) {
      return sendError(
        res,
        `Cannot delete brand "${brand.name}". It is currently assigned to ${productCount} product(s). Please reassign or update those products first.`,
        400
      );
    }

    await prisma.brand.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Brand',
      entityId: id,
      newData: { deleted: true, name: brand.name },
    });

    return sendSuccess(res, null, `Brand "${brand.name}" deleted successfully`);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};