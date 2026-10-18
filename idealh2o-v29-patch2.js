/* ============================================================
 * IDEAL H2O v29 — Patch 2 (Installments Payment + Edit Date Fix)
 * 1) إصلاح مشكلة تغيير تاريخ التركيب عند التعديل الشامل
 * 2) إضافة قسم "نظام الأقساط" في صفحة العميل مع إمكانية الدفع
 * ============================================================ */
(function (global) {
  "use strict";
  if (global.__IDEAL_V29_PATCH2__) return;
  global.__IDEAL_V29_PATCH2__ = true;

  const $ = (s) => document.querySelector(s);
  const clean = (s) => String(s == null ? "" : s).trim();
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const today = () => new Date().toISOString().slice(0, 10);
  const formatDateAr = (d) => {
    if (!d) return '—';
    const x = new Date(d);
    if (isNaN(x.getTime())) return '—';
    const m = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return x.getDate() + ' ' + m[x.getMonth()] + ' ' + x.getFullYear();
  };
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  // ==========================================================
  // 1) إصلاح مشكلة تاريخ التركيب في "تعديل شامل"
  // ==========================================================
  if (typeof ceAddFilter === 'function') {
    const origCeAdd = window.ceAddFilter;
    window.ceAddFilter = function (data) {
      data = data || {};
      // لو الفلتر قديم (له id) ومفيش installDate، نخليه فاضي بدل ما يحط تاريخ اليوم
      if (data.id && data.installDate === undefined) data.installDate = "";
      else if (!data.id && data.installDate === undefined) data.installDate = today();

      const wrap = document.getElementById('ceFiltersContainer');
      if (!wrap) return;
      const block = document.createElement('div');
      block.className = 'filter-block';
      block.style.cssText = 'border:2px solid var(--primary-light);border-radius:10px;padding:15px;margin-bottom:12px;background:var(--gray-50);position:relative';

      const displayInstallDate = data.installDate !== undefined ? data.installDate : today();

      block.innerHTML = '<button type="button" class="btn btn-danger btn-sm" style="position:absolute;top:8px;left:8px;z-index:2" onclick="this.closest(\'.filter-block\').remove()">🗑</button>' +
        '<div class="form-grid" style="margin-top:20px">' +
        '<div class="field"><label>النوع</label><select class="ce-f-type">' + FILTER_TYPES.map(t => '<option value="' + t + '"' + (t === data.type ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>المتابعة</label><select class="ce-f-tracking">' + TRACKING_TYPES.map(t => '<option value="' + t + '"' + (t === data.trackingType ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>مصدر الفلتر</label><select class="ce-f-source" onchange="ceToggleFilterSource(this)"><option value="ours"' + (data.filterSource === 'ours' ? ' selected' : '') + '>🏪 من عندنا</option><option value="client"' + (data.filterSource === 'client' ? ' selected' : '') + '>👤 من عند العميل</option></select></div>' +
        '<div class="field ce-install-wrap"><label>📅 تاريخ التركيب</label><input type="date" class="ce-f-install" value="' + displayInstallDate + '"></div>' +
        '<div class="field ce-contract-wrap" style="display:none"><label>📅 بداية التعاقد</label><input type="date" class="ce-f-contract" value="' + (data.contractDate || '') + '"></div>' +
        '<div class="field"><label>آخر صيانة</label><input type="date" class="ce-f-last" value="' + data.lastMaintenance + '"></div>' +
        '<div class="field"><label>السعر</label><input type="number" class="ce-f-price" min="0" value="' + (data.price || '') + '"></div>' +
        '<div class="field full"><label>📍 عنوان التركيب</label><input type="text" class="ce-f-address" value="' + escapeHtml(data.address || '') + '"></div>' +
        '</div>';
      wrap.appendChild(block);
      if (data.filterSource === 'client') ceToggleFilterSource(block.querySelector('.ce-f-source'));
    };
  }

  if (typeof saveCustEditModal === 'function') {
    const origSaveCust = window.saveCustEditModal;
    window.saveCustEditModal = function () {
      if (typeof requireOwner === 'function' && !requireOwner()) return;
      const c = customers.find(x => x.id == editingCustId); if (!c) return;
      const errors = [];
      const name = document.getElementById('ceName').value.trim();
      if (!name) errors.push('اسم العميل مطلوب');
      const phones = Array.from(document.querySelectorAll('#cePhonesContainer .ce-phone')).map(i => i.value.trim()).filter(v => v);
      if (!phones.length) errors.push('رقم هاتف واحد مطلوب');

      const filters = [];
      document.querySelectorAll('#ceFiltersContainer .filter-block').forEach((b, i) => {
        const type = b.querySelector('.ce-f-type').value, last = b.querySelector('.ce-f-last').value;
        const tracking = b.querySelector('.ce-f-tracking').value, price = parseFloat(b.querySelector('.ce-f-price').value) || 0;
        const filterSource = b.querySelector('.ce-f-source').value;

        let installDate = b.querySelector('.ce-f-install').value;
        let contractDate = b.querySelector('.ce-f-contract').value;

        // 🔥 الإصلاح: لو الحقل فاضي، نحتفظ بالتاريخ القديم
        if (!installDate && c.filters && c.filters[i]) {
          installDate = c.filters[i].installDate || '';
        }

        const address = b.querySelector('.ce-f-address').value.trim();
        if (type && last && tracking) {
          const oldFilter = c.filters && c.filters[i] ? c.filters[i] : null;
          const oldId = oldFilter ? oldFilter.id : 'f' + Date.now() + i;

          filters.push({
            id: oldId, type, lastMaintenance: last, trackingType: tracking,
            nextMaintenance: calculateNextMaintenance(last, tracking), price, filterSource,
            installDate: installDate, contractDate: contractDate, address
          });
        }
      });
      if (!filters.length) errors.push('فلتر واحد على الأقل مطلوب');

      const hasInst = document.getElementById('ceHasInst').checked;
      if (hasInst) {
        const total = parseFloat(document.getElementById('ceTotal').value) || 0;
        const down = parseFloat(document.getElementById('ceDown').value) || 0;
        if (total <= 0) errors.push('إجمالي الأقساط أكبر من صفر');
        if (down >= total) errors.push('المقدم أكبر من أو يساوي الإجمالي!');
      }
      if (errors.length) {
        document.getElementById('ceValidationBox').style.display = 'block';
        document.getElementById('ceValidationList').innerHTML = errors.map(e => '<li>' + e + '</li>').join('');
        return;
      }
      document.getElementById('ceValidationBox').style.display = 'none';

      const oldPaid = c.paidInstallments || [];

      Object.assign(c, {
        name, region: document.getElementById('ceRegion').value,
        address: document.getElementById('ceAddress').value.trim(),
        status: document.getElementById('ceStatus').value,
        notes: document.getElementById('ceNotes').value.trim(),
        phones, filters, hasInstallments: hasInst
      });

      if (hasInst) {
        c.totalAmount = parseFloat(document.getElementById('ceTotal').value) || 0;
        c.downPayment = parseFloat(document.getElementById('ceDown').value) || 0;
        c.installmentsCount = parseInt(document.getElementById('ceCount').value) || 0;
        c.installmentAmount = parseFloat(document.getElementById('ceAmount').value) || 0;
        c.installmentsStartDate = document.getElementById('ceStart').value;
        const paidCount = Math.max(0, parseInt(document.getElementById('cePaidCount').value) || 0);
        const newPaid = [];
        for (let i = 1; i <= Math.min(paidCount, c.installmentsCount); i++) {
          newPaid.push(oldPaid.find(p => p.num === i) || { num: i, date: today(), amount: c.installmentAmount });
        }
        c.paidInstallments = newPaid;
      }

      if (typeof logActivity === 'function') logActivity('تعديل عميل', name);
      if (typeof save === 'function') save();
      if (typeof closeModal === 'function') closeModal('custEditModal');
      if (typeof refreshAll === 'function') refreshAll();

      if (typeof currentCustomerPageId !== 'undefined' && currentCustomerPageId === editingCustId && typeof renderCustomerPage === 'function') {
        renderCustomerPage();
      }
      alert('✅ تم الحفظ');
    };
  }

  // ==========================================================
  // 2) قسم الأقساط في صفحة العميل
  // ==========================================================
  function injectInstallmentsSection() {
    if (typeof currentCustomerPageId === 'undefined') return;
    const c = customers.find(x => x.id === currentCustomerPageId);
    if (!c) return;
    const wrap = document.getElementById('cpInstallmentsWrap');
    if (!wrap) return;

    if (!c.hasInstallments || !c.installmentsCount) {
      wrap.innerHTML = '';
      return;
    }

    const paid = c.paidInstallments || [];
    const totalPaid = paid.reduce((s, p) => s + (num(p.amount) || c.installmentAmount), 0);
    const totalDue = num(c.totalAmount) - num(c.downPayment);
    const remaining = Math.max(0, totalDue - totalPaid);
    const paidCount = paid.length;
    const nextNum = paidCount + 1;

    let nextHtml = '';
    if (nextNum <= c.installmentsCount) {
      const nextDate = addMonths ? addMonths(c.installmentsStartDate, nextNum - 1).toISOString().split('T')[0] : '';
      nextHtml = `
        <div style="background:linear-gradient(135deg, #e0f2fe, #bae6fd);padding:15px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px;border-right:4px solid #0284c7">
          <div>
            <div style="font-weight:800;color:#0369a1;font-size:15px">⏳ القسط القادم: رقم ${nextNum}</div>
            <div style="font-size:13px;color:#0c4a6e;margin-top:4px">📅 الاستحقاق: ${formatDateAr(nextDate)} | 💰 القيمة: ${(num(c.installmentAmount)).toLocaleString()} ج.م</div>
          </div>
          <button class="btn btn-success" onclick="IdealV29Patch2.openPayInstallmentModal(${c.id}, ${nextNum})">💵 تسجيل دفع القسط</button>
        </div>
      `;
    }

    let tableHtml = '';
    if (paid.length) {
      const sorted = [...paid].sort((a, b) => b.num - a.num);
      tableHtml = `
        <div class="table-wrap"><table>
          <thead><tr><th>القسط</th><th>تاريخ الدفع</th><th>المبلغ</th><th>طريقة الدفع</th></tr></thead>
          <tbody>
            ${sorted.map(p => `
              <tr>
                <td><strong>القسط ${p.num}</strong></td>
                <td>${formatDateAr(p.date)}</td>
                <td style="color:var(--success);font-weight:700">${(num(p.amount) || c.installmentAmount).toLocaleString()} ج.م</td>
                <td>${escapeHtml(p.method || 'نقدي')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `;
    }

    wrap.innerHTML = `
      <div class="panel" style="margin-top:20px">
        <h2>💵 نظام الأقساط <span style="font-size:13px;color:var(--gray-500);font-weight:500">(${paidCount} من ${c.installmentsCount} مدفوع)</span></h2>
        
        <div class="stats" style="margin-bottom:15px">
          <div class="stat-card blue"><div class="icon">💰</div><div class="num">${totalDue.toLocaleString()}</div><div class="label">إجمالي التقسيط</div></div>
          <div class="stat-card green"><div class="icon">✅</div><div class="num">${totalPaid.toLocaleString()}</div><div class="label">المدفوع</div></div>
          <div class="stat-card red"><div class="icon">⏳</div><div class="num">${remaining.toLocaleString()}</div><div class="label">المتبقي</div></div>
        </div>
        
        ${nextHtml}
        ${tableHtml}
      </div>
    `;
  }

  if (typeof renderCustomerPage === 'function') {
    const origRender = window.renderCustomerPage;
    window.renderCustomerPage = function () {
      origRender.apply(this, arguments);
      injectInstallmentsSection();
    };
  }

  // ==========================================================
  // 3) نافذة تسجيل دفع القسط
  // ==========================================================
  function openPayInstallmentModal(customerId, defaultNum) {
    const c = customers.find(x => x.id === customerId);
    if (!c) return;

    const paid = c.paidInstallments || [];
    const nextNum = defaultNum || (paid.length + 1);
    if (nextNum > c.installmentsCount) {
      alert('كل الأقساط مدفوعة!');
      return;
    }

    const nextDate = addMonths ? addMonths(c.installmentsStartDate, nextNum - 1).toISOString().split('T')[0] : '';
    const remaining = num(c.totalAmount) - num(c.downPayment) - paid.reduce((s, p) => s + num(p.amount || c.installmentAmount), 0);

    let overlay = document.getElementById('idealPayInstModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'idealPayInstModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:500px">
          <h3>💵 تسجيل دفع قسط</h3>
          <div id="idealPayInstInfo" style="background:var(--primary-light);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:13.5px;line-height:1.7"></div>
          <div class="form-grid">
            <div class="field"><label>رقم القسط</label><input type="number" id="idealPayInstNum" readonly style="background:var(--gray-50)"></div>
            <div class="field"><label>المبلغ *</label><input type="number" id="idealPayInstAmount" min="0" step="0.5"></div>
            <div class="field"><label>تاريخ الدفع *</label><input type="date" id="idealPayInstDate"></div>
            <div class="field"><label>طريقة الدفع</label><select id="idealPayInstMethod"><option value="نقدي">نقدي</option><option value="فودافون كاش">فودافون كاش</option><option value="تحويل بنكي">تحويل بنكي</option></select></div>
          </div>
          <div class="actions" style="margin-top:20px;justify-content:space-between">
            <button class="btn btn-outline" onclick="document.getElementById('idealPayInstModal').classList.remove('show')">إلغاء</button>
            <button class="btn btn-success" onclick="IdealV29Patch2.confirmPayInstallment()">💾 تأكيد الدفع</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById('idealPayInstInfo').innerHTML = `
      <strong>👤 العميل:</strong> ${escapeHtml(c.name)}<br>
      <strong>⏳ القسط القادم:</strong> رقم ${nextNum} — ${formatDateAr(nextDate)}<br>
      <strong>💰 المتبقي الكلي:</strong> ${remaining.toLocaleString()} ج.م
    `;
    document.getElementById('idealPayInstNum').value = nextNum;
    document.getElementById('idealPayInstAmount').value = c.installmentAmount;
    document.getElementById('idealPayInstDate').value = today();
    document.getElementById('idealPayInstMethod').value = 'نقدي';

    window._currentPayInstCustomerId = customerId;
    overlay.classList.add('show');
  }

  function confirmPayInstallment() {
    const customerId = window._currentPayInstCustomerId;
    if (!customerId) return;
    const c = customers.find(x => x.id === customerId);
    if (!c) return;

    const instNum = parseInt(document.getElementById('idealPayInstNum').value);
    const amount = parseFloat(document.getElementById('idealPayInstAmount').value) || 0;
    const date = document.getElementById('idealPayInstDate').value;
    const method = document.getElementById('idealPayInstMethod').value;

    if (!instNum || !amount || !date) { alert('بيانات ناقصة'); return; }

    if (!c.paidInstallments) c.paidInstallments = [];
    if (c.paidInstallments.find(p => p.num === instNum)) {
      alert('هذا القسط مدفوع مسبقاً!');
      return;
    }

    c.paidInstallments.push({ num: instNum, date, amount, method, addedBy: currentUser?.username || '—' });

    const totalPaid = c.paidInstallments.reduce((s, p) => s + num(p.amount || c.installmentAmount), 0);
    const totalDue = num(c.totalAmount) - num(c.downPayment);
    c.remainingDebt = Math.max(0, totalDue - totalPaid);

    if (typeof _addToDrawer === 'function') {
      _addToDrawer('installment', amount);
    } else if (treasury && treasury.currentDay) {
      treasury.currentDay.installments = (treasury.currentDay.installments || 0) + amount;
    }

    const invNum = generateInvoiceNumber ? generateInvoiceNumber() : 'INST-' + Date.now();
    if (invoices) {
      invoices.push({
        id: Date.now(), number: invNum, date: date,
        customerId: c.id, customerName: c.name,
        items: [{ productName: `قسط رقم ${instNum}`, qty: 1, price: amount, total: amount }],
        total: amount, paid: amount, remaining: 0, type: 'installment', createdAt: new Date().toISOString()
      });
    }

    try {
      const ledger = JSON.parse(localStorage.getItem('idealInstLedger') || '[]');
      ledger.push({
        id: Date.now() + Math.random(), date, customerId: c.id, customerName: c.name,
        installmentNum: instNum, amount, method, invoiceNumber: invNum,
        recordedInTreasury: true, addedBy: currentUser?.username || '—', createdAt: new Date().toISOString()
      });
      localStorage.setItem('idealInstLedger', JSON.stringify(ledger));
    } catch (e) {}

    if (typeof logActivity === 'function') logActivity('دفع قسط', `${c.name} — القسط ${instNum} — ${amount} ج.م`);

    if (typeof save === 'function') save();
    document.getElementById('idealPayInstModal').classList.remove('show');

    if (typeof currentCustomerPageId !== 'undefined' && currentCustomerPageId === customerId && typeof renderCustomerPage === 'function') {
      renderCustomerPage();
    }
    if (typeof refreshAll === 'function') refreshAll();

    alert('✅ تم تسجيل القسط بنجاح');
  }

  global.IdealV29Patch2 = {
    openPayInstallmentModal,
    confirmPayInstallment,
    injectInstallmentsSection
  };

  function init() {
    setTimeout(() => {
      if (typeof currentCustomerPageId !== 'undefined' && currentCustomerPageId && typeof renderCustomerPage === 'function') {
        renderCustomerPage();
      }
    }, 1500);
    console.log("🔧 Ideal H2O v29 Patch 2 loaded (Installments + Edit Date Fix)");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);