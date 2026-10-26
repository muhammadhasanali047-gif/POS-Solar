import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Solar POS & Inventory Management System Database...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.syncQueue.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.warrantyClaim.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.installation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.solarPackageItem.deleteMany();
  await prisma.solarPackage.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.dealer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.serialNumber.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  // 2. Branch: Multan Head Office & Main Operations
  const mainBranch = await prisma.branch.create({
    data: {
      name: 'Multan Head Office & Main Operations',
      code: 'MUX-HQ',
      address: 'Plot 45-B, Commercial Area, Bosan Road, Multan',
      phone: '+92 61 4589123',
      email: 'multan@solarerp.com',
      is_main: true,
      is_active: true,
    }
  });

  // 3. Single Central Warehouse: Multan Main Warehouse
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Multan Main Warehouse',
      code: 'WH-MUX-01',
      branch_id: mainBranch.id,
      location: 'Plot 12, Industrial Estate Phase II, Khanewal Road, Multan',
      is_active: true,
    }
  });

  // 4. Users (Admin, CEO, Manager)
  const passwordHash = await bcrypt.hash('Solar123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@solarpos.com',
      password_hash: passwordHash,
      full_name: 'Muhammad Asif (Administrator)',
      role: 'ADMIN',
      branch_id: mainBranch.id,
      phone: '+92 300 1234567',
      is_active: true,
    }
  });

  const ceoUser = await prisma.user.create({
    data: {
      email: 'ceo@solarpos.com',
      password_hash: passwordHash,
      full_name: 'Engr. Haroon Malik (Chief Executive Officer)',
      role: 'CEO',
      branch_id: mainBranch.id,
      phone: '+92 301 9876543',
      is_active: true,
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@solarpos.com',
      password_hash: passwordHash,
      full_name: 'Zahid Hussain (Finance & Operations Manager)',
      role: 'MANAGER',
      branch_id: mainBranch.id,
      phone: '+92 321 5554321',
      is_active: true,
    }
  });

  const cashierUser = await prisma.user.create({
    data: {
      email: 'cashier@solarpos.com',
      password_hash: passwordHash,
      full_name: 'Asim Raza (Cashier / Counter Executive)',
      role: 'CASHIER',
      branch_id: mainBranch.id,
      phone: '+92 312 3456789',
      is_active: true,
    }
  });

  // 5. Categories
  const catPanels = await prisma.category.create({
    data: { name: 'Solar Panels', slug: 'solar-panels', description: 'Monocrystalline, Bifacial, and N-Type TOPCon PV Modules' }
  });
  const catInverters = await prisma.category.create({
    data: { name: 'Inverters', slug: 'inverters', description: 'On-Grid, Hybrid, and Off-Grid Solar Power Inverters' }
  });
  const catBatteries = await prisma.category.create({
    data: { name: 'Batteries', slug: 'batteries', description: 'Lithium LiFePO4 & Tubular Deep Cycle Solar Batteries' }
  });
  const catStructure = await prisma.category.create({
    data: { name: 'Mounting Structure', slug: 'mounting-structure', description: 'Galvanized L2, L3, and Elevated Custom Structures' }
  });
  const catAccessories = await prisma.category.create({
    data: { name: 'Accessories & Protection', slug: 'accessories', description: 'DC/AC Breakers, SPDs, DB Boxes, MC4 Connectors' }
  });
  const catCables = await prisma.category.create({
    data: { name: 'Cables & Wiring', slug: 'cables', description: 'Certified Pure Copper Solar PV DC & AC Wires' }
  });

  // 6. Brands
  const brandLongi = await prisma.brand.create({ data: { name: 'Longi Solar', country: 'China' } });
  const brandJinko = await prisma.brand.create({ data: { name: 'Jinko Solar', country: 'China' } });
  const brandCanadian = await prisma.brand.create({ data: { name: 'Canadian Solar', country: 'Canada' } });
  const brandGoodwe = await prisma.brand.create({ data: { name: 'GoodWe', country: 'China' } });
  const brandSolis = await prisma.brand.create({ data: { name: 'Solis Ginlong', country: 'China' } });
  const brandHuawei = await prisma.brand.create({ data: { name: 'Huawei FusionSolar', country: 'China' } });
  const brandPylontech = await prisma.brand.create({ data: { name: 'Pylontech', country: 'China' } });
  const brandSuntree = await prisma.brand.create({ data: { name: 'Suntree Electric', country: 'China' } });
  const brandPakistanCables = await prisma.brand.create({ data: { name: 'Pakistan Cables', country: 'Pakistan' } });

  // 7. Products & Variants
  // Product 1: Longi 585W
  const pLongi585 = await prisma.product.create({
    data: {
      name: 'Longi Hi-MO 6 Explorer 585W Mono Perc',
      category_id: catPanels.id,
      brand_id: brandLongi.id,
      model_number: 'LR5-72HTH-585M',
      description: 'Ultra-high efficiency mono-crystalline module with HPBC cell technology.',
      is_serialized: false,
      min_stock_alert: 50,
      purchase_price: 18500,
      sale_price: 21500,
    }
  });
  const vLongi585 = await prisma.productVariant.create({
    data: {
      product_id: pLongi585.id,
      name: '585W Silver Frame',
      sku: 'PAN-LNG-585W',
      wattage: 585,
      voltage: 44.8,
      technology: 'Mono HPBC',
      warranty_years: 25,
      purchase_price: 18500,
      sale_price: 21500,
    }
  });

  // Product 2: Jinko 585W TOPCon
  const pJinko585 = await prisma.product.create({
    data: {
      name: 'Jinko Tiger Neo N-Type 585W Bifacial',
      category_id: catPanels.id,
      brand_id: brandJinko.id,
      model_number: 'JKM585N-72HL4-BDV',
      description: 'N-Type TOPCon dual glass bifacial panel with excellent low-light yield.',
      is_serialized: false,
      min_stock_alert: 50,
      purchase_price: 19000,
      sale_price: 22200,
    }
  });
  const vJinko585 = await prisma.productVariant.create({
    data: {
      product_id: pJinko585.id,
      name: '585W Dual Glass Bifacial',
      sku: 'PAN-JNK-585N',
      wattage: 585,
      voltage: 43.9,
      technology: 'N-Type TOPCon',
      warranty_years: 30,
      purchase_price: 19000,
      sale_price: 22200,
    }
  });

  // Product 3: GoodWe 5kW Inverter (Serialized)
  const pGoodwe5k = await prisma.product.create({
    data: {
      name: 'GoodWe 5kW Single Phase On-Grid Inverter',
      category_id: catInverters.id,
      brand_id: brandGoodwe.id,
      model_number: 'GW5000-DNS-30',
      description: 'Compact 5kW Dual MPPT string inverter with integrated DC switch and Wi-Fi.',
      is_serialized: true,
      min_stock_alert: 5,
      purchase_price: 165000,
      sale_price: 195000,
    }
  });
  const vGoodwe5k = await prisma.productVariant.create({
    data: {
      product_id: pGoodwe5k.id,
      name: '5kW Dual MPPT With Wi-Fi',
      sku: 'INV-GW-5K-DNS',
      wattage: 5000,
      voltage: 230,
      capacity: '5kW',
      technology: 'Transformerless String',
      warranty_years: 5,
      purchase_price: 165000,
      sale_price: 195000,
    }
  });

  // Product 4: GoodWe 10kW Inverter (Serialized)
  const pGoodwe10k = await prisma.product.create({
    data: {
      name: 'GoodWe 10kW 3-Phase On-Grid Inverter',
      category_id: catInverters.id,
      brand_id: brandGoodwe.id,
      model_number: 'GW10KN-DT',
      description: 'High efficiency 10kW 3-Phase Dual MPPT Inverter with AFCI and IP65 protection.',
      is_serialized: true,
      min_stock_alert: 5,
      purchase_price: 245000,
      sale_price: 285000,
    }
  });
  const vGoodwe10k = await prisma.productVariant.create({
    data: {
      product_id: pGoodwe10k.id,
      name: '10kW 3-Phase Dual MPPT',
      sku: 'INV-GW-10K-DT',
      wattage: 10000,
      voltage: 400,
      capacity: '10kW',
      technology: '3-Phase Grid-Tied',
      warranty_years: 5,
      purchase_price: 245000,
      sale_price: 285000,
    }
  });

  // Product 5: Huawei 10kW Hybrid Inverter (Serialized)
  const pHuawei10k = await prisma.product.create({
    data: {
      name: 'Huawei FusionSolar 10kW Hybrid Inverter',
      category_id: catInverters.id,
      brand_id: brandHuawei.id,
      model_number: 'SUN2000-10KTL-M1',
      description: 'Smart Energy Center battery-ready 10kW inverter with AI-powered arc fault protection.',
      is_serialized: true,
      min_stock_alert: 3,
      purchase_price: 365000,
      sale_price: 420000,
    }
  });
  const vHuawei10k = await prisma.productVariant.create({
    data: {
      product_id: pHuawei10k.id,
      name: '10kW Battery-Ready Smart Inverter',
      sku: 'INV-HWI-10KTL-M1',
      wattage: 10000,
      voltage: 400,
      capacity: '10kW Hybrid',
      technology: 'Smart Hybrid PV',
      warranty_years: 10,
      purchase_price: 365000,
      sale_price: 420000,
    }
  });

  // Product 6: Pylontech 3.55kWh Lithium Battery (Serialized)
  const pPylontech = await prisma.product.create({
    data: {
      name: 'Pylontech US3000C 3.55kWh LiFePO4 Battery',
      category_id: catBatteries.id,
      brand_id: brandPylontech.id,
      model_number: 'US3000C',
      description: '48V Lithium Iron Phosphate rack-mounted energy storage module, 6000 cycles at 95% DoD.',
      is_serialized: true,
      min_stock_alert: 6,
      purchase_price: 230000,
      sale_price: 265000,
    }
  });
  const vPylontech = await prisma.productVariant.create({
    data: {
      product_id: pPylontech.id,
      name: '48V 74Ah 3.55kWh Module',
      sku: 'BAT-PYL-US3000C',
      voltage: 48,
      capacity: '3.55 kWh',
      technology: 'LiFePO4',
      warranty_years: 10,
      purchase_price: 230000,
      sale_price: 265000,
    }
  });

  // Product 7: Mounting Structure L2/L3
  const pStructure = await prisma.product.create({
    data: {
      name: 'Galvanized L2/L3 Solar Mounting Structure',
      category_id: catStructure.id,
      brand_id: brandCanadian.id,
      model_number: 'STR-HDG-L3',
      description: 'Heavy duty hot-dip galvanized elevated structure with wind load rating up to 140 km/h.',
      is_serialized: false,
      min_stock_alert: 20,
      purchase_price: 14000,
      sale_price: 18500,
    }
  });
  const vStructure = await prisma.productVariant.create({
    data: {
      product_id: pStructure.id,
      name: 'Per Panel Standard Kit',
      sku: 'STR-KIT-L3',
      technology: 'Hot Dip Galvanized Steel',
      warranty_years: 10,
      purchase_price: 14000,
      sale_price: 18500,
    }
  });

  // Product 8: Solar DC Cable 6mm² (Meter)
  const pCable = await prisma.product.create({
    data: {
      name: 'Solar DC Cable 6mm² Pure Copper (TUV Certified)',
      category_id: catCables.id,
      brand_id: brandPakistanCables.id,
      model_number: 'DC-6MM-TUV',
      description: 'Double insulated UV-resistant flame retardant copper solar cable.',
      is_serialized: false,
      min_stock_alert: 500,
      purchase_price: 280,
      sale_price: 360,
    }
  });
  const vCable = await prisma.productVariant.create({
    data: {
      product_id: pCable.id,
      name: '6mm² Red/Black (per meter)',
      sku: 'CBL-DC-6MM',
      voltage: 1500,
      technology: 'Tinned Copper XLPO',
      warranty_years: 25,
      purchase_price: 280,
      sale_price: 360,
    }
  });

  // Product 9: AC/DC Protection Box Complete
  const pDB = await prisma.product.create({
    data: {
      name: 'Complete Solar AC & DC Protection DB Box (IP65)',
      category_id: catAccessories.id,
      brand_id: brandSuntree.id,
      model_number: 'DB-DIST-10KW',
      description: 'Pre-wired DB box equipped with Suntree DC Breakers, SPDs, AC Breaker and Voltage Protector.',
      is_serialized: false,
      min_stock_alert: 10,
      purchase_price: 28000,
      sale_price: 38000,
    }
  });
  const vDB = await prisma.productVariant.create({
    data: {
      product_id: pDB.id,
      name: '10kW Pre-wired IP65 Enclosure',
      sku: 'ACC-DB-10KW',
      voltage: 1000,
      warranty_years: 3,
      purchase_price: 28000,
      sale_price: 38000,
    }
  });

  // 8. Stock Balances in Multan Main Warehouse (Single Central Facility)
  const initialStocks = [
    { product_id: pLongi585.id, variant_id: vLongi585.id, qty: 440, cost: 18500 },
    { product_id: pJinko585.id, variant_id: vJinko585.id, qty: 330, cost: 19000 },
    { product_id: pGoodwe5k.id, variant_id: vGoodwe5k.id, qty: 21, cost: 165000 },
    { product_id: pGoodwe10k.id, variant_id: vGoodwe10k.id, qty: 30, cost: 245000 },
    { product_id: pHuawei10k.id, variant_id: vHuawei10k.id, qty: 8, cost: 365000 },
    { product_id: pPylontech.id, variant_id: vPylontech.id, qty: 18, cost: 230000 },
    { product_id: pStructure.id, variant_id: vStructure.id, qty: 210, cost: 14000 },
    { product_id: pCable.id, variant_id: vCable.id, qty: 4000, cost: 280 },
    { product_id: pDB.id, variant_id: vDB.id, qty: 35, cost: 28000 },
  ];

  for (const st of initialStocks) {
    await prisma.inventory.create({
      data: {
        warehouse_id: mainWarehouse.id,
        product_id: st.product_id,
        variant_id: st.variant_id,
        quantity: st.qty,
        available_qty: st.qty,
        reserved_qty: 0,
        avg_cost: st.cost,
      }
    });

    await prisma.inventoryTransaction.create({
      data: {
        transaction_no: `TXN-INIT-${Math.floor(100000 + Math.random() * 900000)}`,
        warehouse_id: mainWarehouse.id,
        product_id: st.product_id,
        variant_id: st.variant_id,
        type: 'PURCHASE_IN',
        quantity: st.qty,
        before_qty: 0,
        after_qty: st.qty,
        unit_cost: st.cost,
        reference_type: 'INITIAL_STOCK',
        notes: 'Initial inventory intake at Multan Main Warehouse',
        branch_id: mainBranch.id,
      }
    });
  }

  // 9. Serial Numbers
  const serialItems = [
    { sn: 'SN-GW5K-980145', pid: pGoodwe5k.id, vid: vGoodwe5k.id, status: 'IN_STOCK' },
    { sn: 'SN-GW5K-980146', pid: pGoodwe5k.id, vid: vGoodwe5k.id, status: 'IN_STOCK' },
    { sn: 'SN-GW10K-771201', pid: pGoodwe10k.id, vid: vGoodwe10k.id, status: 'IN_STOCK' },
    { sn: 'SN-GW10K-771202', pid: pGoodwe10k.id, vid: vGoodwe10k.id, status: 'IN_STOCK' },
    { sn: 'SN-GW10K-771203', pid: pGoodwe10k.id, vid: vGoodwe10k.id, status: 'IN_STOCK' },
    { sn: 'SN-HWI-10K-55201', pid: pHuawei10k.id, vid: vHuawei10k.id, status: 'IN_STOCK' },
    { sn: 'SN-HWI-10K-55202', pid: pHuawei10k.id, vid: vHuawei10k.id, status: 'IN_STOCK' },
    { sn: 'SN-PYL-355-11001', pid: pPylontech.id, vid: vPylontech.id, status: 'IN_STOCK' },
    { sn: 'SN-PYL-355-11002', pid: pPylontech.id, vid: vPylontech.id, status: 'IN_STOCK' },
    { sn: 'SN-PYL-355-11003', pid: pPylontech.id, vid: vPylontech.id, status: 'IN_STOCK' },
  ];

  for (const s of serialItems) {
    await prisma.serialNumber.create({
      data: {
        serial_no: s.sn,
        product_id: s.pid,
        variant_id: s.vid,
        warehouse_id: mainWarehouse.id,
        status: s.status,
        purchase_date: new Date('2026-01-10'),
        notes: 'In stock at Multan Main Warehouse',
      }
    });
  }

  // 10. Solar Packages
  const pkg5k = await prisma.solarPackage.create({
    data: {
      package_no: 'PKG-05KW',
      name: '5kW Residential On-Grid Solar Package',
      capacity_kw: 5.26,
      package_type: 'ON_GRID',
      description: 'Ideal for 3-5 bedroom homes. Generates approx. 600-750 units/month.',
      base_price: 520000,
    }
  });
  await prisma.solarPackageItem.createMany({
    data: [
      { package_id: pkg5k.id, product_id: pLongi585.id, variant_id: vLongi585.id, default_quantity: 9, notes: '9x 585W Panels = 5.26kW' },
      { package_id: pkg5k.id, product_id: pGoodwe5k.id, variant_id: vGoodwe5k.id, default_quantity: 1, notes: '5kW Dual MPPT Inverter' },
      { package_id: pkg5k.id, product_id: pStructure.id, variant_id: vStructure.id, default_quantity: 9, notes: 'Galvanized elevated mounting' },
      { package_id: pkg5k.id, product_id: pCable.id, variant_id: vCable.id, default_quantity: 70, notes: '6mm² DC Solar Cable' },
      { package_id: pkg5k.id, product_id: pDB.id, variant_id: vDB.id, default_quantity: 1, notes: 'Protection box with SPDs' },
    ]
  });

  const pkg10k = await prisma.solarPackage.create({
    data: {
      package_no: 'PKG-10KW',
      name: '10kW Commercial / Residential Standard Package',
      capacity_kw: 10.53,
      package_type: 'ON_GRID',
      description: 'Generates approx. 1200-1500 units/month with 3-Phase Net Metering support.',
      base_price: 960000,
    }
  });
  await prisma.solarPackageItem.createMany({
    data: [
      { package_id: pkg10k.id, product_id: pLongi585.id, variant_id: vLongi585.id, default_quantity: 18, notes: '18x 585W Panels = 10.53kW' },
      { package_id: pkg10k.id, product_id: pGoodwe10k.id, variant_id: vGoodwe10k.id, default_quantity: 1, notes: '10kW 3-Phase Inverter' },
      { package_id: pkg10k.id, product_id: pStructure.id, variant_id: vStructure.id, default_quantity: 18, notes: 'Galvanized elevated structure' },
      { package_id: pkg10k.id, product_id: pCable.id, variant_id: vCable.id, default_quantity: 140, notes: '6mm² DC Cable' },
      { package_id: pkg10k.id, product_id: pDB.id, variant_id: vDB.id, default_quantity: 1, notes: 'Pre-wired 10kW Protection DB' },
    ]
  });

  // 11. Suppliers & Official Purchase Orders (Audit Chain)
  const sup1 = await prisma.supplier.create({
    data: {
      supplier_no: 'SUP-001',
      company_name: 'Diwan International Solar Imports',
      contact_person: 'Salman Diwan',
      phone: '+92 300 8887766',
      email: 'salman@diwansolar.com',
      address: 'Office 402, Business Arcade, Karachi',
      total_purchased: 4500000,
      amount_paid: 4000000,
      outstanding_payable: 500000,
    }
  });

  const sup2 = await prisma.supplier.create({
    data: {
      supplier_no: 'SUP-002',
      company_name: 'Pak Green Power Technologies',
      contact_person: 'Waqas Ahmed',
      phone: '+92 321 4443322',
      email: 'waqas@pakgreenpower.com',
      address: 'Plot 15, Industrial Triangle, Kahuta Road, Islamabad',
      total_purchased: 2800000,
      amount_paid: 2800000,
      outstanding_payable: 0,
    }
  });

  // Seed Official Purchase Orders to establish complete audit trail
  const po1 = await prisma.purchase.create({
    data: {
      po_no: 'PO-2026-0001',
      supplier_id: sup1.id,
      warehouse_id: mainWarehouse.id,
      branch_id: mainBranch.id,
      total_amount: 4500000,
      paid_amount: 4000000,
      balance_amount: 500000,
      payment_status: 'PARTIAL',
      status: 'RECEIVED',
      purchase_date: new Date('2026-01-05'),
      notes: 'Official import shipment consignment #DIW-2026-Q1 received at Multan Main Warehouse.',
      created_by: managerUser.full_name,
    }
  });

  const pItem1 = await prisma.purchaseItem.create({
    data: {
      purchase_id: po1.id,
      product_id: pLongi585.id,
      variant_id: vLongi585.id,
      quantity: 200,
      unit_cost: 18500,
      total_cost: 3700000,
    }
  });

  const pItem2 = await prisma.purchaseItem.create({
    data: {
      purchase_id: po1.id,
      product_id: pGoodwe10k.id,
      variant_id: vGoodwe10k.id,
      quantity: 3,
      unit_cost: 245000,
      total_cost: 735000,
      serial_numbers_json: JSON.stringify(['SN-GW10K-771201', 'SN-GW10K-771202', 'SN-GW10K-771203']),
    }
  });

  const po2 = await prisma.purchase.create({
    data: {
      po_no: 'PO-2026-0002',
      supplier_id: sup2.id,
      warehouse_id: mainWarehouse.id,
      branch_id: mainBranch.id,
      total_amount: 2800000,
      paid_amount: 2800000,
      balance_amount: 0,
      payment_status: 'PAID',
      status: 'RECEIVED',
      purchase_date: new Date('2026-01-08'),
      notes: 'Consignment for inverters and batteries received at Multan Main Warehouse from Pak Green Power.',
      created_by: managerUser.full_name,
    }
  });

  await prisma.purchaseItem.createMany({
    data: [
      { purchase_id: po2.id, product_id: pHuawei10k.id, variant_id: vHuawei10k.id, quantity: 4, unit_cost: 365000, total_cost: 1460000 },
      { purchase_id: po2.id, product_id: pPylontech.id, variant_id: vPylontech.id, quantity: 5, unit_cost: 230000, total_cost: 1150000 },
    ]
  });

  // 12. Dealers
  const dealer1 = await prisma.dealer.create({
    data: {
      dealer_no: 'DLR-001',
      name: 'Tariq Mehmood',
      company_name: 'Apex Solar Traders',
      phone: '+92 300 7711223',
      email: 'tariq@apexsolartraders.com',
      address: 'Shop 14, Electronic Market, Hall Road, Lahore',
      commission_type: 'PERCENTAGE',
      commission_value: 5.0,
      total_sales_volume: 3200000,
      total_commission_earned: 160000,
      commission_paid: 100000,
      balance_payable: 60000,
      status: 'ACTIVE',
      notes: 'Premier Tier-1 Regional Solar Equipment Distributor',
    }
  });

  const dealer2 = await prisma.dealer.create({
    data: {
      dealer_no: 'DLR-002',
      name: 'Farhan Ali Qureshi',
      company_name: 'Green Grid Engineering',
      phone: '+92 333 4567891',
      email: 'farhan@greengrid.pk',
      address: 'Sector F-7/2, Jinnah Super Market, Islamabad',
      commission_type: 'PERCENTAGE',
      commission_value: 5.0,
      total_sales_volume: 2400000,
      total_commission_earned: 120000,
      commission_paid: 80000,
      balance_payable: 40000,
      status: 'ACTIVE',
      notes: 'Specializes in residential and farm house turn-key solar installations',
    }
  });

  // 13. Customers
  const cust1 = await prisma.customer.create({
    data: {
      customer_no: 'CUST-001',
      name: 'Dr. Shahzad Rasheed',
      customer_type: 'INDIVIDUAL',
      phone: '+92 300 9456712',
      email: 'shahzad.rasheed@gmail.com',
      cnic: '35202-1234567-1',
      address: 'House 88, Officer Colony, Bosan Road, Multan',
      city: 'Multan',
      credit_limit: 500000,
      outstanding_balance: 150000,
      branch_id: mainBranch.id,
    }
  });

  const cust2 = await prisma.customer.create({
    data: {
      customer_no: 'CUST-002',
      name: 'Al-Madina Flour Mills & Agro',
      customer_type: 'COMMERCIAL',
      phone: '+92 321 8899001',
      email: 'info@almadinaflour.com',
      cnic: '35201-9988776-3',
      address: 'Plot 45, Industrial Estate Phase II, Khanewal Road, Multan',
      city: 'Multan',
      credit_limit: 2000000,
      outstanding_balance: 0,
      branch_id: mainBranch.id,
    }
  });

  // 14. Quotation Sample
  const q1 = await prisma.quotation.create({
    data: {
      quotation_no: 'QT-2026-0001',
      customer_id: cust1.id,
      package_id: pkg10k.id,
      branch_id: mainBranch.id,
      system_capacity_kw: 10.53,
      subtotal: 960000,
      discount: 20000,
      tax: 0,
      installation_charges: 60000,
      transport_charges: 15000,
      grand_total: 1015000,
      status: 'CONVERTED_TO_SALE',
      validity_date: new Date('2026-10-30'),
      notes: 'Includes complete Net Metering processing and 5-year inverter warranty.',
      created_by: managerUser.full_name,
    }
  });
  await prisma.quotationItem.createMany({
    data: [
      { quotation_id: q1.id, product_id: pLongi585.id, variant_id: vLongi585.id, description: 'Longi 585W Hi-MO 6 Mono Perc Panels', quantity: 18, unit_price: 21500, total_price: 387000 },
      { quotation_id: q1.id, product_id: pGoodwe10k.id, variant_id: vGoodwe10k.id, description: 'GoodWe 10kW 3-Phase On-Grid Inverter', quantity: 1, unit_price: 285000, total_price: 285000 },
      { quotation_id: q1.id, product_id: pStructure.id, variant_id: vStructure.id, description: 'Galvanized L3 Mounting Structure Kit', quantity: 18, unit_price: 18500, total_price: 333000 },
      { quotation_id: q1.id, product_id: pDB.id, variant_id: vDB.id, description: 'Protection Distribution Box IP65 with SPDs', quantity: 1, unit_price: 38000, total_price: 38000 },
    ]
  });

  // 15. Sale / Invoice
  const sale1 = await prisma.sale.create({
    data: {
      invoice_no: 'INV-2026-0001',
      quotation_id: q1.id,
      customer_id: cust1.id,
      dealer_id: dealer1.id,
      branch_id: mainBranch.id,
      salesperson_id: managerUser.id,
      system_capacity_kw: 10.53,
      subtotal: 960000,
      discount: 20000,
      tax: 0,
      installation_charges: 60000,
      transport_charges: 15000,
      grand_total: 1015000,
      paid_amount: 865000,
      balance_due: 150000,
      payment_status: 'PARTIAL',
      order_status: 'COMPLETED',
      notes: 'Deposit paid via Online Transfer, remaining balance due on handover.',
      created_by: managerUser.full_name,
    }
  });

  // Sale items
  const saleItemPanels = await prisma.saleItem.create({
    data: {
      sale_id: sale1.id,
      product_id: pLongi585.id,
      variant_id: vLongi585.id,
      quantity: 18,
      unit_price: 21500,
      unit_cost: 18500,
      total_price: 387000,
      profit: 54000,
    }
  });

  const saleItemInverter = await prisma.saleItem.create({
    data: {
      sale_id: sale1.id,
      product_id: pGoodwe10k.id,
      variant_id: vGoodwe10k.id,
      quantity: 1,
      unit_price: 285000,
      unit_cost: 245000,
      total_price: 285000,
      profit: 40000,
      serial_numbers_json: JSON.stringify(['SN-GW10K-771201']),
    }
  });

  // 16. Payment Record
  await prisma.payment.create({
    data: {
      payment_no: 'PAY-2026-0001',
      sale_id: sale1.id,
      customer_id: cust1.id,
      amount: 865000,
      payment_method: 'BANK_TRANSFER',
      transaction_ref: 'HBL-FT-99120349',
      received_by: managerUser.full_name,
      notes: '85% Advance payment received in company account',
    }
  });

  // 17. Commission Record
  await prisma.commission.create({
    data: {
      commission_no: 'COM-2026-0001',
      dealer_id: dealer1.id,
      sale_id: sale1.id,
      amount: 50750, // 5% of 1015000
      status: 'APPROVED',
      notes: 'Commission for referred client Dr. Shahzad Rasheed',
    }
  });

  // 18. Installation Records
  await prisma.installation.create({
    data: {
      job_no: 'INST-2026-0001',
      sale_id: sale1.id,
      customer_id: cust1.id,
      branch_id: mainBranch.id,
      address: 'House 88, Officer Colony, Bosan Road, Multan',
      system_capacity_kw: 10.53,
      scheduled_date: new Date('2026-09-18'),
      completed_date: null,
      assigned_technician: 'Engr. Usman Tariq & Team Alpha',
      status: 'IN_PROGRESS',
      checklist_json: JSON.stringify({
        panels_mounted: true,
        inverter_installed: true,
        batteries_connected: false,
        structure_torqued: true,
        dc_wiring_done: true,
        earthing_bore_tested: true,
        inverter_tested: false,
        customer_handover: false,
      }),
      test_results_json: JSON.stringify({
        string1_voc: '492V',
        string2_voc: '488V',
        earthing_resistance: '1.8 Ohms',
        grid_voltage: '232V',
      }),
      notes: 'Structure and panels installed. Final inverter testing scheduled tomorrow.',
    }
  });

  // Job scheduled today with NO assigned technician (Bug 11 trigger)
  await prisma.installation.create({
    data: {
      job_no: 'INST-2026-0002',
      sale_id: sale1.id,
      customer_id: cust2.id,
      branch_id: mainBranch.id,
      address: 'Plot 45, Industrial Estate Phase II, Khanewal Road, Multan',
      system_capacity_kw: 25.0,
      scheduled_date: new Date(), // Today!
      completed_date: null,
      assigned_technician: null, // Unassigned!
      status: 'PENDING',
      checklist_json: JSON.stringify({ site_survey_done: true, mounting_ready: false }),
      notes: 'URGENT: Commercial 25kW installation scheduled for today. Technician assignment required immediately.',
    }
  });

  // 19. Warranty & Serial Connection
  const soldSerial = await prisma.serialNumber.findUnique({ where: { serial_no: 'SN-GW10K-771201' } });
  if (soldSerial) {
    await prisma.serialNumber.update({
      where: { id: soldSerial.id },
      data: {
        status: 'SOLD',
        current_customer_id: cust1.id,
        sale_item_id: saleItemInverter.id,
        purchase_item_id: pItem2.id,
        sale_date: new Date('2026-09-14'),
        warranty_end_date: new Date('2031-09-14'),
      }
    });

    const w1 = await prisma.warranty.create({
      data: {
        warranty_no: 'WRN-2026-0001',
        serial_number_id: soldSerial.id,
        product_id: pGoodwe10k.id,
        customer_id: cust1.id,
        sale_id: sale1.id,
        warranty_type: 'INVERTER_5YR',
        start_date: new Date('2026-09-14'),
        end_date: new Date('2031-09-14'),
        duration_months: 60,
        status: 'ACTIVE',
        terms: '5-year standard manufacturer warranty covering inverter logic board, MPPT modules, and display.',
      }
    });

    // 25-Year Performance Warranty for Longi Solar Panels (Bug 9)
    await prisma.warranty.create({
      data: {
        warranty_no: 'WRN-PNL-2026-0001',
        serial_number_id: null,
        product_id: pLongi585.id,
        customer_id: cust1.id,
        sale_id: sale1.id,
        warranty_type: 'PANEL_PERFORMANCE_25YR',
        start_date: new Date('2026-09-14'),
        end_date: new Date('2051-09-14'),
        duration_months: 300,
        status: 'ACTIVE',
        terms: '25-Year Linear Power Output Warranty (Min 84.8% performance at Year 25) + 12-Year Product Workmanship for 18x Longi 585W Modules.',
      }
    });

    // Sample Claim for testing
    await prisma.warrantyClaim.create({
      data: {
        claim_no: 'CLM-2026-0001',
        warranty_id: w1.id,
        customer_id: cust1.id,
        serial_number_id: soldSerial.id,
        original_invoice_no: 'INV-2026-0001',
        complaint: 'Customer reported inverter error code 32 (Grid Voltage Surge) during heavy thunderstorm.',
        claim_type: 'INSPECTION',
        assigned_technician: 'Engr. Usman Tariq',
        diagnosis: 'AC SPD successfully absorbed surge. Replaced blown surge cartridge.',
        repair_details: 'Inspected terminals, replaced surge cartridge, re-tested grid sync. Working normally.',
        parts_used: 'Suntree AC SPD cartridge 40kA',
        service_cost: 2500,
        warranty_cost: 0,
        status: 'RESOLVED',
        resolution: 'AC protection cartridge replaced under complimentary initial maintenance service.',
        resolution_date: new Date('2026-09-15'),
        internal_notes: 'Claim verified and resolved within 24 hours.',
        customer_remarks: 'Technician arrived promptly and solved the issue quickly.',
      }
    });
  }

  // 20. Categorized Expenses
  const expenses = [
    { no: 'EXP-2026-001', cat: 'RENT', amount: 120000, desc: 'Monthly rent for Multan Head Office & Warehouse', paid_to: 'Bosan Road Commercial Plaza' },
    { no: 'EXP-2026-002', cat: 'SALARIES', amount: 350000, desc: 'Staff and technical team payroll', paid_to: 'Engineering Staff' },
    { no: 'EXP-2026-003', cat: 'FUEL', amount: 28000, desc: 'Fuel for site survey and installation vans', paid_to: 'Total Parco Bosan Road' },
    { no: 'EXP-2026-004', cat: 'INSTALLATION_LABOR', amount: 35000, desc: 'Installation labor for Multan Officer Colony 10kW site', paid_to: 'Civil & Electric Labor Team' },
    { no: 'EXP-2026-005', cat: 'UTILITIES', amount: 22000, desc: 'Electricity and high-speed internet bills', paid_to: 'MEPCO & Nayatel' },
    { no: 'EXP-2026-006', cat: 'MARKETING', amount: 45000, desc: 'Facebook, Google Ads & billboard promotions', paid_to: 'Digital Wave Agency' },
  ];

  for (const exp of expenses) {
    await prisma.expense.create({
      data: {
        expense_no: exp.no,
        category: exp.cat,
        amount: exp.amount,
        branch_id: mainBranch.id,
        payment_method: 'BANK_TRANSFER',
        paid_to: exp.paid_to,
        description: exp.desc,
        created_by: managerUser.full_name,
      }
    });
  }

  console.log('Database seeding successfully completed with rich realistic solar ERP data!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });