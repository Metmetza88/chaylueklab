import { createStockClient } from './stock-client.js';

const CHANNELS = Object.freeze({ STORE: 'หน้าร้าน', LINE: 'LINE', FACEBOOK: 'Facebook', TIKTOK: 'TikTok', SHOPEE: 'Shopee', OTHER: 'อื่น ๆ' });
const MAX_QUANTITY = 1000000000;
const $ = (id) => document.getElementById(id);
const state = {
  snapshot: null, screen: 'home', channel: null, query: '', days: 1, historyChannel: '',
  busy: false, historySequence: 0, sheetVersion: 0, sheetKind: null, sheetContext: null,
  previousFocus: null, restoreKey: null, restoring: false, connected: false,
};
let client = null;
let toastTimer;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function button(text, className = 'button', handler, id) {
  const node = el('button', className, text);
  node.type = 'button';
  if (id) node.id = id;
  if (handler) node.addEventListener('click', handler);
  return node;
}
function field(id, label, options = {}) {
  const wrap = el('label', 'field-label', label);
  wrap.htmlFor = id;
  const input = el(options.multiline ? 'textarea' : 'input', 'field');
  input.id = id;
  input.name = id;
  if (!options.multiline) input.type = options.type || 'text';
  if (options.type === 'number') input.inputMode = 'numeric';
  if (options.value !== undefined) input.value = String(options.value);
  for (const key of ['placeholder', 'min', 'max', 'maxLength', 'required', 'step', 'autocomplete']) {
    if (options[key] !== undefined) input[key] = options[key];
  }
  wrap.append(input);
  return { wrap, input };
}
function integer(value, min = 0) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= MAX_QUANTITY ? number : null;
}
function count(value, padded = false) {
  const number = integer(value);
  return number === null ? '—' : padded ? String(number).padStart(2, '0') : number.toLocaleString('th-TH');
}
function active() { return ['OWNER', 'STAFF'].includes(state.snapshot?.user?.role); }
function owner() { return state.snapshot?.user?.role === 'OWNER'; }
function variants() { return active() && Array.isArray(state.snapshot?.variants) ? state.snapshot.variants : []; }
function variantById(id) { return variants().find((variant) => variant.id === id); }
function pending() { return client?.getPending?.() || null; }
function canWrite() { return active() && !state.busy && !state.restoring && !pending() && state.connected; }
function stockStatus(variant) {
  const stock = integer(variant.stock_quantity);
  const threshold = integer(variant.low_stock_threshold) ?? integer(state.snapshot?.shop?.default_threshold) ?? 0;
  if (stock === 0) return { label: 'OUT OF STOCK', thai: 'สินค้าหมด', className: 'stock-badge-out' };
  if (stock !== null && stock <= threshold) return { label: 'LOW STOCK', thai: 'สินค้าใกล้หมด', className: 'stock-badge-low' };
  return { label: 'IN STOCK', thai: 'มีสินค้า', className: '' };
}
function appendStatus(parent, variant) {
  const status = stockStatus(variant);
  const badge = el('span', `stock-badge ${status.className}`, status.label);
  badge.setAttribute('aria-label', status.thai);
  parent.append(badge);
}
function matches(variant) {
  const words = state.query.toLocaleLowerCase('th-TH').split(/\s+/u).filter(Boolean);
  const text = [variant.product_name, variant.sku, variant.color, variant.size].join(' ').toLocaleLowerCase('th-TH');
  const otherText = [variant.product_name, variant.sku, variant.color].join(' ').toLocaleLowerCase('th-TH');
  const size = String(variant.size).toLocaleLowerCase('th-TH');
  const knownSizes = [...new Set(variants().map((item) => String(item.size).toLocaleLowerCase('th-TH')))].sort((left, right) => right.length - left.length);
  return words.every((word) => {
    if (knownSizes.includes(word)) return size === word;
    const alternatives = word.split('/');
    if (alternatives.length > 1 && alternatives.every((part) => knownSizes.includes(part))) return alternatives.includes(size);
    const suffix = knownSizes.find((known) => known && word.length > known.length && word.endsWith(known));
    if (suffix && otherText.includes(word.slice(0, -suffix.length))) return size === suffix;
    return text.includes(word);
  });
}
function empty(text, addProduct = false) {
  const node = el('div', 'empty-state');
  node.append(el('p', 'muted', text));
  if (addProduct && owner()) node.append(button('＋ เพิ่มสินค้ารายการแรก', 'button button-primary', openProductCreate));
  return node;
}
function toast(text) {
  clearTimeout(toastTimer);
  $('stockToast').textContent = text;
  $('stockToast').hidden = false;
  toastTimer = setTimeout(() => { $('stockToast').hidden = true; }, 4200);
}
function errorMessage(error) {
  return typeof error?.message === 'string' ? error.message.slice(0, 240) : 'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง';
}
function sheetError(message) {
  let node = $('sheetError');
  if (!node) {
    node = el('p', 'error-text');
    node.id = 'sheetError';
    node.setAttribute('role', 'alert');
    $('sheetFooter').prepend(node);
  }
  node.textContent = message;
}
function lockControls() {
  for (const node of document.querySelectorAll('[data-mutation]')) node.disabled = !canWrite();
  $('stockCheckPending').disabled = state.busy || state.restoring;
  $('stockRetryPending').disabled = state.busy || state.restoring;
  if (state.sheetKind === 'quantity') updateQuantityPreview();
  if (state.sheetKind === 'adjust') updateAdjustPreview();
}
function renderPending() {
  $('pendingTransaction').hidden = !active() || !pending();
  lockControls();
}

function renderVariantList(container, items, { lowOnly = false } = {}) {
  container.replaceChildren();
  const visible = items.filter(matches).filter((variant) => !lowOnly || stockStatus(variant).className);
  if (!visible.length) {
    container.append(empty(!items.length ? 'ร้านยังไม่มีสินค้า ให้เจ้าของร้านเพิ่มรายการแรกก่อนใช้งาน' : lowOnly ? 'ไม่มีรายการใกล้หมดหรือหมดที่ตรงกับการค้นหา' : 'ไม่พบสินค้าที่ตรงกับคำค้นหา', !items.length));
    return;
  }
  for (const variant of visible) {
    const card = button('', 'variant-card', () => openVariantDetail(variant.id));
    card.dataset.variantId = variant.id;
    card.dataset.testid = 'stock-variant';
    card.setAttribute('aria-label', `${variant.product_name} สี ${variant.color} ไซซ์ ${variant.size} คงเหลือ ${count(variant.stock_quantity)} ชิ้น`);
    const copy = el('span', 'variant-copy');
    copy.append(el('strong', '', variant.product_name), el('span', 'product-color', `สี ${variant.color}`), el('span', 'variant-meta', `ไซซ์ ${variant.size} · ${variant.sku}`));
    appendStatus(copy, variant);
    const number = el('span', 'stock-number', count(variant.stock_quantity, true));
    number.setAttribute('aria-hidden', 'true');
    card.append(copy, number);
    container.append(card);
  }
}
function groups() {
  const grouped = new Map();
  for (const variant of variants().filter(matches)) {
    const key = JSON.stringify([variant.product_id, variant.color]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(variant);
  }
  return [...grouped.values()];
}
function renderProducts(container, type) {
  container.replaceChildren();
  if (type === 'OUT' && !state.channel) return;
  const grouped = groups();
  if (!grouped.length) {
    container.append(empty(variants().length ? 'ไม่พบสินค้าที่ตรงกับคำค้นหา' : 'ร้านยังไม่มีสินค้า ให้เจ้าของร้านเพิ่มสินค้า สี และไซซ์ก่อนใช้งาน', !variants().length));
    return;
  }
  grouped.forEach((group, index) => {
    const first = group[0];
    const total = group.reduce((sum, variant) => sum + (integer(variant.stock_quantity) ?? 0), 0);
    const card = el('article', 'product-card');
    const main = button('', 'product-select', () => openSizes(group.map((variant) => variant.id), type));
    main.dataset.productGroup = String(index);
    main.dataset.testid = type === 'OUT' ? 'sell-product' : 'receive-product';
    main.disabled = type === 'OUT' && total === 0;
    main.setAttribute('aria-label', `${first.product_name} สี ${first.color} ${group.length} ไซซ์ คงเหลือรวม ${total} ชิ้น`);
    const copy = el('span', 'variant-copy');
    copy.append(el('strong', '', first.product_name), el('span', 'product-color', `สี ${first.color}`), el('span', 'variant-meta', `${group.map((variant) => variant.size).join(' · ')} · ${first.sku}`));
    const status = total === 0 ? { ...first, stock_quantity: 0 } : group.find((variant) => integer(variant.stock_quantity) > 0) || first;
    appendStatus(copy, status);
    main.append(copy, el('span', 'stock-number', count(total, true)));
    const shortcuts = el('div', 'product-quick-sizes');
    shortcuts.setAttribute('aria-label', 'เลือกไซซ์เพื่อทำรายการทันที');
    for (const variant of group) {
      const shortcut = button(variant.size, 'quick-size-button', () => openQuantity(variant.id, type));
      shortcut.dataset.testid = 'quick-variant';
      shortcut.dataset.variantId = variant.id;
      shortcut.disabled = type === 'OUT' && integer(variant.stock_quantity) === 0;
      shortcut.setAttribute('aria-label', `ไซซ์ ${variant.size} คงเหลือ ${count(variant.stock_quantity)} ชิ้น`);
      shortcuts.append(shortcut);
    }
    card.append(main, shortcuts);
    container.append(card);
  });
}
function renderChannelSummary() {
  const container = $('channelSummary');
  container.replaceChildren();
  const totals = new Map((state.snapshot?.summary?.channels || []).map((row) => [row.sales_channel, row.quantity]));
  for (const [channel, name] of Object.entries(CHANNELS)) {
    const card = el('div', 'channel-total');
    card.append(el('span', 'muted', name), el('strong', '', count(totals.has(channel) ? totals.get(channel) : null)));
    container.append(card);
  }
}
function renderInventory() {
  if (!active()) return;
  const summary = state.snapshot?.summary;
  $('metricSoldToday').textContent = count(summary?.sold_today);
  $('metricTotalStock').textContent = count(summary?.total_stock);
  $('metricLowStock').textContent = count(summary?.low_stock_count);
  $('metricOutStock').textContent = count(summary?.out_of_stock_count);
  renderVariantList($('lowStockList'), variants(), { lowOnly: true });
  $('homeSearchResultsSection').hidden = !state.query;
  if (state.query) renderVariantList($('homeSearchResults'), variants()); else $('homeSearchResults').replaceChildren();
  renderVariantList($('checkList'), variants());
  renderProducts($('sellProducts'), 'OUT');
  renderProducts($('receiveProducts'), 'IN');
  renderChannelSummary();
  $('addVariantButton').hidden = !owner();
  $('teamButton').hidden = !owner();
  renderPending();
}
function clearPrivateInventory() {
  for (const id of ['lowStockList', 'homeSearchResults', 'checkList', 'sellProducts', 'receiveProducts', 'historyList', 'channelSummary']) $(id).replaceChildren();
  for (const id of ['metricSoldToday', 'metricTotalStock', 'metricLowStock', 'metricOutStock']) $(id).textContent = '—';
  closeSheet();
}
function renderGate() {
  const user = state.snapshot?.user;
  const permitted = active();
  $('controlWelcome').hidden = permitted;
  $('authorizedContent').hidden = !permitted;
  $('stockNavigation').hidden = !permitted;
  $('appGate').hidden = permitted;
  $('pendingTransaction').hidden = !permitted || !pending();
  $('teamButton').hidden = !owner();
  $('addVariantButton').hidden = !owner();
  $('currentMember').textContent = user?.display_name ? `${user.display_name} · ${owner() ? 'เจ้าของร้าน' : user.role === 'STAFF' ? 'ทีมงาน' : 'รอสิทธิ์'}` : '';
  if (permitted) return;
  clearPrivateInventory();
  $('joinButton').hidden = user?.role !== 'NONE';
  $('loginButton').hidden = Boolean(user?.line_user_id);
  if (user?.role === 'PENDING') {
    $('gateTitle').textContent = 'รอเจ้าของร้านอนุมัติ';
    $('gateMessage').textContent = 'ได้รับคำขอสิทธิ์แล้ว เมื่อเจ้าของร้านอนุมัติให้กดดึงข้อมูลอีกครั้ง';
  } else if (user?.role === 'NONE') {
    $('gateTitle').textContent = 'ขอสิทธิ์ใช้งานร้าน';
    $('gateMessage').textContent = 'เชื่อมต่อบัญชี LINE แล้ว ขออนุมัติจากเจ้าของร้านเพื่อดูและทำรายการสต๊อก';
  } else {
    $('gateTitle').textContent = 'เข้าใช้งานร้านด้วย LINE';
    $('gateMessage').textContent = 'ใช้บัญชี LINE เดิมเพื่อเข้าถึงสต๊อกของร้าน';
  }
}
function acceptSnapshot(snapshot) {
  state.snapshot = snapshot;
  if (active()) state.connected = true;
  renderGate();
  if (!active()) return;
  renderInventory();
  if (state.sheetKind === 'quantity') updateQuantityPreview();
  if (state.sheetKind === 'adjust') updateAdjustPreview();
  if (state.sheetKind === 'sizes') updateSizes();
  if (state.sheetKind === 'variant-detail') updateVariantDetail();
  if (state.screen === 'history' && client) void loadHistory();
}
function status(message, meta = {}) {
  $('connectionStatus').textContent = message;
  $('connectionStatus').dataset.state = meta.state || '';
  if (meta.state === 'connected') state.connected = true;
  if (['disconnected', 'login_required'].includes(meta.state)) {
    state.connected = false;
    if (meta.state === 'login_required') {
      state.snapshot = null;
      renderGate();
    }
  }
  lockControls();
}
function setScreen(screen) {
  if (!active() || !['home', 'sell', 'receive', 'check', 'history'].includes(screen)) return;
  state.screen = screen;
  for (const node of document.querySelectorAll('[data-stock-screen]')) node.hidden = node.dataset.stockScreen !== screen;
  for (const node of document.querySelectorAll('.nav-button[data-screen]')) {
    const selected = node.dataset.screen === screen;
    node.classList.toggle('nav-active', selected);
    if (selected) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
  }
  $('stockSearchSection').hidden = screen === 'history';
  if (screen === 'history') void loadHistory();
  if (screen === 'sell') renderSelectedChannel();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function renderSelectedChannel() {
  for (const node of document.querySelectorAll('[data-channel]')) {
    const selected = node.dataset.channel === state.channel;
    node.classList.toggle('channel-selected', selected);
    node.setAttribute('aria-pressed', String(selected));
  }
  $('channelPicker').hidden = Boolean(state.channel);
  $('changeChannel').hidden = !state.channel;
  $('sellSelectionTitle').textContent = state.channel ? `เลือกสินค้า · ${CHANNELS[state.channel]}` : 'เลือกช่องทางก่อนเริ่มขาย';
  renderProducts($('sellProducts'), 'OUT');
}

function openSheet(title, kind, context = null) {
  const dialog = $('stockSheet');
  if (!dialog.open) state.previousFocus = document.activeElement;
  state.sheetVersion += 1;
  state.sheetKind = kind;
  state.sheetContext = context;
  $('sheetTitle').textContent = title;
  $('sheetBody').replaceChildren();
  $('sheetFooter').replaceChildren();
  if (!dialog.open) dialog.showModal();
}
function closeSheet() {
  state.sheetVersion += 1;
  state.sheetKind = null;
  state.sheetContext = null;
  if ($('stockSheet').open) $('stockSheet').close();
  $('sheetBody').replaceChildren();
  $('sheetFooter').replaceChildren();
}
function openSizes(ids, type) {
  if (!active()) return;
  const group = ids.map(variantById).filter(Boolean);
  if (!group.length || (type === 'OUT' && !state.channel)) return;
  if (group.length === 1) { openQuantity(group[0].id, type); return; }
  openSheet(`${group[0].product_name} · สี ${group[0].color}`, 'sizes', { ids, type });
  $('sheetBody').append(el('p', 'muted', type === 'OUT' ? `ขายผ่าน ${CHANNELS[state.channel]} · เลือกไซซ์` : 'เลือกไซซ์ที่รับสินค้าเข้า'));
  const grid = el('div', 'size-grid');
  for (const variant of group) {
    const size = button('', 'size-button', () => openQuantity(variant.id, type));
    size.dataset.variantId = variant.id;
    size.dataset.testid = 'variant-size';
    size.disabled = type === 'OUT' && integer(variant.stock_quantity) === 0;
    size.append(el('strong', '', variant.size), el('span', 'muted', `เหลือ ${count(variant.stock_quantity)} ชิ้น`));
    appendStatus(size, variant);
    grid.append(size);
  }
  $('sheetBody').append(grid);
  grid.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}
function updateSizes() {
  if (state.sheetKind !== 'sizes') return;
  for (const size of $('sheetBody').querySelectorAll('button[data-variant-id]')) {
    const variant = variantById(size.dataset.variantId);
    size.disabled = !variant || (state.sheetContext.type === 'OUT' && integer(variant.stock_quantity) === 0);
    const line = size.querySelector('.muted');
    if (line) line.textContent = variant ? `เหลือ ${count(variant.stock_quantity)} ชิ้น` : 'ไม่พบสินค้าในรายการล่าสุด';
    const badge = size.querySelector('.stock-badge');
    if (badge && variant) {
      const current = stockStatus(variant);
      badge.className = `stock-badge ${current.className}`;
      badge.textContent = current.label;
      badge.setAttribute('aria-label', current.thai);
    }
  }
}
function openQuantity(id, type) {
  const variant = variantById(id);
  if (!variant || !active() || (type === 'OUT' && (!state.channel || integer(variant.stock_quantity) === 0))) return;
  openSheet(type === 'OUT' ? 'ยืนยันขายสินค้า' : 'รับสินค้าเข้า', 'quantity', { id, type });
  const body = $('sheetBody');
  body.append(el('h3', '', variant.product_name), el('p', 'variant-meta', `สี ${variant.color} · ไซซ์ ${variant.size} · ${variant.sku}`));
  if (type === 'OUT') body.append(el('p', 'eyebrow', `ช่องทาง · ${CHANNELS[state.channel]}`));
  const controls = el('div', 'quantity-control');
  const input = el('input', 'quantity-number');
  input.id = 'saleQuantity';
  input.type = 'number';
  input.inputMode = 'numeric';
  input.value = '1';
  input.min = '1';
  input.step = '1';
  input.setAttribute('aria-label', type === 'OUT' ? 'จำนวนที่ขาย' : 'จำนวนที่รับเข้า');
  const change = (delta) => {
    const current = integer(input.value, 1) ?? 1;
    const limit = type === 'OUT' ? integer(variantById(id)?.stock_quantity) ?? 0 : MAX_QUANTITY;
    input.value = String(Math.max(1, Math.min(limit, current + delta)));
    updateQuantityPreview();
  };
  const minus = button('−', 'quantity-button', () => change(-1), 'qtyMinus');
  minus.setAttribute('aria-label', 'ลดจำนวน 1 ชิ้น');
  const plus = button('＋', 'quantity-button', () => change(1), 'qtyPlus');
  plus.setAttribute('aria-label', 'เพิ่มจำนวน 1 ชิ้น');
  controls.append(minus, input, plus);
  input.addEventListener('input', updateQuantityPreview);
  body.append(controls, el('p', 'muted', 'จำนวนชิ้น'));
  const preview = el('div', 'stock-preview');
  for (const [label, previewId] of [['คงเหลือจากข้อมูลล่าสุด', 'stockNow'], [type === 'OUT' ? 'หลังขาย · คาดการณ์' : 'หลังรับเข้า · คาดการณ์', 'stockAfter']]) {
    const row = el('div', 'preview-row');
    const value = el('strong', '', '—');
    value.id = previewId;
    row.append(el('span', 'muted', label), value);
    preview.append(row);
  }
  body.append(preview, el('p', 'muted', 'ยอดจริงจะยืนยันจากระบบเมื่อบันทึกสำเร็จ'));
  if (type === 'OUT' && state.channel !== 'STORE') {
    const details = el('details', 'details-fields');
    details.append(el('summary', '', 'เพิ่มรายละเอียดออเดอร์ (ไม่บังคับ)'));
    details.append(field('orderReference', 'เลขออเดอร์ / อ้างอิง', { maxLength: 100, autocomplete: 'off' }).wrap,
      field('customerName', 'ชื่อลูกค้า', { maxLength: 100, autocomplete: 'off' }).wrap,
      field('transactionNote', 'หมายเหตุ', { multiline: true, maxLength: 1000 }).wrap);
    body.append(details);
  } else if (type === 'IN') {
    const details = el('details', 'details-fields');
    details.append(el('summary', '', 'เพิ่มหมายเหตุ (ไม่บังคับ)'), field('transactionNote', 'หมายเหตุ', { multiline: true, maxLength: 1000 }).wrap);
    body.append(details);
  }
  const confirm = button('', 'button button-primary', submitTransaction, 'confirmSale');
  confirm.dataset.mutation = 'transaction';
  $('sheetFooter').append(confirm);
  updateQuantityPreview();
  confirm.focus({ preventScroll: true });
}
function updateQuantityPreview() {
  if (state.sheetKind !== 'quantity' || !$('saleQuantity')) return;
  const { id, type } = state.sheetContext;
  const variant = variantById(id);
  const stock = integer(variant?.stock_quantity);
  const quantity = $('saleQuantity').value.trim() ? integer($('saleQuantity').value, 1) : null;
  const valid = stock !== null && quantity !== null && (type !== 'OUT' || quantity <= stock) && (type !== 'IN' || stock + quantity <= MAX_QUANTITY);
  $('stockNow').textContent = `${count(stock)} ชิ้น`;
  $('stockAfter').textContent = valid ? `${count(type === 'OUT' ? stock - quantity : stock + quantity)} ชิ้น` : '—';
  $('saleQuantity').max = String(type === 'OUT' ? stock ?? 0 : MAX_QUANTITY);
  $('qtyMinus').disabled = state.busy || quantity === null || quantity <= 1;
  $('qtyPlus').disabled = state.busy || quantity === null || quantity >= (type === 'OUT' ? stock ?? 0 : MAX_QUANTITY);
  $('saleQuantity').disabled = state.busy;
  $('confirmSale').textContent = state.busy ? 'กำลังยืนยันกับระบบ…' : `${type === 'OUT' ? 'ยืนยันขาย' : 'ยืนยันรับเข้า'} ${quantity ?? '—'} ชิ้น`;
  $('confirmSale').disabled = !valid || !canWrite();
  if (!variant) sheetError('ไม่พบสินค้านี้ในรายการล่าสุด กรุณาปิดแล้วโหลดข้อมูลอีกครั้ง');
}
async function submitTransaction() {
  if (!canWrite() || state.sheetKind !== 'quantity') return;
  const { id, type } = state.sheetContext;
  const quantity = integer($('saleQuantity').value, 1);
  const variant = variantById(id);
  if (quantity === null || !variant || (type === 'OUT' && quantity > integer(variant.stock_quantity))) return;
  const fields = { variant_id: id, type, quantity };
  if (type === 'OUT') fields.sales_channel = state.channel;
  for (const [inputId, key] of [['orderReference', 'order_reference'], ['customerName', 'customer_name'], ['transactionNote', 'note']]) {
    const value = $(inputId)?.value.trim();
    if (value) fields[key] = value;
  }
  const version = state.sheetVersion;
  state.busy = true;
  lockControls();
  try {
    const result = await client.mutate('transaction', fields);
    toast(type === 'OUT' ? '✓ ขายเรียบร้อย' : '✓ รับสินค้าเข้าเรียบร้อย');
    if ($('stockSheet').open && state.sheetVersion === version) showSuccess(result, type);
  } catch (error) {
    const text = pending() ? 'ยังยืนยันผลรายการไม่ได้ ตรวจสอบรายการเดิมก่อนส่งซ้ำ' : errorMessage(error);
    if ($('stockSheet').open && state.sheetVersion === version) sheetError(text); else toast(text);
  } finally {
    state.busy = false;
    renderPending();
  }
}
function showSuccess(result, type) {
  if (!active()) return;
  const variant = result?.variant;
  const transaction = result?.transaction;
  openSheet(type === 'OUT' ? 'ขายเรียบร้อย' : type === 'IN' ? 'รับสินค้าเข้าเรียบร้อย' : 'บันทึกยอดนับจริงแล้ว', 'success');
  const panel = el('div', 'success-panel');
  panel.id = 'saleSuccess';
  panel.append(el('span', 'success-mark', '✓'), el('h3', '', variant?.product_name || transaction?.product_name || 'บันทึกรายการแล้ว'));
  if (variant?.color || transaction?.color) panel.append(el('p', 'variant-meta', `สี ${variant?.color || transaction.color} · ไซซ์ ${variant?.size || transaction?.size || ''}`));
  const remaining = integer(variant?.stock_quantity) ?? integer(transaction?.after_quantity);
  const number = el('strong', 'stock-number', count(remaining, true));
  number.id = 'remainingStock';
  panel.append(el('p', 'muted', 'คงเหลือที่ระบบยืนยัน · ชิ้น'), number);
  if (remaining === null) panel.append(el('p', 'muted', 'ดึงข้อมูลล่าสุดเพื่อตรวจยอดคงเหลือ'));
  if (result?.replayed) panel.append(el('p', 'muted', 'เป็นผลของรายการเดิม ระบบไม่ได้ทำรายการซ้ำ'));
  $('sheetBody').append(panel);
  if (['OUT', 'IN'].includes(type)) $('sheetFooter').append(button(type === 'OUT' ? 'ขายต่อ' : 'รับเข้าต่อ', 'button button-primary', () => {
    closeSheet(); setScreen(type === 'OUT' ? 'sell' : 'receive');
  }, 'sellContinue'));
  $('sheetFooter').append(button('กลับหน้าแรก', 'button', () => { closeSheet(); setScreen('home'); }, 'successHome'));
}

function openVariantDetail(id) {
  const variant = variantById(id);
  if (!variant || !active()) return;
  openSheet(variant.product_name, 'variant-detail', { id });
  const body = $('sheetBody');
  const number = el('strong', 'stock-number', count(variant.stock_quantity, true));
  number.id = 'detailStockQuantity';
  body.append(el('p', 'variant-meta', `สี ${variant.color} · ไซซ์ ${variant.size} · ${variant.sku}`), number, el('p', 'muted', 'คงเหลือ · ชิ้น'));
  appendStatus(body, variant);
  $('sheetFooter').append(button('รับสินค้าเข้า', 'button button-primary', () => openQuantity(id, 'IN')));
  if (integer(variant.stock_quantity) > 0) {
    const sell = button('ขายสินค้านี้', 'button', () => {
    if (state.channel) openQuantity(id, 'OUT');
    else { closeSheet(); setScreen('sell'); toast('เลือกช่องทางขายก่อน แล้วเลือกสินค้าและไซซ์'); }
    });
    sell.dataset.variantSell = id;
    $('sheetFooter').append(sell);
  }
  if (owner()) $('sheetFooter').append(button('ปรับเป็นยอดนับจริง', 'button button-quiet', () => openAdjust(id)));
}
function updateVariantDetail() {
  if (state.sheetKind !== 'variant-detail') return;
  const variant = variantById(state.sheetContext.id);
  $('detailStockQuantity').textContent = count(variant?.stock_quantity, true);
  const badge = $('sheetBody').querySelector('.stock-badge');
  if (variant && badge) {
    const current = stockStatus(variant);
    badge.className = `stock-badge ${current.className}`;
    badge.textContent = current.label;
    badge.setAttribute('aria-label', current.thai);
  }
  const sell = $('sheetFooter').querySelector('[data-variant-sell]');
  if (sell) sell.hidden = !variant || integer(variant.stock_quantity) === 0;
}
function openAdjust(id) {
  const variant = variantById(id);
  if (!owner() || !variant) return;
  const baseline = { id, revision: variant.revision, stock: variant.stock_quantity };
  openSheet('ปรับเป็นยอดนับจริง', 'adjust', baseline);
  $('sheetBody').append(el('h3', '', variant.product_name), el('p', 'variant-meta', `สี ${variant.color} · ไซซ์ ${variant.size}`), el('p', 'muted', `ยอดก่อนเริ่มนับ ${count(baseline.stock)} ชิ้น`));
  const quantity = field('countedQuantity', 'จำนวนที่นับได้จริง · ชิ้น', { type: 'number', min: 0, max: MAX_QUANTITY, step: 1, placeholder: 'กรอกจำนวนที่นับได้จริง', required: true });
  $('sheetBody').append(quantity.wrap, field('adjustNote', 'เหตุผล / หมายเหตุ (ไม่บังคับ)', { multiline: true, maxLength: 1000 }).wrap);
  const warning = el('p', 'error-text');
  warning.id = 'adjustWarning';
  warning.setAttribute('role', 'status');
  $('sheetBody').append(warning);
  const confirm = button('ยืนยันยอดนับจริง', 'button button-primary', submitAdjust, 'confirmAdjust');
  confirm.dataset.mutation = 'adjust';
  $('sheetFooter').append(confirm);
  quantity.input.addEventListener('input', updateAdjustPreview);
  updateAdjustPreview();
}
function updateAdjustPreview() {
  if (state.sheetKind !== 'adjust' || !$('countedQuantity')) return;
  const context = state.sheetContext;
  const latest = variantById(context.id);
  const changed = !latest || latest.revision !== context.revision;
  $('adjustWarning').textContent = changed ? 'ยอดสินค้าเปลี่ยนระหว่างนับ กรุณาปิดหน้าต่างแล้วเริ่มนับจากข้อมูลล่าสุดอีกครั้ง' : '';
  const target = $('countedQuantity').value.trim() ? integer($('countedQuantity').value) : null;
  $('confirmAdjust').disabled = !owner() || !canWrite() || target === null || changed;
  $('countedQuantity').disabled = state.busy;
}
async function submitAdjust() {
  if (!owner() || !canWrite() || state.sheetKind !== 'adjust') return;
  const { id, revision } = state.sheetContext;
  const target = $('countedQuantity').value.trim() ? integer($('countedQuantity').value) : null;
  if (target === null || variantById(id)?.revision !== revision) return;
  const fields = { variant_id: id, type: 'ADJUST', stock_quantity: target, expected_revision: revision };
  const note = $('adjustNote').value.trim();
  if (note) fields.note = note;
  const version = state.sheetVersion;
  state.busy = true; lockControls();
  try {
    const result = await client.mutate('transaction', fields);
    toast('✓ บันทึกยอดนับจริงแล้ว');
    if ($('stockSheet').open && state.sheetVersion === version) showSuccess(result, 'ADJUST');
  } catch (error) {
    if ($('stockSheet').open && state.sheetVersion === version) sheetError(pending() ? 'ยังยืนยันผลไม่ได้ กรุณาตรวจสอบรายการเดิม' : errorMessage(error));
    else toast(errorMessage(error));
  } finally { state.busy = false; renderPending(); }
}
function openProductCreate() {
  if (!owner()) return;
  openSheet('เพิ่มสินค้า / สี / ไซซ์', 'product-create');
  const form = el('form', 'field-grid');
  form.id = 'newVariantForm';
  for (const item of [
    field('newProductName', 'ชื่อสินค้า', { maxLength: 160, required: true }),
    field('newProductSku', 'SKU / รหัสสินค้า', { maxLength: 80, required: true }),
    field('newProductColor', 'สี', { maxLength: 80, required: true }),
    field('newProductSize', 'ไซซ์', { maxLength: 40, required: true }),
    field('newInitialQuantity', 'จำนวนเริ่มต้นที่มีจริง · ชิ้น', { type: 'number', min: 0, max: MAX_QUANTITY, step: 1, value: 0, required: true }),
    field('newLowThreshold', 'แจ้งเตือนใกล้หมดเมื่อเหลือ · ชิ้น', { type: 'number', min: 0, max: 1000000, step: 1, value: integer(state.snapshot?.shop?.default_threshold) ?? 0 }),
  ]) form.append(item.wrap);
  $('sheetBody').append(form, el('p', 'muted', 'ใช้ชื่อสินค้าเดิมเมื่อเพิ่มสีหรือไซซ์ และใช้ SKU ใหม่ที่ไม่ซ้ำสำหรับแต่ละแบบ'));
  const confirm = button('ยืนยันเพิ่มสินค้า', 'button button-primary', submitProduct, 'confirmProductCreate');
  confirm.dataset.mutation = 'product-create';
  $('sheetFooter').append(confirm);
  form.addEventListener('submit', (event) => { event.preventDefault(); void submitProduct(); });
  lockControls();
}
async function submitProduct() {
  if (!owner() || !canWrite() || state.sheetKind !== 'product-create') return;
  if (!$('newVariantForm').reportValidity()) return;
  const initial = integer($('newInitialQuantity').value);
  const threshold = integer($('newLowThreshold').value);
  const fields = { name: $('newProductName').value.trim(), sku: $('newProductSku').value.trim(), color: $('newProductColor').value.trim(), size: $('newProductSize').value.trim(), initial_quantity: initial, threshold };
  if (!fields.name || !fields.sku || !fields.color || !fields.size || initial === null || threshold === null) { sheetError('กรอกชื่อ รหัส สี ไซซ์ และจำนวนเต็มตั้งแต่ 0 ให้ครบ'); return; }
  const version = state.sheetVersion;
  state.busy = true; lockControls();
  try {
    await client.mutate('product_create', fields);
    toast('✓ เพิ่มสินค้าเรียบร้อย');
    if ($('stockSheet').open && state.sheetVersion === version) { closeSheet(); setScreen('check'); }
  } catch (error) {
    if ($('stockSheet').open && state.sheetVersion === version) sheetError(pending() ? 'ยังยืนยันผลไม่ได้ กรุณาตรวจสอบรายการเดิม' : errorMessage(error)); else toast(errorMessage(error));
  } finally { state.busy = false; renderPending(); }
}

async function loadHistory() {
  if (!active() || !client) return;
  const sequence = ++state.historySequence;
  const container = $('historyList');
  container.replaceChildren(el('p', 'muted', 'กำลังโหลดประวัติ…'));
  const fields = { days: state.days };
  if (state.historyChannel) fields.sales_channel = state.historyChannel;
  try {
    const result = await client.request('history', fields);
    if (!active() || sequence !== state.historySequence) return;
    const rows = Array.isArray(result?.transactions) ? result.transactions : [];
    container.replaceChildren();
    if (result.truncated) container.append(el('p', 'muted', 'แสดง 500 รายการล่าสุดในช่วงเวลาและช่องทางที่เลือก'));
    if (!rows.length) { container.append(empty('ยังไม่มีรายการในช่วงเวลาและช่องทางที่เลือก')); return; }
    for (const row of rows) {
      const card = el('article', 'history-card');
      card.dataset.testid = 'history-row';
      const date = new Date(row.created_at);
      const time = Number.isNaN(date.valueOf()) ? 'ไม่ระบุเวลา' : date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
      card.append(el('p', 'history-meta', time), el('h3', '', row.product_name), el('p', 'variant-meta', `สี ${row.color} · ไซซ์ ${row.size} · ${row.sku}`));
      const action = row.type === 'OUT' ? 'ขาย' : row.type === 'IN' ? 'รับเข้า' : 'ปรับยอดนับจริง';
      const channel = row.sales_channel ? ` · ${CHANNELS[row.sales_channel] || row.sales_channel}` : '';
      card.append(el('p', '', `${action}${row.type === 'ADJUST' ? '' : ` ${count(row.quantity)} ชิ้น`}${channel}`), el('p', 'change-line', `${count(row.before_quantity)} → ${count(row.after_quantity)} ชิ้น`), el('p', 'history-meta', `โดย ${row.display_name || row.line_user_id || 'ผู้ร่วมร้าน'}`));
      if (row.order_reference) card.append(el('p', 'history-meta', `อ้างอิง ${row.order_reference}`));
      if (row.customer_name) card.append(el('p', 'history-meta', `ลูกค้า ${row.customer_name}`));
      if (row.note) card.append(el('p', 'history-meta', row.note));
      container.append(card);
    }
  } catch (error) {
    if (sequence === state.historySequence && active()) container.replaceChildren(el('p', 'error-text', errorMessage(error)));
  }
}
function openJoin() {
  if (state.snapshot?.user?.role !== 'NONE') return;
  openSheet('ขอสิทธิ์ใช้งานร้าน', 'join');
  $('sheetBody').append(el('h3', '', state.snapshot.user.display_name || 'บัญชี LINE ของคุณ'), el('p', 'muted', 'เจ้าของร้านจะเห็นคำขอจากบัญชี LINE นี้และอนุมัติสิทธิ์ทีมงาน ไม่มีการสมัครบัญชีใหม่'));
  $('sheetFooter').append(button('ยืนยันขอสิทธิ์', 'button button-primary', async () => {
    if (state.busy || state.snapshot?.user?.role !== 'NONE') return;
    state.busy = true;
    const confirm = $('confirmJoin');
    if (confirm) confirm.disabled = true;
    try {
      await client.request('join');
      await client.refresh();
      closeSheet();
      toast('ส่งคำขอแล้ว รอเจ้าของร้านอนุมัติ');
    } catch (error) { sheetError(errorMessage(error)); }
    finally { state.busy = false; lockControls(); }
  }, 'confirmJoin'));
}
async function openMembers() {
  if (!owner()) return;
  openSheet('ทีมงานในร้าน', 'members');
  const version = state.sheetVersion;
  $('sheetBody').append(el('p', 'muted', 'กำลังโหลดสมาชิก…'));
  try {
    const result = await client.request('members');
    if (!owner() || state.sheetVersion !== version || !$('stockSheet').open) return;
    $('sheetBody').replaceChildren();
    const members = Array.isArray(result?.members) ? result.members : [];
    if (!members.length) { $('sheetBody').append(empty('ยังไม่มีคำขอหรือสมาชิกทีมงาน')); return; }
    for (const member of members) {
      const card = el('article', 'member-card');
      card.append(el('h3', '', member.display_name || member.line_user_id), el('p', 'muted', member.role === 'OWNER' ? 'เจ้าของร้าน' : member.status === 'ACTIVE' ? 'ทีมงาน · ใช้งานได้' : member.status === 'REVOKED' ? 'ระงับสิทธิ์แล้ว' : 'รออนุมัติ'));
      if (member.role !== 'OWNER' && member.line_user_id !== state.snapshot.user.line_user_id) {
        const actions = el('div', 'member-actions');
        const status = member.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
        const action = button(status === 'ACTIVE' ? 'อนุมัติสิทธิ์ทีมงาน' : 'ระงับสิทธิ์', status === 'ACTIVE' ? 'button button-primary' : 'button button-danger', () => openMemberConfirmation(member, status));
        action.dataset.memberId = member.line_user_id;
        action.dataset.memberStatus = status;
        actions.append(action); card.append(actions);
      }
      $('sheetBody').append(card);
    }
  } catch (error) { if (state.sheetVersion === version) $('sheetBody').replaceChildren(el('p', 'error-text', errorMessage(error))); }
}
function openMemberConfirmation(member, status) {
  if (!owner()) return;
  openSheet(status === 'ACTIVE' ? 'อนุมัติสิทธิ์ทีมงาน' : 'ระงับสิทธิ์ทีมงาน', 'member-confirm');
  $('sheetBody').append(el('h3', '', member.display_name || member.line_user_id), el('p', 'muted', status === 'ACTIVE' ? 'อนุญาตให้ดูสต๊อก ขาย และรับสินค้าเข้าในร้านนี้' : 'บัญชีนี้จะไม่สามารถดูหรือทำรายการสต๊อกของร้านได้'));
  const confirm = button(status === 'ACTIVE' ? 'ยืนยันอนุมัติ' : 'ยืนยันระงับสิทธิ์', status === 'ACTIVE' ? 'button button-primary' : 'button button-danger', async () => {
    if (!owner() || !canWrite()) return;
    const version = state.sheetVersion;
    state.busy = true; lockControls();
    try {
      await client.mutate('member_update', { member_line_user_id: member.line_user_id, status, role: 'STAFF' });
      toast(status === 'ACTIVE' ? '✓ อนุมัติสิทธิ์แล้ว' : '✓ ระงับสิทธิ์แล้ว');
      if ($('stockSheet').open && state.sheetVersion === version) void openMembers();
    } catch (error) { if (state.sheetVersion === version) sheetError(errorMessage(error)); else toast(errorMessage(error)); }
    finally { state.busy = false; renderPending(); }
  }, 'confirmMemberUpdate');
  confirm.dataset.mutation = 'member-update';
  $('sheetFooter').append(confirm);
  lockControls();
}

async function checkPending({ retry = false } = {}) {
  if (!active() || state.busy || state.restoring || !pending()) return;
  const entry = pending();
  state.restoring = true; renderPending();
  try {
    if (retry) {
      const result = await client.retryPending();
      if (!active()) return;
      toast(entry.action === 'transaction' && entry.fields.type === 'OUT' ? '✓ ขายเรียบร้อย' : '✓ ยืนยันรายการเดิมแล้ว');
      if (entry.action === 'transaction') showSuccess(result, entry.fields.type);
    } else {
      const result = await client.restorePending();
      if (!active()) return;
      if (result.found) {
        toast('✓ ตรวจพบรายการเดิมในระบบแล้ว');
        if (result.result && entry.action === 'transaction') showSuccess(result.result, entry.fields.type);
      } else toast('ยังไม่พบผลรายการเดิม คุณลองส่งรายการเดิมอีกรอบได้');
    }
  } catch (error) { toast(errorMessage(error)); }
  finally { state.restoring = false; renderPending(); }
}
async function connect(startLogin = false) {
  $('loginButton').disabled = true;
  try {
    const snapshot = await client.connect({ startLogin });
    if (snapshot && state.snapshot !== snapshot) acceptSnapshot(snapshot);
    if (!snapshot) renderGate();
    const key = active() ? `${state.snapshot.shop?.id}:${state.snapshot.user.line_user_id}` : null;
    if (key && key !== state.restoreKey) {
      state.restoreKey = key;
      if (pending()) await checkPending();
    }
  } catch (error) {
    status(errorMessage(error), { state: 'error' });
    if (!active()) {
      renderGate();
      $('gateMessage').textContent = errorMessage(error);
      $('loginButton').hidden = false;
    }
  } finally { $('loginButton').disabled = false; }
}

for (const node of document.querySelectorAll('[data-screen]')) node.addEventListener('click', () => setScreen(node.dataset.screen));
for (const node of document.querySelectorAll('[data-channel]')) node.addEventListener('click', () => {
  if (!active()) return;
  state.channel = node.dataset.channel;
  renderSelectedChannel();
});
$('changeChannel').addEventListener('click', () => { state.channel = null; renderSelectedChannel(); });
$('stockSearch').addEventListener('input', () => { state.query = $('stockSearch').value.trim(); renderInventory(); });
for (const node of $('historyDays').querySelectorAll('[data-days]')) node.addEventListener('click', () => {
  state.days = Number(node.dataset.days);
  for (const item of $('historyDays').querySelectorAll('[data-days]')) item.setAttribute('aria-pressed', String(item === node));
  void loadHistory();
});
$('historyChannel').addEventListener('change', () => { state.historyChannel = $('historyChannel').value; void loadHistory(); });
$('addVariantButton').addEventListener('click', openProductCreate);
$('teamButton').addEventListener('click', openMembers);
$('joinButton').addEventListener('click', openJoin);
$('loginButton').addEventListener('click', () => { void connect(true); });
$('refreshStock').addEventListener('click', async () => {
  $('refreshStock').disabled = true;
  try {
    if (active()) await client.refresh(); else await connect(false);
  } catch (error) { toast(errorMessage(error)); }
  finally { $('refreshStock').disabled = false; }
});
$('stockCheckPending').addEventListener('click', () => { void checkPending(); });
$('stockRetryPending').addEventListener('click', () => { void checkPending({ retry: true }); });
$('sheetClose').addEventListener('click', closeSheet);
$('stockSheet').addEventListener('cancel', (event) => { event.preventDefault(); closeSheet(); });
$('stockSheet').addEventListener('close', () => {
  if ($('stockSheet').open) return;
  const focusTarget = state.previousFocus?.isConnected ? state.previousFocus : document.querySelector('.nav-button[aria-current="page"]') || $('refreshStock');
  focusTarget?.focus({ preventScroll: true });
  state.previousFocus = null;
});
window.addEventListener('pagehide', (event) => { if (!event.persisted) client?.disconnect(); });
client = createStockClient({ onChange: acceptSnapshot, onStatus: status });
void connect(false);
