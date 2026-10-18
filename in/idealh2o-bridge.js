/* ╔════════════════════════════════════════════════════════════════╗
 * ║                                                                ║
 * ║   ██╗██████╗ ███████╗ █████╗ ██╗         ██╗  ██╗██████╗  ██████╗
 * ║   ██║██╔══██╗██╔════╝██╔══██╗██║         ██║  ██║╚════██╗██╔═══██╗
 * ║   ██║██║  ██║█████╗  ███████║██║         ███████║ █████╔╝██║   ██║
 * ║   ██║██║  ██║██╔══╝  ██╔══██║██║         ██╔══██║██╔═══╝ ██║   ██║
 * ║   ██║██████╔╝███████╗██║  ██║███████╗    ██║  ██║███████╗╚██████╔╝
 * ║   ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝
 * ║                                                                ║
 * ║   IDEAL H2O — Full System v29 FINAL                            ║
 * ║   نظام إدارة الشركة — النسخة النهائية الشاملة                   ║
 * ║                                                                ║
 * ║   الإصدار: 29.4                                                ║
 * ║   التاريخ: 2026-10-15                                          ║
 * ║                                                                ║
 * ║   يحتوي على:                                                    ║
 * ║   ✓ إدارة المخزون + تتبع الحركات + تنبيهات                      ║
 * ║   ✓ الصيانة مع قطع جديدة + حساب الربح الفعلي                    ║
 * ║   ✓ المبيعات (POS) + COGS                                       ║
 * ║   ✓ الأقساط + الخزينة + تخفيض المديونية                         ║
 * ║   ✓ المشتريات + الموردين                                        ║
 * ║   ✓ طلبات الصيانة مع العنوان + اقتراحات ذكية                    ║
 * ║   ✓ تقارير: مستحقات، أرباح، مطابقة، مخزون، مشتريات              ║
 * ║   ✓ تصدير Excel / PDF                                          ║
 * ║   ✓ أزرار تلقائية في القائمة الجانبية                           ║
 * ║   ✓ ترحيل تلقائي آمن للبيانات القديمة                           ║
 * ║                                                                ║
 * ║   التركيب:                                                      ║
 * ║     <script src="app.js"></script>                              ║
 * ║     <script src="idealh2o-v29-final.js"></script>               ║
 * ║                                                                ║
 * ╚════════════════════════════════════════════════════════════════╝ */

(function (global) {
  "use strict";

  if (global.__IDEAL_H2O_V29_FINAL__) {
    console.warn("⚠️ Ideal H2O v29 محمَّل مسبقًا");
    return;
  }
  global.__IDEAL_H2O_V29_FINAL__ = true;

  /* ═══════════════════════════════════════════════════════════
   * §01  Helper Functions
   * ═══════════════════════════════════════════════════════════ */
  const uid = () => Date.now() + Math.random();
  const nowISO = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const round2 = (v) => Math.round(num(v) * 100) / 100;
  const clean = (s) => String(s == null ? "" : s).trim();
  const pad = (n) => String(n).padStart(2, "0");
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const formatDate = (d) => {
    if (!d) return "";
    const p = String(d).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  const formatMoney = (v) =>
    num(v).toLocaleString("ar-EG", { maximumFractionDigits: 2 });

  function addMonths(dateStr, months) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  function firstOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  }

  function generateInvoiceNumber(db, type) {
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const prefix = type === "maintenance" ? "MNT"
      : type === "sale" ? "INV"
      : type === "installment" ? "INST"
      : type === "purchase" ? "PUR"
      : "DOC";
    return `${prefix}-${stamp}-${rand}`;
  }

  function ensureCollections(db) {
    if (!db) return db;
    db.stockMovements = db.stockMovements || [];
    db.installmentsLedger = db.installmentsLedger || [];
    db.purchases = db.purchases || [];
    db.suppliers = db.suppliers || [];
    db._lowStockAlerts = db._lowStockAlerts || [];
    db.requests = db.requests || [];
    db.history = db.history || [];
    db.sales = db.sales || [];
    db.invoices = db.invoices || [];
    db.customers = db.customers || [];
    db.products = db.products || [];
    db.treasury = db.treasury || {};
    db.treasury.currentDay = db.treasury.currentDay || {
      date: today(),
      openingBalance: num(db.settings && db.settings.drawerOpening),
      sales: 0, maintenance: 0, installments: 0,
      expenses: [], totalExpenses: 0, transactions: []
    };
    db.treasury.currentDay.transactions = db.treasury.currentDay.transactions || [];
    return db;
  }

  function audit(db, action, details) {
    if (!db) return;
    db.auditLog = db.auditLog || [];
    db.auditLog.unshift({
      id: uid(), time: nowISO(),
      user: db._currentUser || "system",
      role: db._currentRole || "owner",
      action, details: String(details || "")
    });
    if (db.auditLog.length > 500) db.auditLog.length = 500;
  }

  /* ═══════════════════════════════════════════════════════════
   * §02  Core — Inventory
   * ═══════════════════════════════════════════════════════════ */
  function deductStock(db, productId, qty, ref, user) {
    ensureCollections(db);
    const product = db.products.find((p) => p.id === productId);
    if (!product) throw new Error(`الصنف غير موجود: ${productId}`);
    qty = num(qty);
    if (qty <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");

    const stockBefore = num(product.stock);
    if (stockBefore < qty) {
      console.warn(`⚠️ مخزون منخفض: ${product.name} — متاح ${stockBefore} / مطلوب ${qty}`);
    }
    product.stock = Math.max(0, stockBefore - qty);
    const unitCost = num(product.cost);

    const movement = {
      id: uid(), date: today(), type: "out",
      productId, productName: product.name,
      qty, unitCost, totalCost: round2(unitCost * qty),
      reason: ref.type === "maintenance" ? "صيانة"
             : ref.type === "sale" ? "بيع" : "أخرى",
      refId: ref.id || "", refType: ref.type || "manual",
      customerId: ref.customerId || null,
      customerName: ref.customerName || "",
      stockBefore, stockAfter: product.stock,
      addedBy: user || db._currentUser || "system",
      notes: ref.notes || "", createdAt: nowISO()
    };
    db.stockMovements.push(movement);

    if (num(product.minStock) > 0 && product.stock <= num(product.minStock)) {
      db._lowStockAlerts.push({
        productId: product.id, productName: product.name,
        stock: product.stock, minStock: product.minStock,
        date: movement.date, createdAt: nowISO()
      });
    }
    return movement;
  }

  function addStock(db, productId, qty, unitCost, ref, user) {
    ensureCollections(db);
    const product = db.products.find((p) => p.id === productId);
    if (!product) throw new Error(`الصنف غير موجود: ${productId}`);
    qty = num(qty); unitCost = num(unitCost);
    if (qty <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");

    const stockBefore = num(product.stock);
    const oldValue = num(product.cost) * stockBefore;
    const newValue = unitCost * qty;
    const newStock = stockBefore + qty;

    product.stock = newStock;
    if (unitCost > 0) {
      product.cost = newStock > 0 ? round2((oldValue + newValue) / newStock) : unitCost;
    }

    const movement = {
      id: uid(), date: today(), type: "in",
      productId, productName: product.name,
      qty, unitCost, totalCost: round2(unitCost * qty),
      reason: ref.type === "purchase" ? "شراء"
             : ref.type === "return" ? "مرتجع" : "تسوية",
      refId: ref.id || "", refType: ref.type || "manual",
      stockBefore, stockAfter: product.stock,
      addedBy: user || db._currentUser || "system",
      notes: ref.notes || "", createdAt: nowISO()
    };
    db.stockMovements.push(movement);
    return movement;
  }

  function getLowStockAlerts(db) {
    ensureCollections(db);
    return db.products
      .filter((p) => num(p.minStock) > 0 && num(p.stock) <= num(p.minStock))
      .map((p) => ({
        productId: p.id, productName: p.name,
        stock: num(p.stock), minStock: num(p.minStock),
        deficit: Math.max(0, num(p.minStock) - num(p.stock))
      }))
      .sort((a, b) => b.deficit - a.deficit);
  }

  function addNewProduct(db, data, user) {
    data = data || {};
    if (!clean(data.name)) throw new Error("اسم القطعة مطلوب");
    const cleanName = clean(data.name);
    const existing = (db.products || []).find(
      (p) => clean(p.name).toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) throw new Error(`القطعة "${cleanName}" مسجَّلة مسبقًا`);

    const product = {
      id: uid(), name: cleanName,
      cost: round2(num(data.cost)), price: round2(num(data.price)),
      stock: num(data.stock), unit: data.unit || "قطعة",
      category: data.category || "قطع غيار", minStock: num(data.minStock),
      notes: data.notes || "",
      addedBy: user || db._currentUser || "system",
      createdAt: nowISO(), isCustom: true
    };
    db.products.push(product);
    audit(db, "إضافة صنف جديد",
      `${product.name} — تكلفة ${product.cost} | سعر ${product.price}`);
    return product;
  }

  function addMaintenancePartName(db, name, icon) {
    if (!clean(name)) return;
    db.maintenanceParts = db.maintenanceParts || [];
    const exists = db.maintenanceParts.find(
      (p) => clean(p.name).toLowerCase() === clean(name).toLowerCase()
    );
    if (exists) return exists;
    const entry = { name: clean(name), icon: icon || "🔧" };
    db.maintenanceParts.push(entry);
    return entry;
  }

  /* ═══════════════════════════════════════════════════════════
   * §03  Core — Maintenance (with custom parts)
   * ═══════════════════════════════════════════════════════════ */
  function completeMaintenance(db, data, user) {
    ensureCollections(db);
    const partsUsed = (data.partsUsed || []).slice();
    const customPartsInput = (data.customParts || []).slice();
    const createdProducts = [];

    for (const cp of customPartsInput) {
      const qty = num(cp.qty);
      if (!clean(cp.name) || qty <= 0) continue;

      if (cp.addToInventory) {
        let product = db.products.find(
          (p) => clean(p.name).toLowerCase() === clean(cp.name).toLowerCase()
        );
        if (!product) {
          product = addNewProduct(db, {
            name: cp.name, cost: cp.unitCost, price: cp.price,
            stock: cp.stock || qty,
            category: cp.category || "قطع غيار",
            minStock: cp.minStock
          }, user);
          createdProducts.push(product);
        }
        partsUsed.push({ productId: product.id, qty });
        addMaintenancePartName(db, product.name, cp.icon);
      } else {
        partsUsed.push({
          _custom: true, name: clean(cp.name), qty,
          unitCost: round2(num(cp.unitCost)),
          totalCost: round2(num(cp.unitCost) * qty)
        });
        addMaintenancePartName(db, cp.name, cp.icon);
      }
    }

    const customer = db.customers.find((c) => c.id === data.customerId);
    if (!customer) throw new Error("العميل غير موجود");
    const filter = (customer.filters || []).find((f) => f.id === data.filterId);
    if (!filter) throw new Error("الفلتر غير موجود");

    const invoiceNumber = generateInvoiceNumber(db, "maintenance");
    const partsUsedFinal = [];
    let partsCost = 0;

    for (const part of partsUsed) {
      if (part._custom) {
        partsUsedFinal.push({
          productId: null, name: part.name, qty: num(part.qty),
          unitCost: round2(num(part.unitCost)),
          totalCost: round2(num(part.totalCost)),
          isCustomOnce: true
        });
        partsCost += round2(num(part.totalCost));
        continue;
      }
      if (!part.productId || num(part.qty) <= 0) continue;
      const mv = deductStock(db, part.productId, part.qty, {
        type: "maintenance", id: invoiceNumber,
        customerId: customer.id, customerName: customer.name
      }, user);
      partsUsedFinal.push({
        productId: mv.productId, name: mv.productName,
        qty: mv.qty, unitCost: mv.unitCost, totalCost: mv.totalCost
      });
      partsCost += mv.totalCost;
    }
    partsCost = round2(partsCost);

    const revenue = round2(num(data.revenue));
    const laborCost = round2(num(data.laborCost));
    const profit = round2(revenue - partsCost - laborCost);
    const paidAmount = data.paidAmount === undefined ? revenue : round2(num(data.paidAmount));
    const remaining = round2(revenue - paidAmount);

    const maintenance = {
      id: uid(), date: today(),
      customerId: customer.id, customerName: customer.name,
      filterId: filter.id, filterType: filter.type,
      parts: partsUsedFinal.map((p) => `${p.name} (${p.qty})`).join(" + "),
      partsUsed: partsUsedFinal,
      revenue, partsCost, laborCost, profit,
      cost: revenue, paidAmount,
      newType: data.newType || filter.trackingType,
      nextDate: data.nextDate,
      previousDate: filter.nextMaintenance,
      previousType: filter.trackingType,
      tech: data.tech || "", notes: data.notes || "",
      invoiceNumber,
      createdProducts: createdProducts.map((p) => ({ id: p.id, name: p.name })),
      addedBy: user || db._currentUser || "system",
      createdAt: nowISO()
    };
    db.history.push(maintenance);

    filter.lastMaintenance = maintenance.date;
    filter.nextMaintenance = data.nextDate || filter.nextMaintenance;
    filter.trackingType = maintenance.newType;
    filter.price = revenue;

    db.invoices.push({
      id: uid(), number: invoiceNumber, date: maintenance.date,
      customerId: customer.id, customerName: customer.name,
      items: [
        ...partsUsedFinal.map((p) => ({
          productName: p.name, qty: p.qty,
          price: p.unitCost, total: p.totalCost
        })),
        ...(laborCost > 0 ? [{
          productName: "عمالة", qty: 1, price: laborCost, total: laborCost
        }] : [])
      ],
      total: revenue, paid: paidAmount, remaining,
      type: "maintenance", createdAt: nowISO()
    });

    if (paidAmount > 0) {
      db.treasury.currentDay.maintenance = round2(
        num(db.treasury.currentDay.maintenance) + paidAmount
      );
      db.treasury.currentDay.transactions.push({
        id: uid(), date: maintenance.date, type: "maintenance",
        amount: paidAmount, customerId: customer.id,
        customerName: customer.name, invoiceNumber,
        addedBy: user || db._currentUser || "system"
      });
    }

    if (remaining > 0) {
      customer.debts = customer.debts || [];
      customer.debts.push({
        id: uid(), date: maintenance.date, amount: remaining,
        type: "maintenance", invoiceNumber,
        notes: data.notes || "", paid: false
      });
    }

    if (data.requestId && db.requests) {
      const req = db.requests.find((r) => r.id === data.requestId);
      if (req) { req.status = "done"; req.completedAt = nowISO(); }
    }

    audit(db, "صيانة (قطع مخصصة)",
      `${customer.name} — محصل ${revenue} | قطع ${partsCost} | عمالة ${laborCost} | ربح ${profit}`);

    return { maintenance, partsUsed: partsUsedFinal, partsCost, profit, remaining, createdProducts };
  }

  /* ═══════════════════════════════════════════════════════════
   * §04  Core — Sales (POS)
   * ═══════════════════════════════════════════════════════════ */
  function completeSale(db, data, user) {
    ensureCollections(db);
    const invoiceNumber = generateInvoiceNumber(db, "sale");
    const items = [];
    let totalCost = 0, revenue = 0;

    for (const item of (data.items || [])) {
      const product = db.products.find((p) => p.id === item.productId);
      if (!product) continue;
      const qty = num(item.qty), price = num(item.price);

      const mv = deductStock(db, product.id, qty, {
        type: "sale", id: invoiceNumber,
        customerId: data.customerId || null,
        customerName: data.customerName || "عميل نقدي"
      }, user);

      const total = round2(price * qty);
      revenue += total; totalCost += mv.totalCost;

      items.push({
        productId: product.id, productName: product.name,
        qty, price, cost: mv.unitCost, total,
        profit: round2((price - mv.unitCost) * qty)
      });
    }

    revenue = round2(revenue); totalCost = round2(totalCost);
    const profit = round2(revenue - totalCost);
    const paid = data.paid === undefined ? revenue : round2(num(data.paid));
    const remaining = round2(revenue - paid);

    const sale = {
      id: uid(), date: today(), type: data.type || "shop",
      customerId: data.customerId || null,
      customerName: data.customerName || "عميل نقدي",
      items, revenue, totalCost, profit,
      total: revenue, paid, remaining,
      paymentMethod: data.paymentMethod || "نقدي",
      notes: data.notes || "", invoiceNumber,
      addedBy: user || db._currentUser || "system",
      createdAt: nowISO()
    };
    db.sales.push(sale);

    db.invoices.push({
      id: uid(), number: invoiceNumber, date: sale.date,
      customerId: sale.customerId, customerName: sale.customerName,
      items: items.map((i) => ({
        productName: i.productName, qty: i.qty, price: i.price, total: i.total
      })),
      total: revenue, paid, remaining, type: "sale", createdAt: nowISO()
    });

    if (paid > 0) {
      db.treasury.currentDay.sales = round2(num(db.treasury.currentDay.sales) + paid);
      db.treasury.currentDay.transactions.push({
        id: uid(), date: sale.date, type: "sale", amount: paid,
        customerId: sale.customerId, customerName: sale.customerName,
        invoiceNumber, addedBy: user || db._currentUser || "system"
      });
    }

    if (remaining > 0 && sale.customerId) {
      const c = db.customers.find((x) => x.id === sale.customerId);
      if (c) {
        c.debts = c.debts || [];
        c.debts.push({
          id: uid(), date: sale.date, amount: remaining,
          type: "sale", invoiceNumber, paid: false
        });
      }
    }

    audit(db, "بيعة POS", `${invoiceNumber} — ${revenue} | ربح ${profit}`);
    return sale;
  }

  /* ═══════════════════════════════════════════════════════════
   * §05  Core — Installments
   * ═══════════════════════════════════════════════════════════ */
  function payInstallment(db, customerId, installmentNum, user, options) {
    ensureCollections(db);
    options = options || {};
    const customer = db.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error("العميل غير موجود");
    if (!customer.hasInstallments) throw new Error("العميل ليس لديه أقساط");

    const existing = db.installmentsLedger.find(
      (l) => l.customerId === customerId && l.installmentNum === installmentNum
    );
    if (existing) {
      throw new Error(`القسط رقم ${installmentNum} مدفوع مسبقًا بتاريخ ${existing.date}`);
    }

    const amount = round2(options.amount || customer.installmentAmount || 0);
    if (amount <= 0) throw new Error("قيمة القسط غير صحيحة");

    const invoiceNumber = generateInvoiceNumber(db, "installment");
    const date = options.date || today();

    customer.paidInstallments = customer.paidInstallments || [];
    customer.paidInstallments.push({
      num: installmentNum, date, amount, invoiceNumber,
      addedBy: user || db._currentUser || "system"
    });

    db.installmentsLedger.push({
      id: uid(), date, customerId, customerName: customer.name,
      installmentNum, amount, method: options.method || "نقدي",
      invoiceNumber, recordedInTreasury: true,
      addedBy: user || db._currentUser || "system", createdAt: nowISO()
    });

    db.treasury.currentDay.installments = round2(
      num(db.treasury.currentDay.installments) + amount
    );
    db.treasury.currentDay.transactions.push({
      id: uid(), date, type: "installment", amount,
      customerId, customerName: customer.name,
      installmentNum, invoiceNumber,
      addedBy: user || db._currentUser || "system"
    });

    const totalPaid = (customer.paidInstallments || []).reduce(
      (s, p) => s + num(p.amount || customer.installmentAmount), 0
    );
    const totalDue = num(customer.totalAmount) - num(customer.downPayment);
    customer.remainingDebt = Math.max(0, round2(totalDue - totalPaid));

    db.invoices.push({
      id: uid(), number: invoiceNumber, date,
      customerId, customerName: customer.name,
      items: [{
        productName: `قسط رقم ${installmentNum}`,
        qty: 1, price: amount, total: amount
      }],
      total: amount, paid: amount, remaining: 0,
      type: "installment", createdAt: nowISO()
    });

    audit(db, "دفع قسط",
      `${customer.name} — القسط ${installmentNum} — ${amount} ج.م — المتبقي ${customer.remainingDebt} ج.م`);

    return { customer, amount, remainingDebt: customer.remainingDebt, invoiceNumber };
  }

  /* ═══════════════════════════════════════════════════════════
   * §06  Core — Purchases & Suppliers
   * ═══════════════════════════════════════════════════════════ */
  function registerPurchase(db, data, user) {
    ensureCollections(db);
    const invoiceNumber = generateInvoiceNumber(db, "purchase");
    const items = [];
    let total = 0;

    for (const item of (data.items || [])) {
      const mv = addStock(db, item.productId, item.qty, item.unitCost, {
        type: "purchase", id: invoiceNumber, notes: data.supplierName || ""
      }, user);
      items.push({
        productId: mv.productId, productName: mv.productName,
        qty: mv.qty, unitCost: mv.unitCost, total: mv.totalCost
      });
      total += mv.totalCost;
    }

    const purchase = {
      id: uid(), date: data.date || today(),
      supplierId: data.supplierId || null,
      supplierName: data.supplierName || "",
      items, total: round2(total),
      paid: round2(num(data.paid)),
      remaining: round2(num(total) - num(data.paid)),
      invoiceNumber, notes: data.notes || "",
      addedBy: user || db._currentUser || "system",
      createdAt: nowISO()
    };
    db.purchases.push(purchase);
    audit(db, "مشتريات", `${invoiceNumber} — ${purchase.total} ج.م`);
    return purchase;
  }

  function addSupplier(db, data) {
    ensureCollections(db);
    const s = {
      id: uid(), name: clean(data.name),
      phone: clean(data.phone), notes: clean(data.notes),
      createdAt: nowISO()
    };
    db.suppliers.push(s);
    return s;
  }

  /* ═══════════════════════════════════════════════════════════
   * §07  Core — Treasury
   * ═══════════════════════════════════════════════════════════ */
  function withdrawFromSafe(db, amount, reason, user) {
    ensureCollections(db);
    amount = round2(num(amount));
    if (amount <= 0) throw new Error("المبلغ غير صحيح");
    if (num(db.treasury.safeBalance) < amount) {
      console.warn(`⚠️ رصيد الخزينة غير كافٍ`);
    }
    db.treasury.safeBalance = round2(num(db.treasury.safeBalance) - amount);
    db.treasury.safeTransactions = db.treasury.safeTransactions || [];
    db.treasury.safeTransactions.push({
      id: uid(), date: today(), type: "withdrawal", amount, reason,
      addedBy: user || db._currentUser || "system"
    });
    audit(db, "سحب من الخزينة", `${amount} ج.م — ${reason}`);
    return { safeBalance: db.treasury.safeBalance };
  }

  function depositToSafe(db, amount, reason, user) {
    ensureCollections(db);
    amount = round2(num(amount));
    if (amount <= 0) throw new Error("المبلغ غير صحيح");
    db.treasury.safeBalance = round2(num(db.treasury.safeBalance) + amount);
    db.treasury.safeTransactions = db.treasury.safeTransactions || [];
    db.treasury.safeTransactions.push({
      id: uid(), date: today(), type: "deposit", amount, reason,
      addedBy: user || db._currentUser || "system"
    });
    audit(db, "إيداع في الخزينة", `${amount} ج.م — ${reason}`);
    return { safeBalance: db.treasury.safeBalance };
  }

  /* ═══════════════════════════════════════════════════════════
   * §08  Core — Reports
   * ═══════════════════════════════════════════════════════════ */
  function getReceivablesReport(db) {
    const report = {
      totalReceivables: 0, installmentsTotal: 0,
      maintenanceDebtTotal: 0, salesDebtTotal: 0, customers: []
    };
    for (const c of db.customers) {
      if (c.status !== "active") continue;
      const details = { installments: 0, maintenance: 0, sales: 0 };

      if (c.hasInstallments && num(c.totalAmount) > 0) {
        const totalPaid = (c.paidInstallments || []).reduce(
          (s, p) => s + num(p.amount || c.installmentAmount), 0
        );
        const totalDue = num(c.totalAmount) - num(c.downPayment);
        const rem = Math.max(0, round2(totalDue - totalPaid));
        if (rem > 0) details.installments = rem;
      }

      if (Array.isArray(c.debts)) {
        for (const d of c.debts) {
          if (d.paid) continue;
          if (d.type === "maintenance") details.maintenance += num(d.amount);
          else if (d.type === "sale") details.sales += num(d.amount);
        }
      }

      const debt = round2(details.installments + details.maintenance + details.sales);
      if (debt > 0) {
        report.customers.push({
          id: c.id, name: c.name,
          phone: (c.phones && c.phones[0]) || "",
          region: c.region || "", debt,
          details: {
            installments: round2(details.installments),
            maintenance: round2(details.maintenance),
            sales: round2(details.sales)
          }
        });
        report.totalReceivables += debt;
        report.installmentsTotal += details.installments;
        report.maintenanceDebtTotal += details.maintenance;
        report.salesDebtTotal += details.sales;
      }
    }
    report.totalReceivables = round2(report.totalReceivables);
    report.installmentsTotal = round2(report.installmentsTotal);
    report.maintenanceDebtTotal = round2(report.maintenanceDebtTotal);
    report.salesDebtTotal = round2(report.salesDebtTotal);
    report.customers.sort((a, b) => b.debt - a.debt);
    return report;
  }

  function getCustomerStatement(db, customerId) {
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) return null;
    const statement = {
      customer: c, installments: [], maintenance: [], sales: [],
      summary: {
        totalOwed: 0, totalPaid: 0, remaining: 0,
        paidCount: 0, remainingCount: 0,
        maintenanceDebt: 0, salesDebt: 0
      }
    };

    if (c.hasInstallments && num(c.totalAmount) > 0) {
      const totalDue = num(c.totalAmount) - num(c.downPayment);
      const paid = c.paidInstallments || [];
      const totalPaid = paid.reduce((s, p) => s + num(p.amount || c.installmentAmount), 0);

      statement.summary.totalOwed = round2(totalDue);
      statement.summary.totalPaid = round2(totalPaid);
      statement.summary.remaining = round2(Math.max(0, totalDue - totalPaid));
      statement.summary.paidCount = paid.length;
      statement.summary.remainingCount = Math.max(0, num(c.installmentsCount) - paid.length);

      for (let i = 1; i <= num(c.installmentsCount); i++) {
        const p = paid.find((x) => x.num === i);
        statement.installments.push({
          num: i, dueDate: addMonths(c.installmentsStartDate, i - 1),
          amount: num(c.installmentAmount), paid: !!p,
          paidDate: p ? p.date : null,
          invoiceNumber: p ? p.invoiceNumber : null
        });
      }
    }

    statement.maintenance = (db.history || [])
      .filter((h) => h.customerId === customerId)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    statement.sales = (db.sales || [])
      .filter((s) => s.customerId === customerId)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    if (Array.isArray(c.debts)) {
      statement.summary.maintenanceDebt = round2(
        c.debts.filter((d) => !d.paid && d.type === "maintenance")
               .reduce((s, d) => s + num(d.amount), 0)
      );
      statement.summary.salesDebt = round2(
        c.debts.filter((d) => !d.paid && d.type === "sale")
               .reduce((s, d) => s + num(d.amount), 0)
      );
    }
    return statement;
  }

  function reconcileCollections(db, fromDate, toDate) {
    ensureCollections(db);
    const inRange = (d) => d >= fromDate && d <= toDate;

    const installmentsCollected = db.installmentsLedger
      .filter((l) => inRange(l.date) && !l._migrated)
      .reduce((s, l) => s + num(l.amount), 0);

    const maintenanceCollected = (db.history || [])
      .filter((h) => inRange(h.date))
      .reduce((s, h) => s + num(h.paidAmount || h.revenue), 0);

    const salesCollected = (db.sales || [])
      .filter((s) => inRange(s.date))
      .reduce((s, sale) => s + num(sale.paid), 0);

    let recordedInstallments = 0, recordedMaintenance = 0, recordedSales = 0;
    const addDrawer = (d) => {
      if (!inRange(d.date)) return;
      recordedInstallments += num(d.installments);
      recordedMaintenance += num(d.maintenance);
      recordedSales += num(d.sales);
    };
    const cd = db.treasury.currentDay;
    if (cd && inRange(cd.date)) addDrawer(cd);
    for (const d of (db.treasury.drawerHistory || [])) addDrawer(d);

    const pkg = (collected, recorded) => ({
      collected: round2(collected), recorded: round2(recorded),
      difference: round2(collected - recorded),
      status: Math.abs(collected - recorded) < 1 ? "✅ مطابق" : "⚠️ فرق"
    });

    const r = {
      fromDate, toDate,
      installments: pkg(installmentsCollected, recordedInstallments),
      maintenance: pkg(maintenanceCollected, recordedMaintenance),
      sales: pkg(salesCollected, recordedSales)
    };
    r.total = pkg(
      r.installments.collected + r.maintenance.collected + r.sales.collected,
      r.installments.recorded + r.maintenance.recorded + r.sales.recorded
    );
    return r;
  }

  function getProfitReport(db, fromDate, toDate) {
    const inRange = (d) => d >= fromDate && d <= toDate;
    const mnt = (db.history || []).filter((h) => inRange(h.date));
    const sales = (db.sales || []).filter((s) => inRange(s.date));

    const maintenance = {
      revenue: round2(mnt.reduce((s, h) => s + num(h.revenue || h.cost), 0)),
      partsCost: round2(mnt.reduce((s, h) => s + num(h.partsCost), 0)),
      laborCost: round2(mnt.reduce((s, h) => s + num(h.laborCost), 0)),
      profit: round2(mnt.reduce((s, h) => s + num(h.profit), 0)),
      count: mnt.length
    };
    const selling = {
      revenue: round2(sales.reduce((s, x) => s + num(x.revenue || x.total), 0)),
      cost: round2(sales.reduce((s, x) => s + num(x.totalCost), 0)),
      profit: round2(sales.reduce((s, x) => s + num(x.profit), 0)),
      count: sales.length
    };
    return {
      fromDate, toDate, maintenance, sales: selling,
      total: {
        revenue: round2(maintenance.revenue + selling.revenue),
        cost: round2(maintenance.partsCost + maintenance.laborCost + selling.cost),
        profit: round2(maintenance.profit + selling.profit)
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════
   * §09  Requests — Address Support
   * ═══════════════════════════════════════════════════════════ */
  function addMaintenanceRequest(db, data, user) {
    ensureCollections(db);
    data = data || {};
    if (!clean(data.name)) throw new Error("اسم العميل مطلوب");
    if (!clean(data.phone)) throw new Error("رقم الهاتف مطلوب");
    if (!clean(data.problem)) throw new Error("وصف المشكلة مطلوب");

    let customerId = data.customerId || null;
    let customerAddress = "";
    if (!customerId && data.phone) {
      const found = db.customers.find((c) =>
        (c.phones || []).some((p) => clean(p) === clean(data.phone))
      );
      if (found) { customerId = found.id; customerAddress = found.address || ""; }
    }
    if (customerId && !data.address) {
      const c = db.customers.find((x) => x.id === customerId);
      if (c) customerAddress = c.address || "";
    }

    const request = {
      id: uid(), name: clean(data.name), phone: clean(data.phone),
      problem: clean(data.problem),
      address: clean(data.address) || customerAddress || "",
      region: clean(data.region) || "",
      scheduledDate: data.scheduledDate || today(),
      status: data.status || "new",
      priority: data.priority || "normal",
      customerId, notes: clean(data.notes),
      source: data.source || "manual",
      createdBy: user || db._currentUser || "system",
      createdAt: nowISO()
    };
    db.requests.push(request);
    audit(db, "طلب صيانة",
      `${request.name} — ${request.problem.slice(0, 50)} — ${request.address || "بدون عنوان"}`);
    return request;
  }

  function updateRequest(db, requestId, updates, user) {
    const req = (db.requests || []).find((r) => r.id === requestId);
    if (!req) throw new Error("الطلب غير موجود");
    const allowed = ["name", "phone", "problem", "address", "region",
                     "scheduledDate", "status", "priority", "notes"];
    for (const key of allowed) {
      if (updates[key] !== undefined) req[key] = clean(updates[key]);
    }
    req.updatedAt = nowISO();
    req.updatedBy = user || db._currentUser || "system";
    return req;
  }

  function updateRequestAddress(db, requestId, address, user) {
    return updateRequest(db, requestId, { address }, user);
  }

  function deleteRequest(db, requestId, user) {
    const idx = (db.requests || []).findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error("الطلب غير موجود");
    const req = db.requests[idx];
    db.requests.splice(idx, 1);
    audit(db, "حذف طلب صيانة", `${req.name}`);
    return req;
  }

  function suggestAddresses(db, query, limit) {
    limit = limit || 8;
    const q = clean(query).toLowerCase();
    if (!q) return [];
    const results = new Map();

    for (const c of (db.customers || [])) {
      const addr = clean(c.address);
      if (!addr || !addr.toLowerCase().includes(q)) continue;
      const key = addr.toLowerCase();
      if (results.has(key)) results.get(key).count++;
      else results.set(key, {
        address: addr, customerName: c.name,
        region: c.region || "", count: 1
      });
    }
    for (const r of (db.requests || [])) {
      const addr = clean(r.address);
      if (!addr || !addr.toLowerCase().includes(q)) continue;
      const key = addr.toLowerCase();
      if (!results.has(key)) results.set(key, {
        address: addr, customerName: r.name,
        region: r.region || "", count: 1
      });
    }
    return Array.from(results.values())
      .sort((a, b) => b.count - a.count).slice(0, limit);
  }

  function searchRequests(db, filters) {
    filters = filters || {};
    return (db.requests || []).filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      if (filters.region && !clean(r.region).includes(filters.region)) return false;
      if (filters.text) {
        const q = filters.text.toLowerCase();
        const hay = [r.name, r.phone, r.problem, r.address, r.region, r.notes]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.fromDate && r.scheduledDate < filters.fromDate) return false;
      if (filters.toDate && r.scheduledDate > filters.toDate) return false;
      return true;
    });
  }

  function getRequestsByRegion(db) {
    const map = new Map();
    for (const r of (db.requests || [])) {
      if (r.status === "done") continue;
      const region = clean(r.region) || "غير محدد";
      if (!map.has(region)) map.set(region, { region, count: 0, requests: [] });
      const entry = map.get(region);
      entry.count++;
      entry.requests.push({ id: r.id, name: r.name, address: r.address });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  /* ═══════════════════════════════════════════════════════════
   * §10  Migration
   * ═══════════════════════════════════════════════════════════ */
  function migrateToV29(db) {
    console.log("🚀 بدء الترحيل إلى v29...");
    ensureCollections(db);
    const stats = {
      historyMigrated: 0, salesMigrated: 0,
      installmentsMigrated: 0, stockMovementsAdded: 0,
      requestsMigrated: 0, requestsLinked: 0
    };

    for (const h of db.history) {
      if (h.revenue === undefined) {
        h.revenue = num(h.cost || h.paidAmount);
        h.partsCost = num(h.partsCost);
        h.laborCost = num(h.laborCost);
        h.profit = round2(h.revenue - h.partsCost - h.laborCost);
        h.partsUsed = h.partsUsed || [];
        stats.historyMigrated++;
      }
    }
    for (const s of db.sales) {
      if (s.revenue === undefined) {
        s.revenue = num(s.total);
        s.totalCost = num(s.totalCost);
        s.profit = round2(s.revenue - s.totalCost);
        s.partsUsed = s.partsUsed || [];
        stats.salesMigrated++;
      }
    }
    for (const c of db.customers) {
      if (c.hasInstallments && Array.isArray(c.paidInstallments)) {
        for (const p of c.paidInstallments) {
          if (!p.amount) p.amount = num(c.installmentAmount);
          const exists = db.installmentsLedger.find(
            (l) => l.customerId === c.id && l.installmentNum === p.num
          );
          if (!exists) {
            db.installmentsLedger.push({
              id: uid(), date: p.date, customerId: c.id,
              customerName: c.name, installmentNum: p.num,
              amount: num(p.amount), method: "نقدي",
              invoiceNumber: p.invoiceNumber || `MIG-${c.id}-${p.num}`,
              recordedInTreasury: false, addedBy: "migration",
              createdAt: nowISO(), _migrated: true
            });
            stats.installmentsMigrated++;
          }
        }
        const totalPaid = c.paidInstallments.reduce((s, p) => s + num(p.amount), 0);
        const totalDue = num(c.totalAmount) - num(c.downPayment);
        c.remainingDebt = Math.max(0, round2(totalDue - totalPaid));
      }
    }
    for (const p of db.products) {
      const already = db.stockMovements.find(
        (m) => m.productId === p.id && m.reason === "رصيد افتتاحي"
      );
      if (!already && num(p.stock) > 0) {
        db.stockMovements.push({
          id: uid(), date: today(), type: "in",
          productId: p.id, productName: p.name,
          qty: num(p.stock), unitCost: num(p.cost),
          totalCost: round2(num(p.cost) * num(p.stock)),
          reason: "رصيد افتتاحي", refType: "manual",
          stockBefore: 0, stockAfter: num(p.stock),
          addedBy: "migration",
          notes: "رصيد افتتاحي عند الترقية لـ v29",
          createdAt: nowISO()
        });
        stats.stockMovementsAdded++;
      }
    }
    for (const req of db.requests) {
      if (req.address === undefined) {
        req.address = "";
        stats.requestsMigrated++;
        if (!req.customerId && req.phone) {
          const found = db.customers.find((c) =>
            (c.phones || []).some((p) => clean(p) === clean(req.phone))
          );
          if (found) {
            req.customerId = found.id;
            req.address = found.address || "";
            stats.requestsLinked++;
          }
        }
      }
      if (req.region === undefined) req.region = "";
      if (req.priority === undefined) req.priority = "normal";
    }

    db.version = "29";
    db.migratedAt = nowISO();
    console.log("✅ اكتمل الترحيل:", stats);
    return stats;
  }

  /* ═══════════════════════════════════════════════════════════
   * §11  CSS Injection
   * ═══════════════════════════════════════════════════════════ */
  const CSS_TEXT = `
.ideal-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:15px}
.ideal-modal .modal-content{background:#fff;border-radius:12px;padding:25px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 10px 30px rgba(0,0,0,.3);direction:rtl;font-family:inherit}
.ideal-modal h3{margin-top:0;color:#1976d2}
.ideal-form-row{display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap}
.ideal-form-row label{min-width:160px;font-weight:600;color:#444}
.ideal-form-row input,.ideal-form-row select,.ideal-form-row textarea{flex:1;min-width:180px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:14px}
.ideal-form-row textarea{resize:vertical}
.ideal-req{color:#d32f2f;font-weight:bold}
.ideal-fieldset{border:1px solid #ddd;border-radius:8px;padding:15px;margin:15px 0;background:#fafafa}
.ideal-fieldset legend{font-weight:bold;color:#1976d2;padding:0 10px}
.ideal-btn{padding:9px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit}
.ideal-btn-save{background:#1976d2;color:#fff}.ideal-btn-save:hover{background:#1565c0}
.ideal-btn-cancel{background:#eee;color:#333}.ideal-btn-cancel:hover{background:#ddd}
.ideal-btn-green{background:#4caf50;color:#fff}.ideal-btn-green:hover{background:#388e3c}
.ideal-btn-danger{background:#f44336;color:#fff}.ideal-btn-danger:hover{background:#d32f2f}
.ideal-btn-orange{background:#ff9800;color:#fff}
.ideal-parts-list{margin:10px 0}
.ideal-part-row{display:flex;align-items:center;gap:8px;padding:8px;background:#fff;border-radius:6px;margin:5px 0;border:1px solid #eee}
.ideal-part-row select{flex:2;padding:6px;min-width:180px}
.ideal-part-row input[type=number]{width:80px;padding:6px}
.ideal-part-row .part-cost{color:#388e3c;font-weight:600;min-width:80px;text-align:left}
.ideal-part-row.custom-part{background:#fff3e0;border-color:#ffb74d}
.ideal-part-row .remove{background:#f44336;color:#fff;border:none;border-radius:4px;padding:6px 10px;cursor:pointer}
.ideal-parts-actions{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.ideal-parts-total{margin-top:10px;padding:10px;background:#e3f2fd;border-radius:6px;font-size:15px;text-align:right}
.ideal-profit-box{background:#f1f8e9;border:2px solid #8bc34a;border-radius:8px;padding:15px;margin:15px 0}
.ideal-profit-box .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #c5e1a5}
.ideal-profit-box .row.profit{background:#c8e6c9;padding:10px;margin-top:8px;border-radius:5px;font-size:17px;border-bottom:none}
.ideal-profit-box .row.profit strong{color:#2e7d32}
.ideal-profit-box .row.remaining{color:#d84315;border-bottom:none}
.ideal-modal-actions{display:flex;gap:10px;margin-top:20px;padding-top:15px;border-top:1px solid #eee}
.ideal-modal-actions .ideal-btn{flex:1;padding:11px;font-size:15px}
.ideal-address-wrap{position:relative;flex:1}
.ideal-address-wrap input{width:100%}
.ideal-suggestions{position:absolute;top:100%;right:0;left:0;background:#fff;border:1px solid #ccc;border-top:none;border-radius:0 0 6px 6px;max-height:220px;overflow-y:auto;z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.ideal-suggestion{padding:10px 12px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:14px;transition:background .15s}
.ideal-suggestion:hover{background:#e3f2fd}
.ideal-suggestion .sugg-address{color:#1976d2;font-weight:600;display:block;margin-bottom:2px}
.ideal-suggestion .sugg-meta{color:#666;font-size:12px}
.ideal-requests-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:15px;padding:15px}
.ideal-request-card{background:#fff;border-radius:10px;padding:15px;box-shadow:0 2px 8px rgba(0,0,0,.08);border-right:4px solid #ccc;direction:rtl;transition:transform .15s,box-shadow .15s}
.ideal-request-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.12)}
.ideal-request-card[data-priority="low"]{border-right-color:#4caf50}
.ideal-request-card[data-priority="normal"]{border-right-color:#ffc107}
.ideal-request-card[data-priority="high"]{border-right-color:#ff9800}
.ideal-request-card[data-priority="urgent"]{border-right-color:#f44336}
.ideal-request-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #eee}
.ideal-req-name{font-size:16px;color:#1976d2}
.ideal-req-date{font-size:12px;color:#999}
.ideal-priority-badge{display:inline-block;width:10px;height:10px;border-radius:50%;margin-left:8px}
.ideal-request-card[data-priority="low"] .ideal-priority-badge{background:#4caf50}
.ideal-request-card[data-priority="normal"] .ideal-priority-badge{background:#ffc107}
.ideal-request-card[data-priority="high"] .ideal-priority-badge{background:#ff9800}
.ideal-request-card[data-priority="urgent"] .ideal-priority-badge{background:#f44336;animation:ideal-pulse 1.2s infinite}
@keyframes ideal-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.ideal-request-body{margin:10px 0}
.ideal-req-line{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:14px;color:#333}
.ideal-req-line .icon{width:22px;text-align:center}
.ideal-req-address-line{background:#f5f5f5;border-radius:6px;padding:6px 8px}
.ideal-req-address{flex:1;font-weight:600;color:#2e7d32}
.ideal-req-address:empty::before{content:"بدون عنوان";color:#999;font-style:italic;font-weight:400}
.ideal-btn-edit-addr{background:none;border:none;cursor:pointer;padding:2px 6px;font-size:14px;opacity:.6}
.ideal-btn-edit-addr:hover{opacity:1}
.ideal-request-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid #eee}
.ideal-request-actions button{flex:1;min-width:70px;padding:6px 8px;font-size:12px;border:none;border-radius:5px;cursor:pointer;font-weight:600}
.ideal-btn-complete{background:#4caf50;color:#fff}
.ideal-btn-whatsapp{background:#25d366;color:#fff}
.ideal-btn-map{background:#4285f4;color:#fff}
.ideal-btn-edit{background:#eee;color:#333}
.ideal-btn-delete{background:#f44336;color:#fff}
.ideal-request-actions button:hover{filter:brightness(.92)}
.ideal-report-box{background:#fff;border-radius:10px;padding:20px;margin:15px 0;box-shadow:0 2px 8px rgba(0,0,0,.08);direction:rtl}
.ideal-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:15px 0}
.ideal-stat-card{background:#f5f5f5;border-radius:8px;padding:15px;text-align:center}
.ideal-stat-card span{display:block;font-size:13px;color:#666;margin-bottom:6px}
.ideal-stat-card strong{font-size:22px;color:#1976d2}
.ideal-stat-card.warn strong{color:#d32f2f}
.ideal-stat-card.ok strong{color:#2e7d32}
.ideal-table{width:100%;border-collapse:collapse;margin-top:15px;direction:rtl}
.ideal-table th,.ideal-table td{padding:10px 8px;text-align:right;border-bottom:1px solid #eee;font-size:14px}
.ideal-table th{background:#f5f5f5;font-weight:700;color:#333}
.ideal-table tr:hover{background:#f9f9f9}
.ideal-table .ok{color:#2e7d32;font-weight:600}
.ideal-table .warn{color:#d32f2f;font-weight:600}
.ideal-table .total-row{background:#e3f2fd;font-weight:700}
.ideal-empty{text-align:center;padding:40px;color:#999;font-size:16px}
.ideal-badge{display:inline-block;background:#f44336;color:#fff;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600}
.ideal-toast{position:fixed;bottom:20px;right:20px;background:#323232;color:#fff;padding:12px 20px;border-radius:8px;z-index:10000;font-family:inherit;box-shadow:0 4px 16px rgba(0,0,0,.3);animation:ideal-slide .3s ease}
.ideal-toast.success{background:#2e7d32}
.ideal-toast.error{background:#c62828}
@keyframes ideal-slide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
#idealExtrasButtons{display:flex;flex-direction:column;gap:8px;padding:12px;margin:10px 0;border-top:1px solid rgba(255,255,255,.1)}
#idealExtrasButtons button{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,.08);color:inherit;text-decoration:none;border:none;cursor:pointer;font:inherit;text-align:right;transition:background .15s;width:100%}
#idealExtrasButtons button:hover{background:rgba(255,255,255,.18)}
`;

  function injectCSS() {
    if (document.getElementById("ideal-v29-styles")) return;
    const style = document.createElement("style");
    style.id = "ideal-v29-styles";
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  }

  /* ═══════════════════════════════════════════════════════════
   * §12  HTML Modals Injection
   * ═══════════════════════════════════════════════════════════ */
  const HTML_MODALS = `
<div id="idealMaintenanceModal" class="ideal-modal" style="display:none">
  <div class="modal-content">
    <h3>🔧 إتمام الصيانة</h3>
    <div class="ideal-form-row"><label>العميل:</label><span id="idealMntCustomerName"></span></div>
    <div class="ideal-form-row"><label>الفلتر:</label><span id="idealMntFilterType"></span></div>
    <fieldset class="ideal-fieldset">
      <legend>القطع المستخدمة</legend>
      <div class="ideal-parts-actions">
        <button type="button" class="ideal-btn ideal-btn-save" onclick="IdealUI.addExistingPartRow()">➕ قطعة من المخزون</button>
        <button type="button" class="ideal-btn ideal-btn-green" onclick="IdealUI.openNewPartModal()">✨ قطعة جديدة (غير مسجلة)</button>
      </div>
      <div id="idealPartsList" class="ideal-parts-list"></div>
      <div class="ideal-parts-total">إجمالي تكلفة القطع: <strong id="idealPartsCostTotal">0</strong> ج.م</div>
    </fieldset>
    <fieldset class="ideal-fieldset">
      <legend>التكاليف</legend>
      <div class="ideal-form-row"><label>المحصل من العميل:</label>
        <input type="number" id="idealMntRevenue" value="0" min="0" oninput="IdealUI.calcMntProfit()"></div>
      <div class="ideal-form-row"><label>تكلفة العمالة:</label>
        <input type="number" id="idealMntLabor" value="0" min="0" oninput="IdealUI.calcMntProfit()"></div>
      <div class="ideal-form-row"><label>المدفوع فعليًا:</label>
        <input type="number" id="idealMntPaid" value="0" min="0" oninput="IdealUI.calcMntProfit()"></div>
    </fieldset>
    <div class="ideal-profit-box">
      <div class="row"><span>الإيراد:</span><strong id="idealPRevenue">0</strong></div>
      <div class="row"><span>تكلفة القطع:</span><strong id="idealPParts">0</strong></div>
      <div class="row"><span>تكلفة العمالة:</span><strong id="idealPLabor">0</strong></div>
      <div class="row profit"><span>الربح الصافي:</span><strong id="idealPProfit">0</strong> ج.م</div>
      <div class="row remaining"><span>المتبقي على العميل:</span><strong id="idealPRemaining">0</strong> ج.م</div>
    </div>
    <fieldset class="ideal-fieldset">
      <legend>تفاصيل الصيانة</legend>
      <div class="ideal-form-row"><label>الفني:</label><input type="text" id="idealMntTech"></div>
      <div class="ideal-form-row"><label>ملاحظات:</label><textarea id="idealMntNotes" rows="2"></textarea></div>
      <div class="ideal-form-row"><label>نوع المتابعة:</label>
        <select id="idealMntNewType">
          <option value="شهري">شهري</option>
          <option value="كل شهرين">كل شهرين</option>
          <option value="كل 3 شهور">كل 3 شهور</option>
          <option value="نصف سنوي">نصف سنوي</option>
          <option value="سنوي">سنوي</option>
          <option value="منتظم">منتظم</option>
        </select>
      </div>
      <div class="ideal-form-row"><label>موعد الصيانة القادمة:</label>
        <input type="date" id="idealMntNextDate"></div>
    </fieldset>
    <div class="ideal-modal-actions">
      <button class="ideal-btn ideal-btn-save" onclick="IdealUI.submitMaintenance()">💾 حفظ الصيانة</button>
      <button class="ideal-btn ideal-btn-cancel" onclick="IdealUI.closeMaintenance()">إلغاء</button>
    </div>
  </div>
</div>

<div id="idealNewPartModal" class="ideal-modal" style="display:none">
  <div class="modal-content">
    <h3>✨ إضافة قطعة جديدة</h3>
    <div class="ideal-form-row"><label>اسم القطعة <span class="ideal-req">*</span>:</label>
      <input type="text" id="idealNpName"></div>
    <div class="ideal-form-row"><label>التصنيف:</label>
      <select id="idealNpCategory">
        <option value="شمعات">شمعات</option><option value="هاوس">هاوس</option>
        <option value="حوامل فلاتر">حوامل فلاتر</option><option value="فلاتر">فلاتر</option>
        <option value="قطع غيار">قطع غيار</option><option value="أخرى">أخرى</option>
      </select>
    </div>
    <div class="ideal-form-row"><label>الأيقونة:</label>
      <input type="text" id="idealNpIcon" value="🔧" maxlength="2" style="width:60px;text-align:center"></div>
    <div class="ideal-form-row"><label>تكلفة الوحدة <span class="ideal-req">*</span>:</label>
      <input type="number" id="idealNpCost" value="0" min="0" oninput="IdealUI.calcNewPartTotal()"></div>
    <div class="ideal-form-row"><label>سعر البيع (اختياري):</label>
      <input type="number" id="idealNpPrice" value="0" min="0"></div>
    <div class="ideal-form-row"><label>الكمية المستخدمة <span class="ideal-req">*</span>:</label>
      <input type="number" id="idealNpQty" value="1" min="1" oninput="IdealUI.calcNewPartTotal()"></div>
    <div class="ideal-form-row"><label>إجمالي التكلفة:</label>
      <strong id="idealNpTotal">0</strong> ج.م</div>
    <hr>
    <div class="ideal-form-row" style="flex-direction:column;align-items:flex-start">
      <label style="min-width:auto;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="idealNpAddToInventory" checked onchange="IdealUI.toggleInventoryFields()">
        إضافة القطعة إلى المخزون بشكل دائم
      </label>
      <small style="color:#666;font-size:12px;padding-right:25px">إن ألغيت التحديد، ستُحسب التكلفة فقط دون تسجيلها في المخزون</small>
    </div>
    <div id="idealNpInventoryFields">
      <div class="ideal-form-row"><label>الرصيد الحالي بعد الإضافة:</label>
        <input type="number" id="idealNpStock" value="0" min="0"></div>
      <div class="ideal-form-row"><label>حد الطلب الأدنى:</label>
        <input type="number" id="idealNpMinStock" value="0" min="0"></div>
    </div>
    <div class="ideal-modal-actions">
      <button class="ideal-btn ideal-btn-green" onclick="IdealUI.confirmNewPart()">➕ إضافة القطعة</button>
      <button class="ideal-btn ideal-btn-cancel" onclick="IdealUI.closeNewPartModal()">إلغاء</button>
    </div>
  </div>
</div>

<div id="idealRequestModal" class="ideal-modal" style="display:none">
  <div class="modal-content">
    <h3 id="idealRequestModalTitle">📝 طلب صيانة جديد</h3>
    <div class="ideal-form-row"><label>اسم العميل <span class="ideal-req">*</span>:</label>
      <input type="text" id="idealRqName"></div>
    <div class="ideal-form-row"><label>رقم الهاتف <span class="ideal-req">*</span>:</label>
      <input type="tel" id="idealRqPhone" onblur="IdealUI.autoLinkCustomerByPhone(this.value)">
      <small id="idealRqLinkHint" style="color:#388e3c;display:none;width:100%;text-align:right">✓ مربوط بعميل موجود</small>
    </div>
    <div class="ideal-form-row"><label>وصف المشكلة <span class="ideal-req">*</span>:</label>
      <textarea id="idealRqProblem" rows="2"></textarea></div>
    <div class="ideal-form-row"><label>📍 العنوان:</label>
      <div class="ideal-address-wrap">
        <input type="text" id="idealRqAddress" autocomplete="off" placeholder="مثال: شبرا - مسجد الرحمة - منزل حسن" oninput="IdealUI.onAddressInput(this.value)">
        <div id="idealAddressSuggestions" class="ideal-suggestions" style="display:none"></div>
      </div>
    </div>
    <div class="ideal-form-row"><label>المنطقة:</label>
      <input type="text" id="idealRqRegion" list="idealRegionsList">
      <datalist id="idealRegionsList"></datalist></div>
    <div class="ideal-form-row"><label>موعد الزيارة:</label>
      <input type="date" id="idealRqScheduledDate"></div>
    <div class="ideal-form-row"><label>الأولوية:</label>
      <select id="idealRqPriority">
        <option value="low">🟢 منخفضة</option>
        <option value="normal" selected>🟡 عادية</option>
        <option value="high">🟠 عالية</option>
        <option value="urgent">🔴 عاجلة</option>
      </select>
    </div>
    <div class="ideal-form-row"><label>ملاحظات:</label>
      <textarea id="idealRqNotes" rows="2"></textarea></div>
    <div class="ideal-modal-actions">
      <button class="ideal-btn ideal-btn-save" onclick="IdealUI.submitRequest()">💾 حفظ الطلب</button>
      <button class="ideal-btn ideal-btn-cancel" onclick="IdealUI.closeRequestModal()">إلغاء</button>
    </div>
  </div>
</div>

<div id="idealReportOverlay" class="ideal-modal" style="display:none;padding:20px;overflow-y:auto">
  <div class="modal-content" style="max-width:1100px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;gap:10px;flex-wrap:wrap">
      <h2 id="idealReportTitle" style="margin:0">تقرير</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="ideal-btn ideal-btn-green" onclick="IdealExtras.exportExcel()">📊 Excel</button>
        <button class="ideal-btn ideal-btn-orange" onclick="IdealExtras.exportPDF()">🖨️ PDF</button>
        <button class="ideal-btn ideal-btn-cancel" onclick="IdealExtras.closeReport()">✖ إغلاق</button>
      </div>
    </div>
    <div id="idealReportContent"></div>
  </div>
</div>
`;

  function injectHTML() {
    if (document.getElementById("ideal-v29-modals")) return;
    const wrap = document.createElement("div");
    wrap.id = "ideal-v29-modals";
    wrap.innerHTML = HTML_MODALS;
    document.body.appendChild(wrap);
  }

  /* ═══════════════════════════════════════════════════════════
   * §13  UI Logic
   * ═══════════════════════════════════════════════════════════ */
  const UI = {
    _customerId: null, _filterId: null, _requestId: null,
    _parts: [], _requestEditId: null, _addressTimer: null,

    toast(msg, type) {
      const el = document.createElement("div");
      el.className = "ideal-toast" + (type ? " " + type : "");
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    },

    /* ========= MAINTENANCE ========= */
    openMaintenance(customerId, filterId, requestId) {
      const db = global.db;
      if (!db) return alert("لا يوجد db");
      ensureCollections(db);
      this._customerId = customerId;
      this._filterId = filterId;
      this._requestId = requestId || null;
      this._parts = [];

      const c = db.customers.find((x) => x.id === customerId);
      if (!c) return alert("العميل غير موجود");
      const f = (c.filters || []).find((x) => x.id === filterId);
      if (!f) return alert("الفلتر غير موجود");

      $("#idealMntCustomerName").textContent = c.name;
      $("#idealMntFilterType").textContent = f.type;
      $("#idealMntRevenue").value = f.price || 0;
      $("#idealMntPaid").value = f.price || 0;
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      $("#idealMntNextDate").value = next.toISOString().slice(0, 10);
      $("#idealMntNewType").value = f.trackingType || "شهري";
      $("#idealPartsList").innerHTML = "";
      this.calcMntProfit();
      $("#idealMaintenanceModal").style.display = "flex";
    },

    closeMaintenance() {
      $("#idealMaintenanceModal").style.display = "none";
      this._customerId = null; this._filterId = null;
      this._requestId = null; this._parts = [];
    },

    addExistingPartRow() {
      const db = global.db;
      const products = (db.products || []).filter((p) => p.stock > 0 || p.isCustom);
      if (!products.length) return alert("لا توجد أصناف متاحة");
      const idx = this._parts.length;
      this._parts.push({ type: "stock", productId: null, qty: 1 });
      const row = document.createElement("div");
      row.className = "ideal-part-row";
      row.dataset.idx = idx;
      row.innerHTML = `
        <select class="part-product" onchange="IdealUI.updateStockPart(${idx},this.value)">
          <option value="">— اختر القطعة —</option>
          ${products.map((p) => `<option value="${p.id}" data-cost="${p.cost}">${escapeHtml(p.name)} (متاح: ${p.stock}) — تكلفة: ${p.cost}</option>`).join("")}
        </select>
        <input type="number" class="part-qty" value="1" min="1" onchange="IdealUI.updateStockPartQty(${idx},this.value)">
        <span class="part-cost" id="idealPartCost_${idx}">0</span> ج.م
        <button class="remove" onclick="IdealUI.removePart(${idx})">✕</button>`;
      $("#idealPartsList").appendChild(row);
      this.updatePartsCost();
    },

    updateStockPart(idx, productId) {
      this._parts[idx].productId = productId ? Number(productId) : null;
      this.updatePartsCost();
    },

    updateStockPartQty(idx, qty) {
      this._parts[idx].qty = Math.max(1, Number(qty) || 1);
      this.updatePartsCost();
    },

    removePart(idx) {
      this._parts[idx] = null;
      const row = document.querySelector(`.ideal-part-row[data-idx="${idx}"]`);
      if (row) row.remove();
      this.updatePartsCost();
    },

    updatePartsCost() {
      const db = global.db;
      let total = 0;
      this._parts.forEach((part, idx) => {
        if (!part) return;
        let cost = 0;
        if (part.type === "stock" && part.productId) {
          const p = db.products.find((x) => x.id === part.productId);
          if (p) cost = num(p.cost) * part.qty;
        } else if (part.type === "new") {
          cost = num(part.unitCost) * part.qty;
        }
        total += cost;
        const el = $(`#idealPartCost_${idx}`);
        if (el) el.textContent = formatMoney(cost);
      });
      $("#idealPartsCostTotal").textContent = formatMoney(total);
      this.calcMntProfit();
    },

    calcMntProfit() {
      const revenue = num($("#idealMntRevenue").value);
      const parts = num($("#idealPartsCostTotal").textContent.replace(/,/g, ""));
      const labor = num($("#idealMntLabor").value);
      const paid = num($("#idealMntPaid").value);
      $("#idealPRevenue").textContent = formatMoney(revenue);
      $("#idealPParts").textContent = formatMoney(parts);
      $("#idealPLabor").textContent = formatMoney(labor);
      $("#idealPProfit").textContent = formatMoney(revenue - parts - labor);
      $("#idealPRemaining").textContent = formatMoney(revenue - paid);
    },

    openNewPartModal() {
      $("#idealNpName").value = "";
      $("#idealNpCost").value = 0; $("#idealNpPrice").value = 0;
      $("#idealNpQty").value = 1; $("#idealNpStock").value = 0;
      $("#idealNpMinStock").value = 0; $("#idealNpIcon").value = "🔧";
      $("#idealNpAddToInventory").checked = true;
      $("#idealNpInventoryFields").style.display = "block";
      $("#idealNpTotal").textContent = "0";
      $("#idealNewPartModal").style.display = "flex";
    },

    closeNewPartModal() { $("#idealNewPartModal").style.display = "none"; },

    calcNewPartTotal() {
      const cost = num($("#idealNpCost").value);
      const qty = num($("#idealNpQty").value);
      $("#idealNpTotal").textContent = formatMoney(cost * qty);
    },

    toggleInventoryFields() {
      $("#idealNpInventoryFields").style.display =
        $("#idealNpAddToInventory").checked ? "block" : "none";
    },

    confirmNewPart() {
      const db = global.db;
      const name = clean($("#idealNpName").value);
      const cost = num($("#idealNpCost").value);
      const price = num($("#idealNpPrice").value);
      const qty = num($("#idealNpQty").value);
      const stock = num($("#idealNpStock").value);
      const minStock = num($("#idealNpMinStock").value);
      const icon = $("#idealNpIcon").value || "🔧";
      const category = $("#idealNpCategory").value;
      const addToInventory = $("#idealNpAddToInventory").checked;

      if (!name) return alert("اسم القطعة مطلوب");
      if (cost <= 0) return alert("يجب إدخال تكلفة القطعة");
      if (qty <= 0) return alert("الكمية يجب أن تكون 1 على الأقل");

      const existing = db.products.find((p) =>
        clean(p.name).toLowerCase() === name.toLowerCase());
      if (existing) {
        if (confirm(`القطعة "${name}" موجودة (تكلفة ${existing.cost}).\nاستخدام الموجود؟`)) {
          this.addExistingPartById(existing.id, qty);
          this.closeNewPartModal();
        }
        return;
      }

      const idx = this._parts.length;
      this._parts.push({ type: "new", name, unitCost: cost, price, qty,
        stock, minStock, icon, category, addToInventory });

      const row = document.createElement("div");
      row.className = "ideal-part-row custom-part";
      row.dataset.idx = idx;
      row.innerHTML = `
        <span style="flex:2">${icon} <strong>${escapeHtml(name)}</strong>
          ${addToInventory ? '<small style="color:#388e3c">(ستُضاف للمخزون)</small>'
                           : '<small style="color:#f57c00">(مرة واحدة)</small>'}
        </span>
        <input type="number" class="part-qty" value="${qty}" min="1"
               onchange="IdealUI.updateNewPartQty(${idx},this.value)">
        <span class="part-cost" id="idealPartCost_${idx}">${formatMoney(cost * qty)}</span> ج.م
        <button class="remove" onclick="IdealUI.removePart(${idx})">✕</button>`;
      $("#idealPartsList").appendChild(row);
      this.updatePartsCost();
      this.closeNewPartModal();
    },

    updateNewPartQty(idx, qty) {
      this._parts[idx].qty = Math.max(1, Number(qty) || 1);
      this.updatePartsCost();
    },

    addExistingPartById(productId, qty) {
      const db = global.db;
      const idx = this._parts.length;
      this._parts.push({ type: "stock", productId, qty });
      const p = db.products.find((x) => x.id === productId);
      const row = document.createElement("div");
      row.className = "ideal-part-row";
      row.dataset.idx = idx;
      row.innerHTML = `
        <span style="flex:2">${escapeHtml(p.name)}</span>
        <input type="number" class="part-qty" value="${qty}" min="1"
               onchange="IdealUI.updateStockPartQty(${idx},this.value)">
        <span class="part-cost" id="idealPartCost_${idx}">${formatMoney(num(p.cost) * qty)}</span> ج.م
        <button class="remove" onclick="IdealUI.removePart(${idx})">✕</button>`;
      $("#idealPartsList").appendChild(row);
      this.updatePartsCost();
    },

    submitMaintenance() {
      const db = global.db;
      try {
        const partsUsed = [], customParts = [];
        this._parts.forEach((p) => {
          if (!p) return;
          if (p.type === "stock" && p.productId) {
            partsUsed.push({ productId: p.productId, qty: p.qty });
          } else if (p.type === "new") {
            customParts.push({
              name: p.name, qty: p.qty, unitCost: p.unitCost,
              price: p.price, stock: p.stock || p.qty,
              minStock: p.minStock, icon: p.icon,
              category: p.category, addToInventory: p.addToInventory
            });
          }
        });
        const data = {
          customerId: this._customerId, filterId: this._filterId,
          requestId: this._requestId, partsUsed, customParts,
          revenue: num($("#idealMntRevenue").value),
          laborCost: num($("#idealMntLabor").value),
          paidAmount: num($("#idealMntPaid").value),
          tech: $("#idealMntTech").value,
          notes: $("#idealMntNotes").value,
          nextDate: $("#idealMntNextDate").value,
          newType: $("#idealMntNewType").value
        };
        const result = completeMaintenance(db, data, db._currentUser || "user");
        if (typeof global.saveDB === "function") global.saveDB(db);

        let msg = `✅ تم حفظ الصيانة\n💰 المحصل: ${formatMoney(result.maintenance.revenue)}\n`;
        msg += `📦 القطع: ${formatMoney(result.partsCost)}\n👷 العمالة: ${formatMoney(result.maintenance.laborCost)}\n`;
        msg += `📈 الربح: ${formatMoney(result.profit)}`;
        if (result.remaining > 0) msg += `\n⚠️ المتبقي: ${formatMoney(result.remaining)}`;
        if (result.createdProducts.length) msg += `\n✨ أصناف جديدة: ${result.createdProducts.length}`;
        this.toast(msg, "success");
        this.closeMaintenance();
        if (typeof global.renderAll === "function") global.renderAll();
      } catch (e) {
        this.toast("❌ " + e.message, "error");
        console.error(e);
      }
    },

    /* ========= REQUESTS ========= */
    openRequestModal(requestId) {
      const db = global.db;
      this._requestEditId = requestId || null;
      const isEdit = !!requestId;
      $("#idealRequestModalTitle").textContent = isEdit ? "✏️ تعديل طلب" : "📝 طلب صيانة جديد";
      const defaultDate = today();
      $("#idealRqScheduledDate").value = defaultDate;
      if (isEdit) {
        const r = db.requests.find((x) => x.id === requestId);
        if (!r) return;
        $("#idealRqName").value = r.name || "";
        $("#idealRqPhone").value = r.phone || "";
        $("#idealRqProblem").value = r.problem || "";
        $("#idealRqAddress").value = r.address || "";
        $("#idealRqRegion").value = r.region || "";
        $("#idealRqScheduledDate").value = r.scheduledDate || defaultDate;
        $("#idealRqPriority").value = r.priority || "normal";
        $("#idealRqNotes").value = r.notes || "";
      } else {
        ["idealRqName","idealRqPhone","idealRqProblem","idealRqAddress","idealRqRegion","idealRqNotes"]
          .forEach((id) => ($("#" + id).value = ""));
        $("#idealRqPriority").value = "normal";
      }
      this.fillRegionsList();
      $("#idealRequestModal").style.display = "flex";
      $("#idealRqName").focus();
    },

    closeRequestModal() {
      $("#idealRequestModal").style.display = "none";
      $("#idealAddressSuggestions").style.display = "none";
      this._requestEditId = null;
    },

    autoLinkCustomerByPhone(phone) {
      const db = global.db;
      const hint = $("#idealRqLinkHint");
      const c = clean(phone);
      if (!c) { hint.style.display = "none"; return; }
      const found = db.customers.find((x) =>
        (x.phones || []).some((p) => clean(p) === c));
      if (found) {
        hint.textContent = `✓ مربوط بالعميل: ${found.name}`;
        hint.style.display = "block";
        if (!$("#idealRqAddress").value && found.address) $("#idealRqAddress").value = found.address;
        if (!$("#idealRqRegion").value && found.region) $("#idealRqRegion").value = found.region;
      } else hint.style.display = "none";
    },

    onAddressInput(value) {
      clearTimeout(this._addressTimer);
      this._addressTimer = setTimeout(() => {
        const db = global.db;
        const s = suggestAddresses(db, value, 8);
        this.renderAddressSuggestions(s);
      }, 150);
    },

    renderAddressSuggestions(suggestions) {
      const box = $("#idealAddressSuggestions");
      if (!suggestions.length) { box.style.display = "none"; return; }
      box.innerHTML = suggestions.map((s, i) => `
        <div class="ideal-suggestion" onclick="IdealUI.selectAddressSuggestion(${i})">
          <span class="sugg-address">📍 ${escapeHtml(s.address)}</span>
          <span class="sugg-meta">${escapeHtml(s.customerName)}${s.region ? ` — ${escapeHtml(s.region)}` : ""}${s.count > 1 ? ` (${s.count} عميل)` : ""}</span>
        </div>`).join("");
      box.style.display = "block";
      box._suggestions = suggestions;
    },

    selectAddressSuggestion(idx) {
      const box = $("#idealAddressSuggestions");
      const s = box._suggestions[idx];
      if (!s) return;
      $("#idealRqAddress").value = s.address;
      if (s.region && !$("#idealRqRegion").value) $("#idealRqRegion").value = s.region;
      box.style.display = "none";
    },

    fillRegionsList() {
      const db = global.db;
      const regions = new Set();
      (db.customers || []).forEach((c) => { if (c.region) regions.add(c.region); });
      (db.requests || []).forEach((r) => { if (r.region) regions.add(r.region); });
      $("#idealRegionsList").innerHTML = Array.from(regions)
        .map((r) => `<option value="${escapeHtml(r)}">`).join("");
    },

    submitRequest() {
      const db = global.db;
      try {
        const data = {
          name: clean($("#idealRqName").value),
          phone: clean($("#idealRqPhone").value),
          problem: clean($("#idealRqProblem").value),
          address: clean($("#idealRqAddress").value),
          region: clean($("#idealRqRegion").value),
          scheduledDate: $("#idealRqScheduledDate").value,
          priority: $("#idealRqPriority").value,
          notes: clean($("#idealRqNotes").value)
        };
        if (this._requestEditId) updateRequest(db, this._requestEditId, data, db._currentUser);
        else addMaintenanceRequest(db, data, db._currentUser);
        if (typeof global.saveDB === "function") global.saveDB(db);
        this.closeRequestModal();
        if (typeof global.renderRequests === "function") global.renderRequests();
        this.toast("✅ تم حفظ الطلب", "success");
      } catch (e) { this.toast("❌ " + e.message, "error"); }
    },

    quickEditAddress(requestId) {
      const db = global.db;
      const r = db.requests.find((x) => x.id === requestId);
      if (!r) return;
      const newAddr = prompt(`تعديل عنوان "${r.name}":`, r.address || "");
      if (newAddr === null) return;
      try {
        updateRequestAddress(db, requestId, newAddr, db._currentUser);
        if (typeof global.saveDB === "function") global.saveDB(db);
        if (typeof global.renderRequests === "function") global.renderRequests();
        this.toast("✅ تم تحديث العنوان", "success");
      } catch (e) { this.toast("❌ " + e.message, "error"); }
    },

    deleteRequestConfirm(requestId) {
      const db = global.db;
      const r = db.requests.find((x) => x.id === requestId);
      if (!r) return;
      if (!confirm(`حذف طلب "${r.name}"؟`)) return;
      try {
        deleteRequest(db, requestId, db._currentUser);
        if (typeof global.saveDB === "function") global.saveDB(db);
        if (typeof global.renderRequests === "function") global.renderRequests();
        this.toast("🗑️ تم الحذف", "success");
      } catch (e) { this.toast("❌ " + e.message, "error"); }
    },

    whatsappRequest(requestId) {
      const db = global.db;
      const r = db.requests.find((x) => x.id === requestId);
      if (!r) return;
      const cn = (db.settings && db.settings.companyName) || "IDEAL H2O";
      const msg = `السلام عليكم ${r.name} 🌿\nبخصوص: ${r.problem}\n` +
                  (r.address ? `📍 ${r.address}\n` : "") +
                  `📅 الموعد: ${r.scheduledDate}\n\n${cn}`;
      window.open(`https://wa.me/2${r.phone}?text=${encodeURIComponent(msg)}`, "_blank");
    },

    openMap(requestId) {
      const db = global.db;
      const r = db.requests.find((x) => x.id === requestId);
      if (!r) return;
      if (!r.address) return alert("لا يوجد عنوان");
      const q = encodeURIComponent(`${r.address} ${r.region || ""}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
    },

    completeRequest(requestId) {
      const db = global.db;
      const r = db.requests.find((x) => x.id === requestId);
      if (!r) return;
      let customerId = r.customerId;
      if (!customerId) {
        const create = confirm(`الطلب غير مربوط بعميل.\nإنشاء عميل جديد؟\nالاسم: ${r.name}`);
        if (create) {
          const newC = {
            id: uid(), name: r.name, phones: [r.phone],
            region: r.region || "", address: r.address || "",
            status: "active", filters: [], hasInstallments: false,
            addedBy: db._currentUser || "system", createdAt: nowISO()
          };
          db.customers.push(newC);
          customerId = newC.id;
          r.customerId = customerId;
          if (typeof global.saveDB === "function") global.saveDB(db);
        }
      }
      if (customerId) this.openMaintenance(customerId, null, requestId);
      else {
        r.status = "done"; r.completedAt = nowISO();
        if (typeof global.saveDB === "function") global.saveDB(db);
        if (typeof global.renderRequests === "function") global.renderRequests();
      }
    },

    renderRequests(containerId, filter) {
      const db = global.db;
      const container = document.getElementById(containerId || "requestsList");
      if (!container) return;
      const requests = searchRequests(db, filter || {});
      if (!requests.length) {
        container.innerHTML = '<div class="ideal-empty">📭 لا توجد طلبات</div>';
        return;
      }
      const order = { urgent: 0, high: 1, normal: 2, low: 3 };
      requests.sort((a, b) => {
        const pa = order[a.priority || "normal"], pb = order[b.priority || "normal"];
        if (pa !== pb) return pa - pb;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
      container.className = "ideal-requests-grid";
      container.innerHTML = requests.map((r) => `
        <div class="ideal-request-card" data-priority="${escapeHtml(r.priority || "normal")}" data-id="${r.id}">
          <div class="ideal-request-header">
            <span class="ideal-priority-badge"></span>
            <strong class="ideal-req-name">${escapeHtml(r.name)}</strong>
            <span class="ideal-req-date">${formatDate(r.scheduledDate)}</span>
          </div>
          <div class="ideal-request-body">
            <div class="ideal-req-line"><span class="icon">📞</span>
              <a href="tel:${escapeHtml(r.phone)}">${escapeHtml(r.phone)}</a></div>
            <div class="ideal-req-line ideal-req-address-line">
              <span class="icon">📍</span>
              <span class="ideal-req-address">${escapeHtml(r.address || "")}</span>
              <button class="ideal-btn-edit-addr" onclick="IdealUI.quickEditAddress(${r.id})">✏️</button>
            </div>
            <div class="ideal-req-line"><span class="icon">🔧</span>
              <span>${escapeHtml(r.problem)}</span></div>
          </div>
          <div class="ideal-request-actions">
            <button class="ideal-btn-complete" onclick="IdealUI.completeRequest(${r.id})">✅ إتمام</button>
            <button class="ideal-btn-whatsapp" onclick="IdealUI.whatsappRequest(${r.id})">📱 واتساب</button>
            <button class="ideal-btn-map" onclick="IdealUI.openMap(${r.id})">🗺️ خريطة</button>
            <button class="ideal-btn-edit" onclick="IdealUI.openRequestModal(${r.id})">✏️ تعديل</button>
            <button class="ideal-btn-delete" onclick="IdealUI.deleteRequestConfirm(${r.id})">🗑️</button>
          </div>
        </div>`).join("");
    },

    whatsappReminder(customerId) {
      const db = global.db;
      const c = db.customers.find((x) => x.id === customerId);
      if (!c) return;
      const r = getReceivablesReport(db);
      const e = r.customers.find((x) => x.id === customerId);
      if (!e) return;
      const cn = (db.settings && db.settings.companyName) || "IDEAL H2O";
      let msg = `السلام عليكم ${c.name} 🌿\n\nتذكير بمبلغ مستحق:\n💰 الإجمالي: ${formatMoney(e.debt)} ج.م\n`;
      if (e.details.installments) msg += `• أقساط: ${formatMoney(e.details.installments)}\n`;
      if (e.details.maintenance) msg += `• صيانة: ${formatMoney(e.details.maintenance)}\n`;
      if (e.details.sales) msg += `• مبيعات: ${formatMoney(e.details.sales)}\n`;
      msg += `\nشكراً 🌸\n${cn}`;
      const phone = (c.phones && c.phones[0]) || "";
      if (!phone) return alert("لا يوجد رقم");
      window.open(`https://wa.me/2${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    },

    renderLowStockBadge(badgeId) {
      const db = global.db;
      const alerts = getLowStockAlerts(db);
      const el = document.getElementById(badgeId);
      if (!el) return;
      if (!alerts.length) { el.style.display = "none"; return; }
      el.textContent = alerts.length;
      el.className = "ideal-badge";
      el.style.display = "inline-block";
      el.title = alerts.map((a) => `${a.productName}: ${a.stock}/${a.minStock}`).join("\n");
    }
  };

  /* ═══════════════════════════════════════════════════════════
   * §14  Sidebar Buttons Injection
   * ═══════════════════════════════════════════════════════════ */
  function injectSidebarButtons() {
    if (document.getElementById("idealExtrasButtons")) return;
    const sidebar = document.querySelector(
      "nav, aside, .sidebar, #sidebar, .menu, #menu, .navigation, .nav, #nav"
    );
    if (!sidebar) { setTimeout(injectSidebarButtons, 500); return; }

    const wrap = document.createElement("div");
    wrap.id = "idealExtrasButtons";

    const buttons = [
      { id: "idealBtnReceivables", icon: "💰", label: "الأموال المستحقة", fn: "IdealExtras.openReceivables()" },
      { id: "idealBtnProfit", icon: "📈", label: "الأرباح", fn: "IdealExtras.openProfit()" },
      { id: "idealBtnReconcile", icon: "🔍", label: "مطابقة التحصيلات", fn: "IdealExtras.openReconciliation()" },
      { id: "idealBtnStock", icon: "📦", label: "حركات المخزون", fn: "IdealExtras.openStockMovements()" },
      { id: "idealBtnPurchases", icon: "🛒", label: "المشتريات", fn: "IdealExtras.openPurchases()" }
    ];

    wrap.innerHTML = buttons.map((b) => `
      <button id="${b.id}" onclick="${b.fn}">
        <span style="font-size:18px">${b.icon}</span>
        <span style="flex:1">${b.label}</span>
        <span id="${b.id}Badge" class="ideal-badge" style="display:none"></span>
      </button>`).join("");

    sidebar.appendChild(wrap);

    if (global.db) {
      const alerts = getLowStockAlerts(global.db);
      const badge = document.getElementById("idealBtnStockBadge");
      if (badge && alerts.length) {
        badge.textContent = alerts.length;
        badge.style.display = "inline-block";
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
   * §15  Reports UI + Export
   * ═══════════════════════════════════════════════════════════ */
  let _currentReport = null;

  function openReport(title, html) {
    $("#idealReportTitle").textContent = title;
    $("#idealReportContent").innerHTML = html;
    $("#idealReportOverlay").style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function closeReport() {
    $("#idealReportOverlay").style.display = "none";
    document.body.style.overflow = "";
  }

  function openReceivables() {
    const db = global.db;
    const r = getReceivablesReport(db);
    const html = `
      <div class="ideal-stats-grid">
        <div class="ideal-stat-card"><span>الإجمالي</span><strong>${formatMoney(r.totalReceivables)}</strong></div>
        <div class="ideal-stat-card"><span>أقساط</span><strong>${formatMoney(r.installmentsTotal)}</strong></div>
        <div class="ideal-stat-card"><span>صيانة</span><strong>${formatMoney(r.maintenanceDebtTotal)}</strong></div>
        <div class="ideal-stat-card"><span>مبيعات</span><strong>${formatMoney(r.salesDebtTotal)}</strong></div>
      </div>
      ${r.customers.length ? `
        <table class="ideal-table">
          <thead><tr><th>العميل</th><th>المنطقة</th><th>الهاتف</th><th>أقساط</th><th>صيانة</th><th>مبيعات</th><th>الإجمالي</th><th></th></tr></thead>
          <tbody>
            ${r.customers.map((c) => `
              <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.region || "-")}</td>
                <td>${escapeHtml(c.phone || "-")}</td>
                <td>${c.details.installments ? formatMoney(c.details.installments) : "-"}</td>
                <td>${c.details.maintenance ? formatMoney(c.details.maintenance) : "-"}</td>
                <td>${c.details.sales ? formatMoney(c.details.sales) : "-"}</td>
                <td><strong>${formatMoney(c.debt)}</strong></td>
                <td><button class="ideal-btn ideal-btn-green" style="padding:4px 10px;font-size:12px" onclick="IdealUI.whatsappReminder(${c.id})">📱</button></td>
              </tr>`).join("")}
            <tr class="total-row">
              <td colspan="3"><strong>الإجمالي</strong></td>
              <td><strong>${formatMoney(r.installmentsTotal)}</strong></td>
              <td><strong>${formatMoney(r.maintenanceDebtTotal)}</strong></td>
              <td><strong>${formatMoney(r.salesDebtTotal)}</strong></td>
              <td><strong>${formatMoney(r.totalReceivables)}</strong></td><td></td>
            </tr>
          </tbody>
        </table>` : '<div class="ideal-empty">✅ لا توجد مبالغ مستحقة</div>'}`;
    openReport("💰 الأموال المستحقة", html);
    _currentReport = { type: "receivables" };
  }

  function openProfit() {
    const from = prompt("من تاريخ (YYYY-MM-DD):", firstOfMonth());
    if (!from) return;
    const to = prompt("إلى تاريخ (YYYY-MM-DD):", today());
    if (!to) return;
    const db = global.db;
    const r = getProfitReport(db, from, to);
    const html = `
      <p style="color:#666;margin:0 0 15px">الفترة: من ${from} إلى ${to}</p>
      <div class="ideal-stats-grid">
        <div class="ideal-stat-card"><span>إجمالي الإيرادات</span><strong>${formatMoney(r.total.revenue)}</strong></div>
        <div class="ideal-stat-card warn"><span>إجمالي التكاليف</span><strong>${formatMoney(r.total.cost)}</strong></div>
        <div class="ideal-stat-card ok"><span>صافي الربح</span><strong>${formatMoney(r.total.profit)}</strong></div>
      </div>
      <h3>🔧 الصيانة (${r.maintenance.count} عملية)</h3>
      <table class="ideal-table">
        <tr><td>الإيراد</td><td>${formatMoney(r.maintenance.revenue)}</td></tr>
        <tr><td>تكلفة القطع</td><td>${formatMoney(r.maintenance.partsCost)}</td></tr>
        <tr><td>تكلفة العمالة</td><td>${formatMoney(r.maintenance.laborCost)}</td></tr>
        <tr class="total-row"><td><strong>ربح الصيانة</strong></td><td><strong>${formatMoney(r.maintenance.profit)}</strong></td></tr>
      </table>
      <h3>🛒 المبيعات (${r.sales.count} عملية)</h3>
      <table class="ideal-table">
        <tr><td>الإيراد</td><td>${formatMoney(r.sales.revenue)}</td></tr>
        <tr><td>تكلفة البضاعة</td><td>${formatMoney(r.sales.cost)}</td></tr>
        <tr class="total-row"><td><strong>ربح المبيعات</strong></td><td><strong>${formatMoney(r.sales.profit)}</strong></td></tr>
      </table>`;
    openReport("📈 تقرير الأرباح", html);
    _currentReport = { type: "profit" };
  }

  function openReconciliation() {
    const from = prompt("من تاريخ:", firstOfMonth());
    if (!from) return;
    const to = prompt("إلى تاريخ:", today());
    if (!to) return;
    const db = global.db;
    const r = reconcileCollections(db, from, to);
    const row = (l, x) => `<tr><td>${l}</td><td>${formatMoney(x.collected)}</td><td>${formatMoney(x.recorded)}</td><td class="${x.difference === 0 ? "ok" : "warn"}">${formatMoney(x.difference)} ${x.status}</td></tr>`;
    const html = `
      <p style="color:#666;margin:0 0 15px">الفترة: من ${from} إلى ${to}</p>
      <table class="ideal-table">
        <thead><tr><th>النوع</th><th>محصّل</th><th>مسجَّل</th><th>الفرق</th></tr></thead>
        <tbody>${row("أقساط", r.installments)}${row("صيانة", r.maintenance)}${row("مبيعات", r.sales)}
          <tr class="total-row"><td><strong>الإجمالي</strong></td><td>${formatMoney(r.total.collected)}</td><td>${formatMoney(r.total.recorded)}</td><td class="${r.total.difference === 0 ? "ok" : "warn"}">${formatMoney(r.total.difference)}</td></tr>
        </tbody>
      </table>`;
    openReport("🔍 مطابقة التحصيلات", html);
    _currentReport = { type: "reconciliation" };
  }

  function openStockMovements() {
    const db = global.db;
    const movements = (db.stockMovements || []).slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 200);
    const html = `
      <p style="color:#666;margin:0 0 15px">آخر ${movements.length} حركة</p>
      ${movements.length ? `
        <table class="ideal-table">
          <thead><tr><th>التاريخ</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>التكلفة</th><th>السبب</th><th>قبل</th><th>بعد</th></tr></thead>
          <tbody>${movements.map((m) => `
            <tr><td>${formatDate(m.date)}</td>
              <td class="${m.type === "in" ? "ok" : "warn"}">${m.type === "in" ? "⬇️ دخول" : "⬆️ خروج"}</td>
              <td>${escapeHtml(m.productName)}</td><td>${m.qty}</td>
              <td>${formatMoney(m.unitCost)}</td><td>${escapeHtml(m.reason)}</td>
              <td>${m.stockBefore}</td><td>${m.stockAfter}</td></tr>`).join("")}
          </tbody>
        </table>` : '<div class="ideal-empty">لا توجد حركات</div>'}`;
    openReport("📦 حركات المخزون", html);
    _currentReport = { type: "stock" };
  }

  function openPurchases() {
    const db = global.db;
    const purchases = (db.purchases || []).slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const total = purchases.reduce((s, p) => s + num(p.total), 0);
    const paid = purchases.reduce((s, p) => s + num(p.paid), 0);
    const html = `
      <div class="ideal-stats-grid">
        <div class="ideal-stat-card"><span>عدد الفواتير</span><strong>${purchases.length}</strong></div>
        <div class="ideal-stat-card"><span>الإجمالي</span><strong>${formatMoney(total)}</strong></div>
        <div class="ideal-stat-card ok"><span>مدفوع</span><strong>${formatMoney(paid)}</strong></div>
        <div class="ideal-stat-card warn"><span>متبقٍ للموردين</span><strong>${formatMoney(total - paid)}</strong></div>
      </div>
      ${purchases.length ? `
        <table class="ideal-table">
          <thead><tr><th>التاريخ</th><th>رقم</th><th>المورد</th><th>عدد</th><th>الإجمالي</th><th>مدفوع</th><th>متبقٍ</th></tr></thead>
          <tbody>${purchases.map((p) => `
            <tr><td>${formatDate(p.date)}</td><td>${escapeHtml(p.invoiceNumber)}</td>
              <td>${escapeHtml(p.supplierName || "-")}</td><td>${(p.items || []).length}</td>
              <td>${formatMoney(p.total)}</td><td>${formatMoney(p.paid)}</td>
              <td class="${p.remaining > 0 ? "warn" : ""}">${formatMoney(p.remaining)}</td></tr>`).join("")}
          </tbody>
        </table>` : '<div class="ideal-empty">لا توجد مشتريات</div>'}`;
    openReport("🛒 المشتريات", html);
    _currentReport = { type: "purchases" };
  }

  /* ========= Excel Export ========= */
  function exportExcel() {
    const content = $("#idealReportContent");
    if (!content) return alert("لا يوجد تقرير");
    const title = $("#idealReportTitle").textContent || "تقرير";
    const tables = content.querySelectorAll("table");
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>
        table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px;font-family:Arial;font-size:13px;text-align:right;direction:rtl}
        th{background:#1976d2;color:#fff;font-weight:bold}.total-row td{background:#e3f2fd;font-weight:bold}
        .ok{color:#2e7d32}.warn{color:#d32f2f}h2,h3{font-family:Arial;color:#1976d2}
      </style></head>
      <body dir="rtl"><h2>${escapeHtml(title)}</h2><p>تاريخ: ${new Date().toLocaleString("ar-EG")}</p>`;
    if (tables.length) tables.forEach((t) => { html += t.outerHTML; });
    else html += `<pre>${content.textContent}</pre>`;
    html += "</body></html>";
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IdealH2O_${(_currentReport && _currentReport.type) || "report"}_${today()}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast("📊 تم التصدير", "success");
  }

  /* ========= PDF Export (Print) ========= */
  function exportPDF() {
    const content = $("#idealReportContent");
    if (!content) return alert("لا يوجد تقرير");
    const title = $("#idealReportTitle").textContent || "تقرير";
    const cn = (global.db && global.db.settings && global.db.settings.companyName) || "IDEAL H2O";
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return alert("يرجى السماح بالنوافذ المنبثقة");
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
      <style>
        @page{size:A4;margin:15mm}
        body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;padding:15px;color:#222;direction:rtl}
        .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:3px solid #1976d2;margin-bottom:20px}
        .header h1{margin:0;color:#1976d2;font-size:22px}
        .header .company{font-weight:bold;color:#1976d2;font-size:16px}
        .header .meta{font-size:12px;color:#666}
        h2,h3{color:#1976d2;margin-top:20px}
        table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
        th,td{border:1px solid #ccc;padding:8px 10px;text-align:right}
        th{background:#1976d2;color:#fff;font-weight:bold}
        tr:nth-child(even) td{background:#f9f9f9}
        .total-row td{background:#e3f2fd !important;font-weight:bold}
        .ok{color:#2e7d32;font-weight:600}.warn{color:#d32f2f;font-weight:600}
        .ideal-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:15px 0}
        .ideal-stat-card{background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;border:1px solid #e0e0e0}
        .ideal-stat-card span{display:block;font-size:12px;color:#666;margin-bottom:6px}
        .ideal-stat-card strong{font-size:18px;color:#1976d2}
        .ideal-stat-card.warn strong{color:#d32f2f}.ideal-stat-card.ok strong{color:#2e7d32}
        .footer{margin-top:30px;padding-top:15px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#999}
        button,.ideal-btn{display:none !important}
      </style></head><body>
      <div class="header"><div><div class="company">${escapeHtml(cn)}</div><h1>${escapeHtml(title)}</h1></div>
        <div class="meta">📅 ${new Date().toLocaleString("ar-EG")}</div></div>
      ${content.innerHTML}
      <div class="footer">تم إنشاء التقرير تلقائيًا — ${escapeHtml(cn)}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`);
    w.document.close();
  }

  /* ═══════════════════════════════════════════════════════════
   * §16  Init
   * ═══════════════════════════════════════════════════════════ */
  function init() {
    injectCSS();
    injectHTML();
    injectSidebarButtons();

    // إغلاق النوافذ عند النقر خارجها
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".ideal-address-wrap")) {
        const box = $("#idealAddressSuggestions");
        if (box) box.style.display = "none";
      }
      if (e.target.classList.contains("ideal-modal")) {
        if (e.target.id !== "idealReportOverlay") e.target.style.display = "none";
      }
    });

    // ESC لإغلاق
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        $$(".ideal-modal").forEach((m) => {
          if (m.id !== "idealReportOverlay") m.style.display = "none";
        });
        closeReport();
      }
    });

    // إعادة محاولة حقن الأزرار
    let tries = 0;
    const retry = setInterval(() => {
      tries++;
      if (!document.getElementById("idealExtrasButtons")) injectSidebarButtons();
      else clearInterval(retry);
      if (tries > 20) clearInterval(retry);
    }, 500);

    // ترحيل تلقائي عند توفر db
    let dbTries = 0;
    const checkDb = setInterval(() => {
      dbTries++;
      if (global.db) {
        clearInterval(checkDb);
        ensureCollections(global.db);
        if (global.db.version !== "29") {
          try {
            migrateToV29(global.db);
            if (typeof global.saveDB === "function") global.saveDB(global.db);
            console.log("✅ تم الترحيل التلقائي إلى v29");
          } catch (e) { console.error("❌ فشل الترحيل:", e); }
        }
        // تحديث شارة المخزون
        const alerts = getLowStockAlerts(global.db);
        const badge = document.getElementById("idealBtnStockBadge");
        if (badge && alerts.length) {
          badge.textContent = alerts.length;
          badge.style.display = "inline-block";
        }
        if (typeof global.renderAll === "function") {
          try { global.renderAll(); } catch (e) {}
        }
      }
      if (dbTries > 100) clearInterval(checkDb);
    }, 100);

    console.log(`
╔══════════════════════════════════════════════════════════╗
║  🚀 Ideal H2O v29 FINAL — تم التحميل بنجاح               ║
║  ✓ المخزون + الصيانة + المبيعات + الأقساط + المشتريات    ║
║  ✓ طلبات بالعنوان + تقارير + تصدير + أزرار تلقائية       ║
╚══════════════════════════════════════════════════════════╝
    `);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ═══════════════════════════════════════════════════════════
   * §17  Public API
   * ═══════════════════════════════════════════════════════════ */
  global.IdealH2O = {
    // Inventory
    deductStock, addStock, getLowStockAlerts,
    addNewProduct, addMaintenancePartName,
    // Operations
    completeMaintenance, completeSale, payInstallment,
    registerPurchase, addSupplier,
    // Treasury
    withdrawFromSafe, depositToSafe,
    // Requests
    addMaintenanceRequest, updateRequest, updateRequestAddress,
    deleteRequest, suggestAddresses, searchRequests, getRequestsByRegion,
    // Reports
    getReceivablesReport, getCustomerStatement,
    reconcileCollections, getProfitReport,
    // Migration + Helpers
    migrateToV29, addMonths, ensureCollections,
    generateInvoiceNumber, formatMoney, formatDate, escapeHtml
  };

  global.IdealUI = UI;

  global.IdealExtras = {
    injectSidebarButtons,
    openReceivables, openProfit, openReconciliation,
    openStockMovements, openPurchases,
    exportExcel, exportPDF, closeReport
  };

  // Aliases للتوافق
  global.IdealCore = global.IdealH2O;
  global.IdealRequests = {
    addMaintenanceRequest, updateRequest, updateRequestAddress,
    deleteRequest, suggestAddresses, searchRequests, getRequestsByRegion
  };

})(window);