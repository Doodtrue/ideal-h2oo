/* ============================================================
 * IDEAL H2O v29 — Patch
 * 1) حذف صيانة (للمالك فقط)
 * 2) إضافة صنف يدوي في نافذة الصيانة
 * ============================================================ */
(function (global) {
  "use strict";
  if (global.__IDEAL_V29_PATCH__) return;
  global.__IDEAL_V29_PATCH__ = true;

  const $ = (s) => document.querySelector(s);
  const clean = (s) => String(s == null ? "" : s).trim();
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const uid = () => Date.now() + Math.random();
  const nowISO = () => new Date().toISOString();
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const L = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const S = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  function readDB() {
    return {
      customers: L("filterCustomers", []),
      history: L("filterHistory", []),
      products: L("filterProducts", []),
      invoices: L("filterInvoices", []),
      treasury: L("filterTreasury", { safeBalance: 0, drawerHistory: [], safeTransactions: [], currentDay: { date: "", openingBalance: 100, sales: 0, maintenance: 0, installments: 0, expenses: [], totalExpenses: 0 } }),
      auditLog: L("filterAuditLog", []),
      _currentUser: (() => { try { const u = JSON.parse(sessionStorage.getItem("currentUser") || "null"); return u ? u.username : "system"; } catch (e) { return "system"; } })(),
      _currentRole: (() => { try { const u = JSON.parse(sessionStorage.getItem("currentUser") || "null"); return u ? u.role : "owner"; } catch (e) { return "owner"; } })()
    };
  }

  function writeDB(db) {
    S("filterCustomers", db.customers);
    S("filterHistory", db.history);
    S("filterProducts", db.products);
    S("filterInvoices", db.invoices);
    S("filterTreasury", db.treasury);
    S("filterAuditLog", db.auditLog);
    if (typeof global.save === "function") { try { global.save(); } catch (e) {} }
    try { if (typeof global.customers !== "undefined") global.customers = db.customers; } catch (e) {}
    try { if (typeof global.history !== "undefined") global.history = db.history; } catch (e) {}
    try { if (typeof global.products !== "undefined") global.products = db.products; } catch (e) {}
    try { if (typeof global.invoices !== "undefined") global.invoices = db.invoices; } catch (e) {}
    try { if (typeof global.treasury !== "undefined") global.treasury = db.treasury; } catch (e) {}
    try { if (typeof global.auditLog !== "undefined") global.auditLog = db.auditLog; } catch (e) {}
  }

  function isOwner() {
    try { const u = JSON.parse(sessionStorage.getItem("currentUser") || "null"); return u && u.role === "owner"; } catch (e) { return false; }
  }

  /* ═══════════════════════════════════════════════════════════
   * 1) حذف صيانة (للمالك فقط)
   * ═══════════════════════════════════════════════════════════ */
  function deleteMaintenance(historyId) {
    if (!isOwner()) { alert("🔒 الحذف للمالك فقط"); return; }
    const db = readDB();
    const h = db.history.find((x) => String(x.id) === String(historyId));
    if (!h) { alert("الصيانة غير موجودة"); return; }

    const msg = `⚠️ حذف الصيانة\n\n` +
      `👤 العميل: ${h.customerName || "-"}\n` +
      `📅 التاريخ: ${h.date}\n` +
      `🔧 الفلتر: ${h.filterType || "-"}\n` +
      `💰 التكلفة: ${(h.cost || 0).toLocaleString()} ج.م\n` +
      `💵 المدفوع: ${(h.paidAmount || 0).toLocaleString()} ج.م\n\n` +
      `سيتم:\n` +
      `✓ إرجاع القطع المستخدمة للمخزون\n` +
      `✓ حذف الفاتورة المرتبطة\n` +
      `✓ خصم المبلغ من الدرج\n\n` +
      `هل أنت متأكد؟`;

    if (!confirm(msg)) return;
    if (!confirm("تأكيد أخير: لا يمكن التراجع!")) return;

    // 1) إرجاع القطع للمخزون
    if (Array.isArray(h.partsUsed)) {
      for (const part of h.partsUsed) {
        if (part.productId) {
          const p = db.products.find((x) => x.id === part.productId);
          if (p) p.stock = num(p.stock) + num(part.qty);
        }
      }
    } else if (h.parts && h.parts !== "—") {
      const names = h.parts.split(" + ").map((s) => s.trim().replace(/\s*\(\d+\)$/, ""));
      for (const name of names) {
        const p = db.products.find((x) => clean(x.name) === clean(name));
        if (p) p.stock = num(p.stock) + 1;
      }
    }
    // الأصناف اليدوية
    if (Array.isArray(h.manualParts)) {
      for (const p of h.manualParts) {
        if (p.addToStock) {
          const prod = db.products.find((x) => clean(x.name).toLowerCase() === clean(p.name).toLowerCase());
          if (prod) prod.stock = Math.max(0, num(prod.stock) - num(p.qty));
        }
      }
    }

    // 2) حذف الفاتورة
    if (h.invoiceNumber) {
      db.invoices = db.invoices.filter((inv) => inv.number !== h.invoiceNumber);
    }

    // 3) خصم المبلغ من الدرج
    if (num(h.paidAmount) > 0 && db.treasury && db.treasury.currentDay) {
      const d = db.treasury.currentDay;
      d.maintenance = Math.max(0, num(d.maintenance) - num(h.paidAmount));
    }

    // 4) حذف الصيانة
    db.history = db.history.filter((x) => String(x.id) !== String(historyId));

    // 5) audit
    db.auditLog.unshift({
      id: uid(), time: nowISO(), user: db._currentUser, role: db._currentRole,
      action: "🗑 حذف صيانة",
      details: `${h.customerName || "-"} — ${h.filterType || "-"} — ${(h.cost || 0).toLocaleString()} ج.م — ${h.date}`
    });

    writeDB(db);
    alert("✅ تم الحذف وإرجاع القطع للمخزون");

    if (typeof global.renderCustomerPage === "function") { try { global.renderCustomerPage(); } catch (e) {} }
    if (typeof global.refreshAll === "function") { try { global.refreshAll(); } catch (e) {} }
  }

  function addDeleteButtonsToTimeline() {
    if (!isOwner()) return;
    const tl = document.querySelector("#cpTimeline");
    if (!tl) return;

    const items = tl.querySelectorAll(":scope > div");
    items.forEach((item) => {
      if (item.querySelector(".ideal-v29-delete-btn")) return;
      const editBtn = item.querySelector('button[onclick*="openMaintModal"]');
      if (!editBtn) return;

      const onclick = editBtn.getAttribute("onclick") || "";
      const m = onclick.match(/openMaintModal\(([^)]+)\)/);
      if (!m) return;
      const args = m[1].split(",").map((s) => s.trim());
      const historyId = args[2];
      if (!historyId || historyId === "undefined" || historyId === "null") return;

      const delBtn = document.createElement("button");
      delBtn.className = "ideal-v29-delete-btn";
      delBtn.style.cssText = "background:#dc2626;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600;margin-right:6px";
      delBtn.textContent = "🗑 حذف";
      delBtn.onclick = (e) => { e.stopPropagation(); deleteMaintenance(historyId); };

      editBtn.parentNode.insertBefore(delBtn, editBtn);
    });
  }

  /* ═══════════════════════════════════════════════════════════
   * 2) إضافة صنف يدوي في نافذة الصيانة
   * ═══════════════════════════════════════════════════════════ */
  let _manualParts = [];

  function injectManualPartSection() {
    const modal = document.querySelector("#maintModal");
    if (!modal) return;
    if (modal.querySelector("#idealManualPartSection")) return;

    const partsGrid = modal.querySelector("#maintPartsGrid");
    if (!partsGrid) return;

    const section = document.createElement("div");
    section.id = "idealManualPartSection";
    section.style.cssText = "margin-top:12px;background:#f0fdf4;border:2px dashed #16a34a;border-radius:10px;padding:12px";
    section.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <strong style="color:#166534;font-size:13.5px">➕ إضافة صنف يدوي (غير موجود في القائمة)</strong>
        <button type="button" onclick="IdealV29Patch.toggleManualForm()" style="background:#16a34a;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12.5px;font-family:inherit;font-weight:700">+ إضافة</button>
      </div>
      <div id="idealManualForm" style="display:none;background:#fff;padding:12px;border-radius:8px;border:1px solid #bbf7d0">
        <div style="display:grid;grid-template-columns:2fr 1fr 80px 1fr;gap:8px;align-items:end">
          <div>
            <label style="font-size:11.5px;color:#166534;font-weight:700;display:block;margin-bottom:4px">اسم الصنف *</label>
            <input type="text" id="idealMpName" placeholder="مثال: شمعة كوري" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-family:inherit;font-size:13px">
          </div>
          <div>
            <label style="font-size:11.5px;color:#166534;font-weight:700;display:block;margin-bottom:4px">التكلفة</label>
            <input type="number" id="idealMpCost" value="0" min="0" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-family:inherit;font-size:13px">
          </div>
          <div>
            <label style="font-size:11.5px;color:#166534;font-weight:700;display:block;margin-bottom:4px">الكمية</label>
            <input type="number" id="idealMpQty" value="1" min="1" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-family:inherit;font-size:13px">
          </div>
          <div>
            <label style="font-size:11.5px;color:#166534;font-weight:700;display:block;margin-bottom:4px">&nbsp;</label>
            <button type="button" onclick="IdealV29Patch.addManualPart()" style="width:100%;padding:8px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700">✅ إضافة</button>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;font-size:12.5px;color:#166534;font-weight:600">
          <input type="checkbox" id="idealMpAddToStock" checked style="transform:scale(1.2)">
          إضافة هذا الصنف إلى المخزون بشكل دائم
        </label>
      </div>
      <div id="idealManualList" style="margin-top:10px"></div>
    `;
    partsGrid.parentNode.insertBefore(section, partsGrid.nextSibling);
    renderManualList();
  }

  function toggleManualForm() {
    const f = document.querySelector("#idealManualForm");
    if (!f) return;
    f.style.display = f.style.display === "none" ? "block" : "none";
    if (f.style.display === "block") {
      const inp = document.querySelector("#idealMpName");
      if (inp) setTimeout(() => inp.focus(), 50);
    }
  }

  function addManualPart() {
    const name = clean(document.querySelector("#idealMpName")?.value);
    const cost = num(document.querySelector("#idealMpCost")?.value);
    const qty = num(document.querySelector("#idealMpQty")?.value) || 1;
    const addToStock = document.querySelector("#idealMpAddToStock")?.checked;

    if (!name) { alert("اكتب اسم الصنف"); return; }
    if (qty <= 0) { alert("الكمية غير صحيحة"); return; }

    _manualParts.push({ name, cost, qty, addToStock, id: uid() });
    document.querySelector("#idealMpName").value = "";
    document.querySelector("#idealMpCost").value = "0";
    document.querySelector("#idealMpQty").value = "1";
    renderManualList();
    toggleManualForm();
  }

  function removeManualPart(idx) {
    _manualParts.splice(idx, 1);
    renderManualList();
  }

  function renderManualList() {
    const list = document.querySelector("#idealManualList");
    if (!list) return;
    if (!_manualParts.length) { list.innerHTML = ""; return; }

    const total = _manualParts.reduce((s, p) => s + p.cost * p.qty, 0);
    list.innerHTML = `
      <div style="font-size:11.5px;color:#166534;font-weight:700;margin-bottom:6px">📋 الأصناف اليدوية (${_manualParts.length}) — إجمالي: ${total.toLocaleString()} ج.م</div>
      ${_manualParts.map((p, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#fff;border-radius:6px;margin-bottom:5px;font-size:12.5px;border:1px solid #d1fae5">
          <div>
            <strong style="color:#166534">${escapeHtml(p.name)}</strong>
            <span style="color:#64748b"> × ${p.qty}</span>
            ${p.addToStock ? '<span style="color:#16a34a;font-size:11px"> • سيضاف للمخزون</span>' : '<span style="color:#f59e0b;font-size:11px"> • مرة واحدة</span>'}
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <strong style="color:#16a34a">${(p.cost * p.qty).toLocaleString()} ج.م</strong>
            <button type="button" onclick="IdealV29Patch.removeManualPart(${i})" style="background:#dc2626;color:#fff;border:none;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px;font-weight:700">✕</button>
          </div>
        </div>
      `).join("")}
    `;
  }

  /* التقاط saveMaintenance الأصلي لحفظ الأصناف اليدوية */
  function overrideSaveMaintenance() {
    if (global.__idealMaintOverridden) return;
    if (typeof global.saveMaintenance !== "function") return;
    const orig = global.saveMaintenance;

    global.saveMaintenance = function (sendWa) {
      const snapshot = _manualParts.slice();
      const result = orig.apply(this, arguments);

      if (snapshot.length) {
        try {
          const db = readDB();
          if (db.history.length) {
            const last = db.history[db.history.length - 1];
            if (last && !last.manualParts) {
              last.manualParts = snapshot.map((p) => ({
                name: p.name, qty: p.qty, unitCost: p.cost,
                totalCost: p.cost * p.qty, addToStock: p.addToStock
              }));
              const manualCost = snapshot.reduce((s, p) => s + p.cost * p.qty, 0);
              last.manualPartsCost = manualCost;

              // حدّث إجمالي القطع والربح
              const oldPartsCost = num(last.partsCost) - manualCost;
              last.partsCost = Math.max(0, oldPartsCost) + manualCost;

              // لو الصيانة من v29 القديم، فيه revenue و laborCost
              if (last.revenue !== undefined) {
                last.profit = num(last.revenue) - num(last.partsCost) - num(last.laborCost);
              }

              // أضف الأصناف الجديدة للمخزون لو مطلوب
              for (const p of snapshot) {
                if (p.addToStock) {
                  const existing = db.products.find((x) => clean(x.name).toLowerCase() === clean(p.name).toLowerCase());
                  if (!existing) {
                    db.products.push({
                      id: uid(), name: p.name, cost: p.cost, price: 0,
                      stock: 0, unit: "قطعة", category: "قطع غيار",
                      minStock: 0, addedBy: db._currentUser, createdAt: nowISO(), isCustom: true
                    });
                  }
                }
              }

              writeDB(db);
              if (typeof global.refreshAll === "function") { try { global.refreshAll(); } catch (e) {} }
              if (typeof global.renderCustomerPage === "function") { try { global.renderCustomerPage(); } catch (e) {} }
            }
          }
        } catch (e) { console.warn("manual parts:", e); }
      }

      _manualParts = [];
      renderManualList();
      return result;
    };

    global.__idealMaintOverridden = true;
  }

  /* ═══════ Watchers ═══════ */
  function watchDom() {
    const observer = new MutationObserver(() => {
      addDeleteButtonsToTimeline();
      injectManualPartSection();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    let tries = 0;
    const r = setInterval(() => {
      tries++;
      injectManualPartSection();
      addDeleteButtonsToTimeline();
      overrideSaveMaintenance();
      if (tries > 30) clearInterval(r);
    }, 500);

    watchDom();
    setTimeout(() => {
      injectManualPartSection();
      addDeleteButtonsToTimeline();
    }, 1500);

    console.log("🔧 Ideal H2O v29 Patch loaded (delete + manual parts)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IdealV29Patch = {
    deleteMaintenance,
    addManualPart, removeManualPart, toggleManualForm, renderManualList,
    injectManualPartSection, addDeleteButtonsToTimeline
  };
})(window);