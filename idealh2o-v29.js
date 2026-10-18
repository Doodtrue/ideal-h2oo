/* ============================================================
 * IDEAL H2O — v29 FINAL (Self-Contained) + Address for Requests
 * ============================================================ */
(function (global) {
  "use strict";
  if (global.__IDEAL_H2O_V29__) return;
  global.__IDEAL_H2O_V29__ = true;

  /* ═══════ Helpers ═══════ */
  const uid = () => Date.now() + Math.random();
  const nowISO = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const round2 = (v) => Math.round(num(v) * 100) / 100;
  const clean = (s) => String(s == null ? "" : s).trim();
  const pad = (n) => String(n).padStart(2, "0");
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const formatMoney = (v) => num(v).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
  const formatDate = (d) => {
    if (!d) return "";
    const p = String(d).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  const L = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const S = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  function readDB() {
    return {
      version: "29",
      customers:        L("filterCustomers", []),
      history:          L("filterHistory", []),
      requests:         L("filterRequests", []),
      expenses:         L("filterExpenses", []),
      expCategories:    L("filterExpCategories", []),
      products:         L("filterProducts", []),
      sales:            L("filterSales", []),
      stockMovements:   L("filterStockMovements", []),
      employees:        L("filterEmployees", []),
      attendance:       L("filterAttendance", []),
      catalog:          L("filterCatalog", []),
      invoices:         L("filterInvoices", []),
      auditLog:         L("filterAuditLog", []),
      maintenanceParts: L("filterMaintenanceParts", []),
      settings:         L("filterSettings", {}),
      auth:             L("filterAuth", {}),
      treasury:         L("filterTreasury", {
        safeBalance: 0, drawerHistory: [], safeTransactions: [],
        currentDay: { date: today(), openingBalance: 100, sales: 0, maintenance: 0, installments: 0, expenses: [], totalExpenses: 0 }
      }),
      purchases:        L("idealPurchases", []),
      suppliers:        L("idealSuppliers", []),
      installmentsLedger: L("idealInstLedger", []),
      _currentUser: (() => { try { const u = JSON.parse(sessionStorage.getItem("currentUser") || "null"); return u ? u.username : "system"; } catch (e) { return "system"; } })(),
      _currentRole: (() => { try { const u = JSON.parse(sessionStorage.getItem("currentUser") || "null"); return u ? u.role : "owner"; } catch (e) { return "owner"; } })()
    };
  }

  function writeDB(db) {
    S("filterCustomers",        db.customers);
    S("filterHistory",          db.history);
    S("filterRequests",         db.requests);
    S("filterExpenses",         db.expenses);
    S("filterExpCategories",    db.expCategories);
    S("filterProducts",         db.products);
    S("filterSales",            db.sales);
    S("filterStockMovements",   db.stockMovements);
    S("filterEmployees",        db.employees);
    S("filterAttendance",       db.attendance);
    S("filterCatalog",          db.catalog);
    S("filterInvoices",         db.invoices);
    S("filterAuditLog",         db.auditLog);
    S("filterMaintenanceParts", db.maintenanceParts);
    S("filterSettings",         db.settings);
    S("filterAuth",             db.auth);
    S("filterTreasury",         db.treasury);
    S("idealPurchases",         db.purchases);
    S("idealSuppliers",         db.suppliers);
    S("idealInstLedger",        db.installmentsLedger);
    if (typeof global.save === "function") { try { global.save(); } catch (e) {} }
    try { if (typeof global.customers !== "undefined") global.customers = db.customers; } catch (e) {}
  }

  /* ═══════ Inventory ═══════ */
  function deductStock(db, productId, qty, ref, user) {
    const p = db.products.find((x) => x.id === productId);
    if (!p) throw new Error("الصنف غير موجود");
    qty = num(qty); if (qty <= 0) throw new Error("كمية غير صحيحة");
    const before = num(p.stock);
    p.stock = Math.max(0, before - qty);
    const mv = {
      id: uid(), date: today(), type: "out",
      productId: p.id, productName: p.name,
      qty, unitCost: num(p.cost), totalCost: round2(num(p.cost) * qty),
      reason: ref.type === "maintenance" ? "صيانة" : ref.type === "sale" ? "بيع" : "أخرى",
      refId: ref.id || "", refType: ref.type || "manual",
      customerId: ref.customerId || null, customerName: ref.customerName || "",
      stockBefore: before, stockAfter: p.stock,
      addedBy: user || db._currentUser, notes: ref.notes || "", createdAt: nowISO()
    };
    db.stockMovements.push(mv);
    return mv;
  }

  function addStock(db, productId, qty, unitCost, ref, user) {
    const p = db.products.find((x) => x.id === productId);
    if (!p) throw new Error("الصنف غير موجود");
    qty = num(qty); unitCost = num(unitCost);
    const before = num(p.stock);
    const newStock = before + qty;
    if (unitCost > 0) {
      const oldVal = num(p.cost) * before;
      p.cost = round2((oldVal + unitCost * qty) / newStock);
    }
    p.stock = newStock;
    const mv = {
      id: uid(), date: today(), type: "in",
      productId: p.id, productName: p.name,
      qty, unitCost, totalCost: round2(unitCost * qty),
      reason: ref.type === "purchase" ? "شراء" : "تسوية",
      refId: ref.id || "", refType: ref.type || "manual",
      stockBefore: before, stockAfter: p.stock,
      addedBy: user || db._currentUser, notes: ref.notes || "", createdAt: nowISO()
    };
    db.stockMovements.push(mv);
    return mv;
  }

  function generateInvoiceNumber(type) {
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const prefix = type === "maintenance" ? "MNT" : type === "sale" ? "INV" : type === "installment" ? "INST" : "PUR";
    return `${prefix}-${stamp}-${rand}`;
  }

  /* ═══════ Maintenance ═══════ */
  function completeMaintenance(data, user) {
    const db = readDB();
    const customer = db.customers.find((c) => c.id === data.customerId);
    if (!customer) throw new Error("العميل غير موجود");
    const filter = (customer.filters || []).find((f) => f.id === data.filterId);
    if (!filter) throw new Error("الفلتر غير موجود");

    const invNum = generateInvoiceNumber("maintenance");
    const partsUsed = [];
    const createdProducts = [];
    let partsCost = 0;

    for (const cp of (data.customParts || [])) {
      const qty = num(cp.qty);
      if (!clean(cp.name) || qty <= 0) continue;
      if (cp.addToInventory) {
        let prod = db.products.find((p) => clean(p.name).toLowerCase() === clean(cp.name).toLowerCase());
        if (!prod) {
          prod = {
            id: uid(), name: clean(cp.name), cost: round2(num(cp.unitCost)),
            price: round2(num(cp.price)), stock: num(cp.stock || qty),
            unit: "قطعة", category: cp.category || "قطع غيار",
            minStock: num(cp.minStock), addedBy: user || db._currentUser,
            createdAt: nowISO(), isCustom: true
          };
          db.products.push(prod);
          createdProducts.push(prod);
        }
        data.partsUsed = data.partsUsed || [];
        data.partsUsed.push({ productId: prod.id, qty });
      } else {
        partsUsed.push({
          productId: null, name: clean(cp.name), qty,
          unitCost: round2(num(cp.unitCost)), totalCost: round2(num(cp.unitCost) * qty),
          isCustomOnce: true
        });
        partsCost += round2(num(cp.unitCost) * qty);
      }
    }

    for (const part of (data.partsUsed || [])) {
      if (!part.productId || num(part.qty) <= 0) continue;
      const mv = deductStock(db, part.productId, part.qty, {
        type: "maintenance", id: invNum,
        customerId: customer.id, customerName: customer.name
      }, user);
      partsUsed.push({
        productId: mv.productId, name: mv.productName,
        qty: mv.qty, unitCost: mv.unitCost, totalCost: mv.totalCost
      });
      partsCost += mv.totalCost;
    }
    partsCost = round2(partsCost);

    const revenue = round2(num(data.revenue));
    const laborCost = round2(num(data.laborCost));
    const profit = round2(revenue - partsCost - laborCost);
    const paidAmount = data.paidAmount == null ? revenue : round2(num(data.paidAmount));
    const remaining = round2(revenue - paidAmount);

    const maintenance = {
      id: uid(), date: today(),
      customerId: customer.id, customerName: customer.name,
      filterId: filter.id, filterType: filter.type,
      parts: partsUsed.map((p) => `${p.name} (${p.qty})`).join(" + "),
      partsUsed, revenue, partsCost, laborCost, profit,
      cost: revenue, paidAmount,
      newType: data.newType || filter.trackingType,
      nextDate: data.nextDate, previousDate: filter.nextMaintenance, previousType: filter.trackingType,
      tech: data.tech || "", notes: data.notes || "",
      invoiceNumber: invNum,
      createdProducts: createdProducts.map((p) => ({ id: p.id, name: p.name })),
      addedBy: user || db._currentUser, createdAt: nowISO()
    };
    db.history.push(maintenance);

    filter.lastMaintenance = maintenance.date;
    filter.nextMaintenance = data.nextDate || filter.nextMaintenance;
    filter.trackingType = maintenance.newType;
    filter.price = revenue;

    db.invoices.push({
      id: uid(), number: invNum, date: maintenance.date,
      customerId: customer.id, customerName: customer.name,
      items: [
        ...partsUsed.map((p) => ({ productName: p.name, qty: p.qty, price: p.unitCost, total: p.totalCost })),
        ...(laborCost > 0 ? [{ productName: "عمالة", qty: 1, price: laborCost, total: laborCost }] : [])
      ],
      total: revenue, paid: paidAmount, remaining,
      type: "maintenance", createdAt: nowISO()
    });

    if (paidAmount > 0) {
      if (!db.treasury.currentDay) db.treasury.currentDay = { date: today(), openingBalance: 100, sales: 0, maintenance: 0, installments: 0, expenses: [], totalExpenses: 0 };
      db.treasury.currentDay.maintenance = round2(num(db.treasury.currentDay.maintenance) + paidAmount);
    }

    if (remaining > 0) {
      customer.debts = customer.debts || [];
      customer.debts.push({
        id: uid(), date: maintenance.date, amount: remaining,
        type: "maintenance", invoiceNumber: invNum, paid: false
      });
    }

    if (data.requestId) {
      const req = db.requests.find((r) => r.id === data.requestId);
      if (req) { req.status = "done"; req.completedAt = nowISO(); }
    }

    db.auditLog = db.auditLog || [];
    db.auditLog.unshift({
      id: uid(), time: nowISO(), user: user || db._currentUser, role: db._currentRole,
      action: "صيانة v29",
      details: `${customer.name} — محصل ${revenue} | قطع ${partsCost} | عمالة ${laborCost} | ربح ${profit}`
    });

    writeDB(db);
    return { maintenance, partsCost, profit, remaining, createdProducts };
  }

  /* ═══════ Sales ═══════ */
  function completeSale(data, user) {
    const db = readDB();
    const invNum = generateInvoiceNumber("sale");
    const items = [];
    let totalCost = 0, revenue = 0;

    for (const item of (data.items || [])) {
      const p = db.products.find((x) => x.id === item.productId);
      if (!p) continue;
      const qty = num(item.qty), price = num(item.price);
      const mv = deductStock(db, p.id, qty, {
        type: "sale", id: invNum,
        customerId: data.customerId || null,
        customerName: data.customerName || "عميل نقدي"
      }, user);
      const total = round2(price * qty);
      revenue += total; totalCost += mv.totalCost;
      items.push({
        productId: p.id, productName: p.name, qty, price,
        cost: mv.unitCost, total,
        profit: round2((price - mv.unitCost) * qty)
      });
    }

    revenue = round2(revenue); totalCost = round2(totalCost);
    const profit = round2(revenue - totalCost);
    const paid = data.paid == null ? revenue : round2(num(data.paid));
    const remaining = round2(revenue - paid);

    const sale = {
      id: uid(), date: today(), type: data.type || "shop",
      customerId: data.customerId || null,
      customerName: data.customerName || "عميل نقدي",
      items, revenue, totalCost, profit,
      total: revenue, paid, remaining,
      paymentMethod: data.paymentMethod || "نقدي",
      notes: data.notes || "", invoiceNumber: invNum,
      addedBy: user || db._currentUser, createdAt: nowISO()
    };
    db.sales.push(sale);

    db.invoices.push({
      id: uid(), number: invNum, date: sale.date,
      customerId: sale.customerId, customerName: sale.customerName,
      items: items.map((i) => ({ productName: i.productName, qty: i.qty, price: i.price, total: i.total })),
      total: revenue, paid, remaining, type: "sale", createdAt: nowISO()
    });

    if (paid > 0) {
      if (!db.treasury.currentDay) db.treasury.currentDay = { date: today(), openingBalance: 100, sales: 0, maintenance: 0, installments: 0, expenses: [], totalExpenses: 0 };
      db.treasury.currentDay.sales = round2(num(db.treasury.currentDay.sales) + paid);
    }

    if (remaining > 0 && sale.customerId) {
      const c = db.customers.find((x) => x.id === sale.customerId);
      if (c) {
        c.debts = c.debts || [];
        c.debts.push({ id: uid(), date: sale.date, amount: remaining, type: "sale", invoiceNumber: invNum, paid: false });
      }
    }

    db.auditLog = db.auditLog || [];
    db.auditLog.unshift({
      id: uid(), time: nowISO(), user: user || db._currentUser, role: db._currentRole,
      action: "بيعة v29", details: `${invNum} — ${revenue} | ربح ${profit}`
    });

    writeDB(db);
    return sale;
  }

  /* ═══════ Installments ═══════ */
  function payInstallment(customerId, installmentNum, user, options) {
    options = options || {};
    const db = readDB();
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) throw new Error("العميل غير موجود");
    if (!c.hasInstallments) throw new Error("لا يوجد أقساط");

    const exists = db.installmentsLedger.find((l) => l.customerId === customerId && l.installmentNum === installmentNum);
    if (exists) throw new Error(`القسط رقم ${installmentNum} مدفوع مسبقًا`);

    const amount = round2(options.amount || c.installmentAmount || 0);
    if (amount <= 0) throw new Error("قيمة القسط غير صحيحة");
    const invNum = generateInvoiceNumber("installment");
    const date = options.date || today();

    c.paidInstallments = c.paidInstallments || [];
    c.paidInstallments.push({ num: installmentNum, date, amount, invoiceNumber: invNum, addedBy: user || db._currentUser });

    db.installmentsLedger.push({
      id: uid(), date, customerId, customerName: c.name,
      installmentNum, amount, method: options.method || "نقدي",
      invoiceNumber: invNum, recordedInTreasury: true,
      addedBy: user || db._currentUser, createdAt: nowISO()
    });

    if (!db.treasury.currentDay) db.treasury.currentDay = { date: today(), openingBalance: 100, sales: 0, maintenance: 0, installments: 0, expenses: [], totalExpenses: 0 };
    db.treasury.currentDay.installments = round2(num(db.treasury.currentDay.installments) + amount);

    const totalPaid = (c.paidInstallments || []).reduce((s, p) => s + num(p.amount || c.installmentAmount), 0);
    const totalDue = num(c.totalAmount) - num(c.downPayment);
    c.remainingDebt = Math.max(0, round2(totalDue - totalPaid));

    db.invoices.push({
      id: uid(), number: invNum, date,
      customerId, customerName: c.name,
      items: [{ productName: `قسط رقم ${installmentNum}`, qty: 1, price: amount, total: amount }],
      total: amount, paid: amount, remaining: 0, type: "installment", createdAt: nowISO()
    });

    db.auditLog = db.auditLog || [];
    db.auditLog.unshift({
      id: uid(), time: nowISO(), user: user || db._currentUser, role: db._currentRole,
      action: "دفع قسط", details: `${c.name} — القسط ${installmentNum} — ${amount} — المتبقي ${c.remainingDebt}`
    });

    writeDB(db);
    return { customer: c, amount, remainingDebt: c.remainingDebt, invoiceNumber: invNum };
  }

  /* ═══════ Purchases ═══════ */
  function registerPurchase(data, user) {
    const db = readDB();
    const invNum = generateInvoiceNumber("purchase");
    const items = [];
    let total = 0;
    for (const it of (data.items || [])) {
      const mv = addStock(db, it.productId, it.qty, it.unitCost, {
        type: "purchase", id: invNum, notes: data.supplierName || ""
      }, user);
      items.push({ productId: mv.productId, productName: mv.productName, qty: mv.qty, unitCost: mv.unitCost, total: mv.totalCost });
      total += mv.totalCost;
    }
    const purchase = {
      id: uid(), date: data.date || today(),
      supplierId: data.supplierId || null, supplierName: data.supplierName || "",
      items, total: round2(total), paid: round2(num(data.paid)),
      remaining: round2(num(total) - num(data.paid)),
      invoiceNumber: invNum, notes: data.notes || "",
      addedBy: user || db._currentUser, createdAt: nowISO()
    };
    db.purchases.push(purchase);
    db.auditLog = db.auditLog || [];
    db.auditLog.unshift({ id: uid(), time: nowISO(), user: user || db._currentUser, role: db._currentRole, action: "مشتريات", details: `${invNum} — ${purchase.total} ج.م` });
    writeDB(db);
    return purchase;
  }

  /* ═══════ Reports ═══════ */
  function getReceivables() {
    const db = readDB();
    const r = { total: 0, inst: 0, mnt: 0, sal: 0, list: [] };
    for (const c of db.customers) {
      if (c.status !== "active") continue;
      const d = { inst: 0, mnt: 0, sal: 0 };
      if (c.hasInstallments && num(c.totalAmount) > 0) {
        const paid = (c.paidInstallments || []).reduce((s, p) => s + num(p.amount || c.installmentAmount), 0);
        d.inst = Math.max(0, round2(num(c.totalAmount) - num(c.downPayment) - paid));
      }
      if (Array.isArray(c.debts)) {
        for (const x of c.debts) {
          if (x.paid) continue;
          if (x.type === "maintenance") d.mnt += num(x.amount);
          else if (x.type === "sale") d.sal += num(x.amount);
        }
      }
      const debt = round2(d.inst + d.mnt + d.sal);
      if (debt > 0) {
        r.list.push({ id: c.id, name: c.name, phone: (c.phones && c.phones[0]) || "", region: c.region || "", debt, d });
        r.total += debt; r.inst += d.inst; r.mnt += d.mnt; r.sal += d.sal;
      }
    }
    r.total = round2(r.total); r.inst = round2(r.inst); r.mnt = round2(r.mnt); r.sal = round2(r.sal);
    r.list.sort((a, b) => b.debt - a.debt);
    return r;
  }

  function getProfit(from, to) {
    const db = readDB();
    const inR = (d) => d >= from && d <= to;
    const mnt = (db.history || []).filter((h) => inR(h.date));
    const sales = (db.sales || []).filter((s) => inR(s.date));
    return {
      mnt: {
        revenue: round2(mnt.reduce((s, h) => s + num(h.revenue || h.cost), 0)),
        parts: round2(mnt.reduce((s, h) => s + num(h.partsCost), 0)),
        labor: round2(mnt.reduce((s, h) => s + num(h.laborCost), 0)),
        profit: round2(mnt.reduce((s, h) => s + num(h.profit), 0)),
        count: mnt.length
      },
      sales: {
        revenue: round2(sales.reduce((s, x) => s + num(x.revenue || x.total), 0)),
        cost: round2(sales.reduce((s, x) => s + num(x.totalCost), 0)),
        profit: round2(sales.reduce((s, x) => s + num(x.profit), 0)),
        count: sales.length
      }
    };
  }

  function reconcile(from, to) {
    const db = readDB();
    const inR = (d) => d >= from && d <= to;
    const instColl = db.installmentsLedger.filter((l) => inR(l.date)).reduce((s, l) => s + num(l.amount), 0);
    const mntColl = (db.history || []).filter((h) => inR(h.date)).reduce((s, h) => s + num(h.paidAmount || h.revenue), 0);
    const salColl = (db.sales || []).filter((s) => inR(s.date)).reduce((s, x) => s + num(x.paid), 0);
    let recInst = 0, recMnt = 0, recSal = 0;
    const cd = db.treasury.currentDay;
    if (cd && inR(cd.date)) { recInst += num(cd.installments); recMnt += num(cd.maintenance); recSal += num(cd.sales); }
    (db.treasury.drawerHistory || []).forEach((d) => {
      if (!inR(d.date)) return;
      recInst += num(d.installments); recMnt += num(d.maintenance); recSal += num(d.sales);
    });
    const pkg = (c, r) => ({ collected: round2(c), recorded: round2(r), diff: round2(c - r), ok: Math.abs(c - r) < 1 });
    return {
      inst: pkg(instColl, recInst),
      mnt: pkg(mntColl, recMnt),
      sal: pkg(salColl, recSal),
      total: pkg(instColl + mntColl + salColl, recInst + recMnt + recSal)
    };
  }

  /* ═══════ Migration ═══════ */
  function migrate() {
    const db = readDB();
    let changes = 0;
    for (const h of db.history) {
      if (h.revenue === undefined) { h.revenue = num(h.cost || h.paidAmount); h.partsCost = num(h.partsCost); h.laborCost = num(h.laborCost); h.profit = round2(h.revenue - h.partsCost - h.laborCost); changes++; }
    }
    for (const s of db.sales) {
      if (s.revenue === undefined) { s.revenue = num(s.total); s.totalCost = num(s.totalCost); s.profit = round2(s.revenue - s.totalCost); changes++; }
    }
    for (const c of db.customers) {
      if (c.hasInstallments && Array.isArray(c.paidInstallments)) {
        for (const p of c.paidInstallments) {
          if (!p.amount) p.amount = num(c.installmentAmount);
          const ex = db.installmentsLedger.find((l) => l.customerId === c.id && l.installmentNum === p.num);
          if (!ex) {
            db.installmentsLedger.push({
              id: uid(), date: p.date, customerId: c.id, customerName: c.name,
              installmentNum: p.num, amount: num(p.amount), method: "نقدي",
              invoiceNumber: p.invoiceNumber || `MIG-${c.id}-${p.num}`,
              recordedInTreasury: false, addedBy: "migration", createdAt: nowISO(), _migrated: true
            });
            changes++;
          }
        }
      }
    }
    for (const p of db.products) {
      const ex = db.stockMovements.find((m) => m.productId === p.id && m.reason === "رصيد افتتاحي");
      if (!ex && num(p.stock) > 0) {
        db.stockMovements.push({
          id: uid(), date: today(), type: "in",
          productId: p.id, productName: p.name,
          qty: num(p.stock), unitCost: num(p.cost), totalCost: round2(num(p.cost) * num(p.stock)),
          reason: "رصيد افتتاحي", refType: "manual",
          stockBefore: 0, stockAfter: num(p.stock),
          addedBy: "migration", createdAt: nowISO()
        });
        changes++;
      }
    }
    writeDB(db);
    console.log(`✅ الترحيل: ${changes} تعديل`);
    return changes;
  }

  /* ═══════ CSS ═══════ */
  const CSS = `
.ideal-v29-overlay{position:fixed;inset:0;background:rgba(15,23,42,.65);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:99999;padding:15px;overflow-y:auto}
.ideal-v29-overlay.on{display:flex}
.ideal-v29-modal{background:#fff;border-radius:14px;padding:22px;max-width:1100px;width:100%;max-height:92vh;overflow-y:auto;direction:rtl;font-family:'Segoe UI',Tahoma,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:idealV29SlideUp .3s ease}
@keyframes idealV29SlideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
.ideal-v29-modal h2{margin:0 0 15px;color:#1976d2;font-size:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.ideal-v29-actions{display:flex;gap:8px;flex-wrap:wrap}
.ideal-v29-btn{padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;font-size:13px;transition:.15s;display:inline-flex;align-items:center;gap:6px}
.ideal-v29-btn:hover{transform:translateY(-1px);filter:brightness(.95)}
.ideal-v29-btn.blue{background:#1976d2;color:#fff}
.ideal-v29-btn.green{background:#16a34a;color:#fff}
.ideal-v29-btn.orange{background:#ea580c;color:#fff}
.ideal-v29-btn.gray{background:#e5e7eb;color:#333}
.ideal-v29-btn.red{background:#dc2626;color:#fff}
.ideal-v29-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:15px 0}
.ideal-v29-card{background:#f8fafc;border-radius:10px;padding:14px;text-align:center;border:1px solid #e2e8f0}
.ideal-v29-card span{display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600}
.ideal-v29-card strong{font-size:20px;color:#1976d2;display:block}
.ideal-v29-card.warn strong{color:#dc2626}
.ideal-v29-card.ok strong{color:#16a34a}
.ideal-v29-card.purple strong{color:#9333ea}
.ideal-v29-table{width:100%;border-collapse:collapse;margin-top:15px;direction:rtl;background:#fff}
.ideal-v29-table th,.ideal-v29-table td{padding:10px 8px;text-align:right;border-bottom:1px solid #eef2f7;font-size:13px}
.ideal-v29-table th{background:#f1f5f9;font-weight:800;color:#334155;font-size:12px}
.ideal-v29-table tr:hover{background:#f8fafc}
.ideal-v29-table .ok{color:#16a34a;font-weight:700}
.ideal-v29-table .warn{color:#dc2626;font-weight:700}
.ideal-v29-table .tot{background:#e0f2fe;font-weight:800}
.ideal-v29-empty{text-align:center;padding:30px;color:#94a3b8;font-size:14px}
.ideal-v29-toast{position:fixed;bottom:20px;left:20px;background:#16a34a;color:#fff;padding:12px 20px;border-radius:10px;font-weight:700;z-index:100000;box-shadow:0 6px 20px rgba(0,0,0,.3);font-family:inherit;animation:idealV29Fade .3s}
.ideal-v29-toast.err{background:#dc2626}
@keyframes idealV29Fade{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}

/* Floating FAB */
#idealV29Fab{position:fixed;bottom:80px;right:20px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#1976d2,#1565c0);color:#fff;border:none;cursor:pointer;font-size:26px;box-shadow:0 8px 24px rgba(25,118,210,.45);z-index:99000;display:flex;align-items:center;justify-content:center;transition:.25s;font-family:inherit}
#idealV29Fab:hover{transform:scale(1.08) rotate(8deg);box-shadow:0 12px 32px rgba(25,118,210,.6)}
#idealV29Fab .idealV29FabBadge{position:absolute;top:-3px;left:-3px;background:#dc2626;color:#fff;font-size:10px;font-weight:800;padding:3px 7px;border-radius:12px;border:2px solid #fff}

/* Slide Panel */
#idealV29Backdrop{position:fixed;inset:0;background:rgba(15,23,42,.4);backdrop-filter:blur(2px);z-index:98999;opacity:0;visibility:hidden;transition:.25s}
#idealV29Backdrop.on{opacity:1;visibility:visible}
#idealV29Panel{position:fixed;top:0;bottom:0;right:0;width:290px;max-width:85vw;background:linear-gradient(180deg,#1e293b,#0f172a);color:#f1f5f9;z-index:99000;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:-10px 0 40px rgba(0,0,0,.4);display:flex;flex-direction:column;font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl}
#idealV29Panel.on{transform:translateX(0)}
#idealV29Panel .idealV29PanelHeader{padding:22px 20px 16px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:center}
#idealV29Panel .idealV29PanelHeader h3{margin:0;font-size:17px;font-weight:800;color:#fff;display:flex;align-items:center;gap:10px}
#idealV29Panel .idealV29PanelHeader button{background:rgba(255,255,255,.08);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:.15s}
#idealV29Panel .idealV29PanelHeader button:hover{background:rgba(255,255,255,.2)}
#idealV29Panel .idealV29PanelBody{flex:1;overflow-y:auto;padding:12px}
#idealV29Panel .idealV29PanelBody::-webkit-scrollbar{width:6px}
#idealV29Panel .idealV29PanelBody::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:10px}
#idealV29Panel .idealV29Item{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.04);color:#f1f5f9;border:none;cursor:pointer;font:inherit;font-size:14px;font-weight:600;text-align:right;width:100%;margin-bottom:8px;transition:.15s;font-family:inherit}
#idealV29Panel .idealV29Item:hover{background:rgba(255,255,255,.12);transform:translateX(-4px)}
#idealV29Panel .idealV29Item .icon{font-size:22px;width:32px;text-align:center;background:rgba(255,255,255,.08);border-radius:9px;padding:6px;line-height:1}
#idealV29Panel .idealV29Item .label{flex:1}
#idealV29Panel .idealV29Item .arrow{color:#64748b;font-size:16px}
#idealV29Panel .idealV29Item.blue .icon{background:rgba(25,118,210,.25);color:#60a5fa}
#idealV29Panel .idealV29Item.green .icon{background:rgba(22,163,74,.25);color:#4ade80}
#idealV29Panel .idealV29Item.orange .icon{background:rgba(234,88,12,.25);color:#fb923c}
#idealV29Panel .idealV29Item.purple .icon{background:rgba(147,51,234,.25);color:#c084fc}
#idealV29Panel .idealV29Item.teal .icon{background:rgba(13,148,136,.25);color:#5eead4}
#idealV29Panel .idealV29PanelFooter{padding:14px 20px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;color:#64748b;text-align:center}

/* Address field enhancements */
#idealRqAddressWrap{position:relative;grid-column:1/-1}
#idealRqAddressWrap .sugg-box{position:absolute;top:100%;right:0;left:0;background:#fff;border:1.5px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;max-height:220px;overflow-y:auto;z-index:10;box-shadow:0 8px 20px rgba(0,0,0,.12);display:none}
#idealRqAddressWrap .sugg-box.on{display:block}
#idealRqAddressWrap .sugg-item{padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;transition:.15s}
#idealRqAddressWrap .sugg-item:hover{background:#eff6ff;color:#1976d2}
#idealRqAddressWrap .sugg-item .sugg-meta{display:block;color:#64748b;font-size:11.5px;margin-top:3px}
#idealRqAddressWrap .sugg-item:last-child{border-bottom:none}
.req-address-badge{display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#166534;padding:5px 10px;border-radius:8px;font-size:12.5px;margin-top:6px;font-weight:600;border:1px solid #bbf7d0}
.req-address-badge:empty{display:none}

@media (max-width:600px){
  #idealV29Fab{bottom:70px;right:14px;width:52px;height:52px;font-size:22px}
  #idealV29Panel{width:270px}
  .ideal-v29-modal{padding:16px}
  .ideal-v29-modal h2{font-size:17px}
}
`;

  function injectCSS() {
    if ($("#idealV29Styles")) return;
    const st = document.createElement("style");
    st.id = "idealV29Styles";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ═══════ Modal & Reports ═══════ */
  function injectModal() {
    if ($("#idealV29Overlay")) return;
    const o = document.createElement("div");
    o.id = "idealV29Overlay";
    o.className = "ideal-v29-overlay";
    o.innerHTML = `<div class="ideal-v29-modal"><div id="idealV29Content"></div></div>`;
    o.addEventListener("click", (e) => { if (e.target.id === "idealV29Overlay") closeReport(); });
    document.body.appendChild(o);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeReport(); });
  }

  function toast(msg, isErr) {
    const el = document.createElement("div");
    el.className = "ideal-v29-toast" + (isErr ? " err" : "");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function openReport(title, html) {
    injectModal();
    $("#idealV29Content").innerHTML = `
      <h2>
        <span>${escapeHtml(title)}</span>
        <div class="ideal-v29-actions">
          <button class="ideal-v29-btn green" onclick="IdealV29.exportExcel()">📊 Excel</button>
          <button class="ideal-v29-btn orange" onclick="IdealV29.exportPDF()">🖨️ PDF</button>
          <button class="ideal-v29-btn gray" onclick="IdealV29.closeReport()">✖ إغلاق</button>
        </div>
      </h2>
      <div id="idealV29ReportBody">${html}</div>
    `;
    $("#idealV29Overlay").classList.add("on");
    document.body.style.overflow = "hidden";
  }

  function closeReport() {
    const o = $("#idealV29Overlay");
    if (o) o.classList.remove("on");
    document.body.style.overflow = "";
  }

  /* ═══════ Reports UI ═══════ */
  function showReceivables() {
    const r = getReceivables();
    const html = `
      <div class="ideal-v29-stats">
        <div class="ideal-v29-card purple"><span>الإجمالي</span><strong>${formatMoney(r.total)}</strong></div>
        <div class="ideal-v29-card purple"><span>أقساط</span><strong>${formatMoney(r.inst)}</strong></div>
        <div class="ideal-v29-card warn"><span>صيانة</span><strong>${formatMoney(r.mnt)}</strong></div>
        <div class="ideal-v29-card warn"><span>مبيعات</span><strong>${formatMoney(r.sal)}</strong></div>
      </div>
      ${r.list.length ? `
        <table class="ideal-v29-table">
          <thead><tr><th>العميل</th><th>المنطقة</th><th>الهاتف</th><th>أقساط</th><th>صيانة</th><th>مبيعات</th><th>الإجمالي</th></tr></thead>
          <tbody>${r.list.map((c) => `
            <tr>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td>${escapeHtml(c.region || "-")}</td>
              <td>${escapeHtml(c.phone || "-")}</td>
              <td>${c.d.inst ? formatMoney(c.d.inst) : "-"}</td>
              <td>${c.d.mnt ? formatMoney(c.d.mnt) : "-"}</td>
              <td>${c.d.sal ? formatMoney(c.d.sal) : "-"}</td>
              <td><strong>${formatMoney(c.debt)}</strong></td>
            </tr>`).join("")}
            <tr class="tot"><td colspan="3">الإجمالي</td><td>${formatMoney(r.inst)}</td><td>${formatMoney(r.mnt)}</td><td>${formatMoney(r.sal)}</td><td>${formatMoney(r.total)}</td></tr>
          </tbody>
        </table>` : '<div class="ideal-v29-empty">✅ لا توجد مبالغ مستحقة</div>'}
    `;
    openReport("💰 الأموال المستحقة (لينا برّا)", html);
  }

  function showProfit() {
    const from = prompt("من تاريخ (YYYY-MM-DD):", firstOfMonth()) || firstOfMonth();
    const to = prompt("إلى تاريخ (YYYY-MM-DD):", today()) || today();
    const r = getProfit(from, to);
    const totalRev = r.mnt.revenue + r.sales.revenue;
    const totalCost = r.mnt.parts + r.mnt.labor + r.sales.cost;
    const totalProfit = r.mnt.profit + r.sales.profit;
    const html = `
      <p style="color:#64748b;margin:0 0 15px">الفترة: من ${from} إلى ${to}</p>
      <div class="ideal-v29-stats">
        <div class="ideal-v29-card"><span>إجمالي الإيرادات</span><strong>${formatMoney(totalRev)}</strong></div>
        <div class="ideal-v29-card warn"><span>إجمالي التكاليف</span><strong>${formatMoney(totalCost)}</strong></div>
        <div class="ideal-v29-card ok"><span>صافي الربح</span><strong>${formatMoney(totalProfit)}</strong></div>
      </div>
      <h3 style="color:#1976d2;margin-top:20px">🔧 الصيانة (${r.mnt.count} عملية)</h3>
      <table class="ideal-v29-table">
        <tr><td>الإيراد</td><td>${formatMoney(r.mnt.revenue)}</td></tr>
        <tr><td>تكلفة القطع</td><td>${formatMoney(r.mnt.parts)}</td></tr>
        <tr><td>تكلفة العمالة</td><td>${formatMoney(r.mnt.labor)}</td></tr>
        <tr class="tot"><td>ربح الصيانة</td><td>${formatMoney(r.mnt.profit)}</td></tr>
      </table>
      <h3 style="color:#1976d2;margin-top:20px">🛒 المبيعات (${r.sales.count} عملية)</h3>
      <table class="ideal-v29-table">
        <tr><td>الإيراد</td><td>${formatMoney(r.sales.revenue)}</td></tr>
        <tr><td>تكلفة البضاعة</td><td>${formatMoney(r.sales.cost)}</td></tr>
        <tr class="tot"><td>ربح المبيعات</td><td>${formatMoney(r.sales.profit)}</td></tr>
      </table>
    `;
    openReport("📈 تقرير الأرباح", html);
  }

  function showReconciliation() {
    const from = prompt("من تاريخ:", firstOfMonth()) || firstOfMonth();
    const to = prompt("إلى تاريخ:", today()) || today();
    const r = reconcile(from, to);
    const row = (l, x) => `<tr><td>${l}</td><td>${formatMoney(x.collected)}</td><td>${formatMoney(x.recorded)}</td><td class="${x.ok ? "ok" : "warn"}">${formatMoney(x.diff)} ${x.ok ? "✅" : "⚠️"}</td></tr>`;
    const html = `
      <p style="color:#64748b;margin:0 0 15px">الفترة: من ${from} إلى ${to}</p>
      <table class="ideal-v29-table">
        <thead><tr><th>النوع</th><th>محصّل</th><th>مسجَّل</th><th>الفرق</th></tr></thead>
        <tbody>
          ${row("أقساط", r.inst)}
          ${row("صيانة", r.mnt)}
          ${row("مبيعات", r.sal)}
          <tr class="tot"><td>الإجمالي</td><td>${formatMoney(r.total.collected)}</td><td>${formatMoney(r.total.recorded)}</td><td class="${r.total.ok ? "ok" : "warn"}">${formatMoney(r.total.diff)}</td></tr>
        </tbody>
      </table>
    `;
    openReport("🔍 مطابقة التحصيلات", html);
  }

  function showStockMovements() {
    const db = readDB();
    const list = (db.stockMovements || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 200);
    const html = `
      <p style="color:#64748b;margin:0 0 15px">آخر ${list.length} حركة</p>
      ${list.length ? `
        <table class="ideal-v29-table">
          <thead><tr><th>التاريخ</th><th>النوع</th><th>الصنف</th><th>الكمية</th><th>التكلفة</th><th>السبب</th><th>قبل</th><th>بعد</th></tr></thead>
          <tbody>${list.map((m) => `
            <tr>
              <td>${formatDate(m.date)}</td>
              <td class="${m.type === "in" ? "ok" : "warn"}">${m.type === "in" ? "⬇️ دخول" : "⬆️ خروج"}</td>
              <td>${escapeHtml(m.productName)}</td>
              <td>${m.qty}</td>
              <td>${formatMoney(m.unitCost)}</td>
              <td>${escapeHtml(m.reason)}</td>
              <td>${m.stockBefore}</td>
              <td>${m.stockAfter}</td>
            </tr>`).join("")}
          </tbody>
        </table>` : '<div class="ideal-v29-empty">لا توجد حركات</div>'}
    `;
    openReport("📦 حركات المخزون", html);
  }

  function showPurchases() {
    const db = readDB();
    const list = (db.purchases || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const total = list.reduce((s, p) => s + num(p.total), 0);
    const paid = list.reduce((s, p) => s + num(p.paid), 0);
    const html = `
      <div class="ideal-v29-stats">
        <div class="ideal-v29-card"><span>عدد الفواتير</span><strong>${list.length}</strong></div>
        <div class="ideal-v29-card"><span>الإجمالي</span><strong>${formatMoney(total)}</strong></div>
        <div class="ideal-v29-card ok"><span>مدفوع</span><strong>${formatMoney(paid)}</strong></div>
        <div class="ideal-v29-card warn"><span>متبقٍ للموردين</span><strong>${formatMoney(total - paid)}</strong></div>
      </div>
      ${list.length ? `
        <table class="ideal-v29-table">
          <thead><tr><th>التاريخ</th><th>رقم</th><th>المورد</th><th>عدد</th><th>الإجمالي</th><th>مدفوع</th><th>متبقٍ</th></tr></thead>
          <tbody>${list.map((p) => `
            <tr>
              <td>${formatDate(p.date)}</td>
              <td>${escapeHtml(p.invoiceNumber)}</td>
              <td>${escapeHtml(p.supplierName || "-")}</td>
              <td>${(p.items || []).length}</td>
              <td>${formatMoney(p.total)}</td>
              <td>${formatMoney(p.paid)}</td>
              <td class="${p.remaining > 0 ? "warn" : ""}">${formatMoney(p.remaining)}</td>
            </tr>`).join("")}
          </tbody>
        </table>` : '<div class="ideal-v29-empty">لا توجد مشتريات مسجلة</div>'}
    `;
    openReport("🛒 المشتريات", html);
  }

  function firstOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  }

  /* ═══════ Export ═══════ */
  function exportExcel() {
    const body = $("#idealV29ReportBody");
    if (!body) return toast("لا يوجد تقرير", true);
    const title = $("#idealV29Content h2 span").textContent || "تقرير";
    const tables = body.querySelectorAll("table");
    let html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>
      table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px;font-family:Arial;font-size:13px;text-align:right;direction:rtl}
      th{background:#1976d2;color:#fff;font-weight:bold}.tot td{background:#e0f2fe;font-weight:bold}
      .ok{color:#16a34a}.warn{color:#dc2626}h2{font-family:Arial;color:#1976d2}
    </style></head><body dir="rtl"><h2>${escapeHtml(title)}</h2><p>تاريخ: ${new Date().toLocaleString("ar-EG")}</p>`;
    if (tables.length) tables.forEach((t) => { html += t.outerHTML; });
    else html += `<pre>${body.textContent}</pre>`;
    html += "</body></html>";
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `IdealH2O_${today()}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("📊 تم تصدير Excel");
  }

  function exportPDF() {
    const body = $("#idealV29ReportBody");
    if (!body) return toast("لا يوجد تقرير", true);
    const title = $("#idealV29Content h2 span").textContent || "تقرير";
    const cn = (readDB().settings && readDB().settings.companyName) || "IDEAL H2O";
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast("اسمح بالنوافذ المنبثقة", true);
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
      <style>@page{size:A4;margin:15mm}
      body{font-family:"Segoe UI",Tahoma,Arial;padding:15px;color:#222;direction:rtl}
      .hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:3px solid #1976d2;margin-bottom:20px}
      .hdr h1{margin:0;color:#1976d2;font-size:22px}.hdr .cn{font-weight:bold;color:#1976d2;font-size:16px}.hdr .mt{font-size:12px;color:#666}
      h2,h3{color:#1976d2;margin-top:18px}
      table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
      th,td{border:1px solid #ccc;padding:8px 10px;text-align:right}
      th{background:#1976d2;color:#fff;font-weight:bold}
      tr:nth-child(even) td{background:#f9f9f9}
      .tot td{background:#e0f2fe !important;font-weight:bold}
      .ok{color:#16a34a;font-weight:600}.warn{color:#dc2626;font-weight:600}
      .ideal-v29-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:15px 0}
      .ideal-v29-card{background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;border:1px solid #e0e0e0}
      .ideal-v29-card span{display:block;font-size:12px;color:#666;margin-bottom:6px}
      .ideal-v29-card strong{font-size:18px;color:#1976d2}
      .ideal-v29-card.warn strong{color:#dc2626}.ideal-v29-card.ok strong{color:#16a34a}
      .ftr{margin-top:30px;padding-top:15px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#999}
      button,.ideal-v29-btn{display:none !important}</style></head><body>
      <div class="hdr"><div><div class="cn">${escapeHtml(cn)}</div><h1>${escapeHtml(title)}</h1></div>
      <div class="mt">📅 ${new Date().toLocaleString("ar-EG")}</div></div>
      ${body.innerHTML}
      <div class="ftr">تم إنشاء التقرير تلقائيًا — ${escapeHtml(cn)}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`);
    w.document.close();
  }

  /* ═══════ FAB + Panel ═══════ */
  function injectSidebar() {
    if ($("#idealV29Fab")) return true;

    const fab = document.createElement("button");
    fab.id = "idealV29Fab";
    fab.title = "قائمة التقارير";
    fab.innerHTML = `📊<span class="idealV29FabBadge" id="idealV29Badge" style="display:none">0</span>`;
    fab.onclick = () => togglePanel();
    document.body.appendChild(fab);

    const backdrop = document.createElement("div");
    backdrop.id = "idealV29Backdrop";
    backdrop.onclick = () => togglePanel(false);
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "idealV29Panel";
    panel.innerHTML = `
      <div class="idealV29PanelHeader">
        <h3>📊 التقارير الذكية</h3>
        <button onclick="IdealV29.togglePanel(false)" title="إغلاق">✖</button>
      </div>
      <div class="idealV29PanelBody">
        <button class="idealV29Item purple" onclick="IdealV29.showReceivables();IdealV29.togglePanel(false)">
          <span class="icon">💰</span><span class="label">الأموال المستحقة</span><span class="arrow">‹</span>
        </button>
        <button class="idealV29Item green" onclick="IdealV29.showProfit();IdealV29.togglePanel(false)">
          <span class="icon">📈</span><span class="label">تقرير الأرباح</span><span class="arrow">‹</span>
        </button>
        <button class="idealV29Item orange" onclick="IdealV29.showReconciliation();IdealV29.togglePanel(false)">
          <span class="icon">🔍</span><span class="label">مطابقة التحصيلات</span><span class="arrow">‹</span>
        </button>
        <button class="idealV29Item blue" onclick="IdealV29.showStockMovements();IdealV29.togglePanel(false)">
          <span class="icon">📦</span><span class="label">حركات المخزون</span><span class="arrow">‹</span>
        </button>
        <button class="idealV29Item teal" onclick="IdealV29.showPurchases();IdealV29.togglePanel(false)">
          <span class="icon">🛒</span><span class="label">المشتريات</span><span class="arrow">‹</span>
        </button>
      </div>
      <div class="idealV29PanelFooter">💧 IDEAL H2O v29</div>
    `;
    document.body.appendChild(panel);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const p = $("#idealV29Panel");
        if (p && p.classList.contains("on")) togglePanel(false);
      }
    });

    updateBadge();
    return true;
  }

  function togglePanel(force) {
    const panel = $("#idealV29Panel");
    const backdrop = $("#idealV29Backdrop");
    if (!panel) return;
    const isOpen = panel.classList.contains("on");
    const shouldOpen = force === undefined ? !isOpen : force;
    if (shouldOpen) {
      panel.classList.add("on");
      backdrop.classList.add("on");
      document.body.style.overflow = "hidden";
      updateBadge();
    } else {
      panel.classList.remove("on");
      backdrop.classList.remove("on");
      document.body.style.overflow = "";
    }
  }

  function updateBadge() {
    try {
      const badge = $("#idealV29Badge");
      if (!badge) return;
      const r = getReceivables();
      const count = r.list.length;
      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
   * 📍 ADDRESS FIELD FOR MAINTENANCE REQUESTS
   * ═══════════════════════════════════════════════════════════ */

  // حقن خانة العنوان في نموذج الطلب
  function injectAddressFieldIntoRequestModal() {
    const modal = $("#requestModal");
    if (!modal || $("#idealRqAddress")) return;

    const reqProblemField = modal.querySelector("#reqProblem");
    const problemRow = reqProblemField ? reqProblemField.closest(".field") : null;
    if (!problemRow) return;

    // إنشاء صف العنوان
    const addressField = document.createElement("div");
    addressField.className = "field full";
    addressField.id = "idealRqAddressWrap";
    addressField.innerHTML = `
      <label>📍 العنوان <span style="color:#94a3b8;font-weight:500;font-size:11.5px">(اختياري)</span></label>
      <input type="text" id="idealRqAddress" placeholder="مثال: شبرا - مسجد الرحمة - منزل حسن" autocomplete="off">
      <div class="sugg-box" id="idealRqSuggBox"></div>
    `;

    // ضيفها بعد حقل المشكلة
    problemRow.parentNode.insertBefore(addressField, problemRow.nextSibling);

    // اقتراحات العنوان
    const input = $("#idealRqAddress");
    let timer = null;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => showAddressSuggestions(input.value), 150);
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        const box = $("#idealRqSuggBox");
        if (box) box.classList.remove("on");
      }, 200);
    });
    input.addEventListener("focus", () => {
      if (input.value.trim()) showAddressSuggestions(input.value);
    });

    // ESC يقفل الاقتراحات
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const box = $("#idealRqSuggBox");
        if (box) box.classList.remove("on");
      }
    });
  }

  function showAddressSuggestions(query) {
    const box = $("#idealRqSuggBox");
    if (!box) return;
    const q = clean(query).toLowerCase();
    if (!q) { box.classList.remove("on"); return; }

    const db = readDB();
    const results = new Map();
    (db.customers || []).forEach((c) => {
      const addr = clean(c.address);
      if (!addr || !addr.toLowerCase().includes(q)) return;
      const key = addr.toLowerCase();
      if (!results.has(key)) results.set(key, { address: addr, customerName: c.name, region: c.region || "" });
    });
    (db.requests || []).forEach((r) => {
      const addr = clean(r.address);
      if (!addr || !addr.toLowerCase().includes(q)) return;
      const key = addr.toLowerCase();
      if (!results.has(key)) results.set(key, { address: addr, customerName: r.name, region: r.region || "" });
    });

    const arr = Array.from(results.values()).slice(0, 8);
    if (!arr.length) { box.classList.remove("on"); return; }

    box.innerHTML = arr.map((s) => `
      <div class="sugg-item" onclick="IdealV29.selectAddress('${escapeHtml(s.address).replace(/'/g, "\\'")}')">
        📍 ${escapeHtml(s.address)}
        <span class="sugg-meta">👤 ${escapeHtml(s.customerName)}${s.region ? " — 🗺️ " + escapeHtml(s.region) : ""}</span>
      </div>
    `).join("");
    box.classList.add("on");
  }

  function selectAddress(addr) {
    const input = $("#idealRqAddress");
    if (input) { input.value = addr; input.focus(); }
    const box = $("#idealRqSuggBox");
    if (box) box.classList.remove("on");
  }

  // التقاط saveRequest الأصلي وإضافة العنوان
  function overrideSaveRequest() {
    if (global.__idealRqOverridden) return;
    if (typeof global.saveRequest !== "function") return;
    const origSaveRequest = global.saveRequest;

    global.saveRequest = function () {
      // اقرأ العنوان قبل ما الأصلي يقرأ الحقول
      const addrInput = $("#idealRqAddress");
      const address = addrInput ? clean(addrInput.value) : "";
      const nameInput = $("#reqName");
      const phoneInput = $("#reqPhone");

      // حفظ الطلب بالطريقة الأصلية
      const result = origSaveRequest.apply(this, arguments);

      // تحديث الطلب الأخير بإضافة العنوان
      try {
        const db = readDB();
        if (db.requests.length) {
          // آخر طلب هو اللي اتضاف حالًا
          const last = db.requests[db.requests.length - 1];
          const name = nameInput ? clean(nameInput.value) : "";
          const phone = phoneInput ? clean(phoneInput.value) : "";
          if (last && clean(last.name) === name && clean(last.phone) === phone) {
            last.address = address;
            writeDB(db);
          }
        }
      } catch (e) { console.warn("address save:", e); }

      // نظف حقل العنوان
      if (addrInput) addrInput.value = "";
      return result;
    };

    global.__idealRqOverridden = true;
    console.log("✅ تم تفعيل خانة العنوان");
  }

  // تحديث عرض الطلبات لإظهار العنوان
  function decorateRequestsList() {
    const list = $("#requestsList");
    if (!list) return;
    const db = readDB();
    const cards = list.querySelectorAll("div[style*='border-radius:12px']");
    cards.forEach((card) => {
      if (card.querySelector(".req-address-badge")) return;
      // ابحث عن اسم العميل في الكارت
      const nameEl = card.querySelector("div[style*='font-weight:800']");
      if (!nameEl) return;
      const nameText = clean(nameEl.textContent).replace(/^👤\s*/, "").replace(/\s*(👤 عميل مسجل|🆕 جديد).*$/, "").trim();
      const req = db.requests.find((r) => clean(r.name) === nameText);
      if (!req || !clean(req.address)) return;

      // أضف badge العنوان
      const problemDiv = card.querySelector("div[style*='background:var(--gray-50)']");
      if (problemDiv && problemDiv.parentNode) {
        const badge = document.createElement("div");
        badge.className = "req-address-badge";
        badge.innerHTML = `📍 ${escapeHtml(req.address)}`;
        problemDiv.parentNode.insertBefore(badge, problemDiv.nextSibling);
      }
    });
  }

  /* ═══════ Watchers ═══════ */
  function watchRequestModal() {
    // راقب فتح النافذة لإضافة الحقل لو مش موجود
    const observer = new MutationObserver(() => {
      injectAddressFieldIntoRequestModal();
      decorateRequestsList();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  /* ═══════ Init ═══════ */
  function init() {
    injectCSS();
    injectModal();
    let t = 0;
    const r = setInterval(() => { t++; if (injectSidebar() || t > 20) clearInterval(r); }, 400);

    // حاول تلتقط saveRequest كل شوية لحد ما يتوفر
    let reqTries = 0;
    const reqInt = setInterval(() => {
      reqTries++;
      overrideSaveRequest();
      injectAddressFieldIntoRequestModal();
      if (global.__idealRqOverridden || reqTries > 30) clearInterval(reqInt);
    }, 500);

    // استنى الـ DOM يتحمّل كامل
    setTimeout(() => {
      injectAddressFieldIntoRequestModal();
      decorateRequestsList();
      watchRequestModal();
    }, 1000);

    try {
      const db = readDB();
      if (!db.version || db.version !== "29") {
        migrate();
        console.log("✅ الترحيل التلقائي اكتمل");
      }
    } catch (e) { console.warn("migrate:", e); }

    console.log("🚀 Ideal H2O v29 loaded (with address for requests)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ═══════ Exports ═══════ */
  global.IdealV29 = {
    completeMaintenance, completeSale, payInstallment, registerPurchase,
    deductStock, addStock,
    showReceivables, showProfit, showReconciliation, showStockMovements, showPurchases,
    getReceivables, getProfit, reconcile,
    closeReport, exportExcel, exportPDF, injectSidebar,
    togglePanel, updateBadge,
    // Address
    selectAddress, injectAddressFieldIntoRequestModal,
    // Migration
    migrate, readDB, writeDB
  };
  global.IdealH2O = global.IdealV29;
  global.IdealUI = { toast };
})(window);