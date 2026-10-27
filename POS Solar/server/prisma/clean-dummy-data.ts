import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- CLEANING ALL DUMMY DATA ---');

  // 1. Clear all operational & transactional records
  const delAudit = await prisma.auditLog.deleteMany();
  const delSync = await prisma.syncQueue.deleteMany();
  const delExpenses = await prisma.expense.deleteMany();
  const delWarrantyClaims = await prisma.warrantyClaim.deleteMany();
  const delWarranties = await prisma.warranty.deleteMany();
  const delInstallations = await prisma.installation.deleteMany();
  const delPayments = await prisma.payment.deleteMany();
  const delCommissions = await prisma.commission.deleteMany();
  const delSaleItems = await prisma.saleItem.deleteMany();
  const delSales = await prisma.sale.deleteMany();
  const delQuotationItems = await prisma.quotationItem.deleteMany();
  const delQuotations = await prisma.quotation.deleteMany();
  const delPackageItems = await prisma.solarPackageItem.deleteMany();
  const delPackages = await prisma.solarPackage.deleteMany();
  const delPurchaseItems = await prisma.purchaseItem.deleteMany();
  const delPurchases = await prisma.purchase.deleteMany();
  const delSerials = await prisma.serialNumber.deleteMany();
  const delTransactions = await prisma.inventoryTransaction.deleteMany();
  const delTransfers = await prisma.stockTransfer.deleteMany();
  const delInventory = await prisma.inventory.deleteMany();
  const delDealers = await prisma.dealer.deleteMany();

  // 2. Clear Customers and Suppliers
  const delCustomers = await prisma.customer.deleteMany();
  const delSuppliers = await prisma.supplier.deleteMany();

  // 3. Clear Products & Variants & Brands
  const delVariants = await prisma.productVariant.deleteMany();
  const delProducts = await prisma.product.deleteMany();
  const delBrands = await prisma.brand.deleteMany();

  console.log('Cleaned Records Summary:');
  console.log('- Sales & Invoices:', delSales.count);
  console.log('- Sale Line Items:', delSaleItems.count);
  console.log('- Quotations:', delQuotations.count);
  console.log('- Purchases / Stock Inwards:', delPurchases.count);
  console.log('- Inventory Records:', delInventory.count);
  console.log('- Serial Numbers:', delSerials.count);
  console.log('- Expenses:', delExpenses.count);
  console.log('- Customers:', delCustomers.count);
  console.log('- Suppliers:', delSuppliers.count);
  console.log('- Products:', delProducts.count);
  console.log('- Installations:', delInstallations.count);
  console.log('- Warranties:', delWarranties.count);
  console.log('--- ALL DUMMY DATA HAS BEEN PERMANENTLY REMOVED ---');
}

main()
  .catch((e) => {
    console.error('Error cleaning dummy data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
