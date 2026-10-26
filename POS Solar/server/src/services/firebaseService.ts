import { firestore, isFirebaseConnected, projectId } from '../config/firebase';
import prisma from '../config/database';

export class FirebaseService {
  /**
   * Check connection status and get collection counts
   */
  static async getStatus() {
    if (!firestore || !isFirebaseConnected) {
      return {
        connected: false,
        projectId: projectId || 'Not configured',
        status: 'DISCONNECTED',
        counts: {
          products: 0,
          inventory: 0,
          categories: 0,
          brands: 0,
          customers: 0,
          sales: 0,
        },
      };
    }

    try {
      // Fetch counts or collections
      const productsSnap = await firestore.collection('products').count().get();
      const inventorySnap = await firestore.collection('inventory').count().get();
      const categoriesSnap = await firestore.collection('categories').count().get();
      const brandsSnap = await firestore.collection('brands').count().get();
      const customersSnap = await firestore.collection('customers').count().get();
      const salesSnap = await firestore.collection('sales').count().get();

      return {
        connected: true,
        projectId: projectId,
        status: 'CONNECTED',
        counts: {
          products: productsSnap.data().count,
          inventory: inventorySnap.data().count,
          categories: categoriesSnap.data().count,
          brands: brandsSnap.data().count,
          customers: customersSnap.data().count,
          sales: salesSnap.data().count,
        },
      };
    } catch (err: any) {
      console.error('[FIREBASE] Status check error:', err?.message || err);
      return {
        connected: true,
        projectId: projectId,
        status: 'PARTIAL',
        error: err?.message || String(err),
        counts: {
          products: 0,
          inventory: 0,
          categories: 0,
          brands: 0,
          customers: 0,
          sales: 0,
        },
      };
    }
  }

  /**
   * Sync a single Product to Firebase Firestore
   */
  static async syncProduct(product: any) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      const docRef = firestore.collection('products').doc(String(product.id));
      const cleanData = {
        id: product.id,
        name: product.name,
        category_id: product.category_id,
        brand_id: product.brand_id,
        model_number: product.model_number || null,
        description: product.description || null,
        is_serialized: Boolean(product.is_serialized),
        min_stock_alert: Number(product.min_stock_alert) || 5,
        purchase_price: Number(product.purchase_price) || 0,
        sale_price: Number(product.sale_price) || 0,
        is_active: product.is_active !== undefined ? product.is_active : true,
        category_name: product.category?.name || null,
        brand_name: product.brand?.name || null,
        total_stock: product.totalStock ?? product.inventories?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) ?? 0,
        variants: product.variants ? product.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          wattage: v.wattage,
          voltage: v.voltage,
          purchase_price: v.purchase_price,
          sale_price: v.sale_price,
        })) : [],
        updated_at: new Date().toISOString(),
      };
      await docRef.set(cleanData, { merge: true });
      console.log(`[FIREBASE] Synced product to Firestore: ${product.name} (${product.id})`);
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to sync product ${product.id}:`, err?.message || err);
    }
  }

  /**
   * Delete a Product from Firebase Firestore
   */
  static async deleteProduct(productId: string) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      await firestore.collection('products').doc(String(productId)).delete();
      console.log(`[FIREBASE] Deleted product from Firestore: ${productId}`);
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to delete product ${productId}:`, err?.message || err);
    }
  }

  /**
   * Sync Inventory / Stock entry to Firestore
   */
  static async syncInventory(inventory: any) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      const docId = inventory.id || `${inventory.product_id}_${inventory.warehouse_id}_${inventory.variant_id || 'default'}`;
      const docRef = firestore.collection('inventory').doc(String(docId));
      await docRef.set({
        id: docId,
        product_id: inventory.product_id,
        variant_id: inventory.variant_id || null,
        warehouse_id: inventory.warehouse_id,
        quantity: Number(inventory.quantity) || 0,
        available_qty: Number(inventory.available_qty) || Number(inventory.quantity) || 0,
        avg_cost: Number(inventory.avg_cost) || 0,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      console.log(`[FIREBASE] Synced inventory to Firestore: ${docId}`);
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to sync inventory:`, err?.message || err);
    }
  }

  /**
   * Sync Category to Firestore
   */
  static async syncCategory(category: any) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      await firestore.collection('categories').doc(String(category.id)).set({
        id: category.id,
        name: category.name,
        description: category.description || null,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to sync category:`, err?.message || err);
    }
  }

  /**
   * Sync Brand to Firestore
   */
  static async syncBrand(brand: any) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      await firestore.collection('brands').doc(String(brand.id)).set({
        id: brand.id,
        name: brand.name,
        country: brand.country || null,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to sync brand:`, err?.message || err);
    }
  }

  /**
   * Sync Customer to Firestore
   */
  static async syncCustomer(customer: any) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      await firestore.collection('customers').doc(String(customer.id)).set({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        city: customer.city || null,
        address: customer.address || null,
        customer_type: customer.customer_type || 'RETAIL',
        credit_limit: Number(customer.credit_limit) || 0,
        current_balance: Number(customer.current_balance) || 0,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to sync customer:`, err?.message || err);
    }
  }

  /**
   * Sync Sale/Invoice to Firestore
   */
  static async syncSale(sale: any) {
    if (!firestore || !isFirebaseConnected) return;
    try {
      await firestore.collection('sales').doc(String(sale.id)).set({
        id: sale.id,
        invoice_number: sale.invoice_number,
        customer_id: sale.customer_id,
        total_amount: Number(sale.total_amount) || 0,
        paid_amount: Number(sale.paid_amount) || 0,
        payment_status: sale.payment_status,
        sale_date: sale.sale_date ? new Date(sale.sale_date).toISOString() : new Date().toISOString(),
        items: sale.items ? sale.items.map((it: any) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          total_price: Number(it.total_price) || 0,
        })) : [],
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.error(`[FIREBASE] Failed to sync sale:`, err?.message || err);
    }
  }

  /**
   * Perform a full migration/sync of all local SQLite data to Firestore
   */
  static async syncAllToFirestore() {
    if (!firestore || !isFirebaseConnected) {
      throw new Error('Firebase Firestore is not connected');
    }

    const stats = {
      categories: 0,
      brands: 0,
      products: 0,
      inventories: 0,
      customers: 0,
    };

    // 1. Sync Categories
    const categories = await prisma.category.findMany();
    const batch1 = firestore.batch();
    categories.forEach((cat) => {
      const ref = firestore!.collection('categories').doc(String(cat.id));
      batch1.set(ref, {
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    });
    await batch1.commit();
    stats.categories = categories.length;

    // 2. Sync Brands
    const brands = await prisma.brand.findMany();
    const batch2 = firestore.batch();
    brands.forEach((b) => {
      const ref = firestore!.collection('brands').doc(String(b.id));
      batch2.set(ref, {
        id: b.id,
        name: b.name,
        country: b.country || null,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    });
    await batch2.commit();
    stats.brands = brands.length;

    // 3. Sync Products
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        variants: true,
        inventories: true,
      },
    });

    for (const prod of products) {
      await this.syncProduct(prod);
      stats.products++;
    }

    // 4. Sync Inventory
    const inventories = await prisma.inventory.findMany();
    for (const inv of inventories) {
      await this.syncInventory(inv);
      stats.inventories++;
    }

    // 5. Sync Customers
    const customers = await prisma.customer.findMany();
    for (const cust of customers) {
      await this.syncCustomer(cust);
      stats.customers++;
    }

    return stats;
  }
}
