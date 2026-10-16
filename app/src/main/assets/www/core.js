/* HomenS.AI — Lädle Mini Local 0.3.0. Pure domain, shared by Android and browser tests. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./catalog-data.js') : root.LadleCatalog);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LadleDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const VERSION = 3;
  const LIMIT = Object.freeze({ grams: 10000000, price: 10000000, events: 1000, customers: 20000, orders: 20000, items: 300, catalog: 2000, lines: 300, bytes: 8 * 1024 * 1024 });
  const SKINS = ['light', 'dark', 'paper', 'compact'];
  const LANGS = ['de', 'ru', 'en'];
  const UNITS = ['kg', 'piece', 'pack', 'litre'];
  const unitOf = item => item?.unit || 'kg';
  const wholeUnit = unit => unit === 'piece' || unit === 'pack';
  function quantity(value, unit = 'kg', allowZero = false) { need(UNITS.includes(unit), 'unit'); const n=grams(value,allowZero); need(!wholeUnit(unit) || n % 1000 === 0, 'wholeQuantity'); return n; }
  function unitValid(item) { const u=unitOf(item); need(UNITS.includes(u),'unit'); if (item.grams !== undefined) need(!wholeUnit(u) || item.grams % 1000 === 0,'wholeQuantity'); }
  function photoOK(photo) { return photo === undefined || photo === null || (typeof photo === 'string' && photo.length <= 180000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)); }
  class DomainError extends Error {
    constructor(code, detail = '') { super(code); this.name = 'DomainError'; this.code = code; this.detail = detail; }
  }
  const fail = (code, detail) => { throw new DomainError(code, detail); };
  const need = (condition, code, detail) => { if (!condition) fail(code, detail); };
  const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
  const clone = x => JSON.parse(JSON.stringify(x));
  const norm = x => String(x).trim().normalize('NFKC').toLocaleLowerCase('de-DE').replace(/\s+/g, ' ');
  const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
  const integer = (value, max, min = 0) => Number.isSafeInteger(value) && value >= min && value <= max;
  const idOK = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
  const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
  function uuid() {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const year = Number(value.slice(0, 4));
    if (year < 2000 || year > 2199) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  // No binary-float multiplication, exponent syntax or ambiguous grouping separators.
  function parseDecimal(value, scale, max, allowZero = false) {
    const raw = String(value).trim();
    const pattern = new RegExp('^\\d+(?:[.,]\\d{1,' + scale + '})?$');
    need(pattern.test(raw), 'number');
    const [whole, fraction = ''] = raw.replace(',', '.').split('.');
    need(whole.length <= 12, 'range');
    const result = Number(whole) * (10 ** scale) + Number(fraction.padEnd(scale, '0'));
    need(integer(result, max, allowZero ? 0 : 1), 'range');
    return result;
  }
  const grams = (value, allowZero = false) => parseDecimal(value, 3, LIMIT.grams, allowZero);
  const price = value => parseDecimal(value, 2, LIMIT.price, true);
  function lineTotal(weight, unitPrice) {
    need(integer(weight, LIMIT.grams) && integer(unitPrice, LIMIT.price), 'range');
    const total = (BigInt(weight) * BigInt(unitPrice) + 500n) / 1000n;
    need(total <= BigInt(Number.MAX_SAFE_INTEGER), 'overflow');
    return Number(total);
  }
  function safeAdd(a, b) { const result = a + b; need(Number.isSafeInteger(result), 'overflow'); return result; }
  function emptyState() { return { schemaVersion: VERSION, shop: null, events: [], customers: [], orders: [], catalog: [], audit: [] }; }
  function assertShop(shop) {
    need(plain(shop), 'shop');
    need(text(shop.name, 100, true), 'shopName');
    for (const k of ['owner','street','zip','city','phone','email','hours']) need(text(shop[k], k === 'hours' ? 500 : 200), 'shop', k);
    need(!shop.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shop.email), 'email');
    need(shop.currency === 'EUR' && LANGS.includes(shop.language) && SKINS.includes(shop.skin), 'settings');
  }
  function namesOK(names) { return plain(names) && LANGS.every(l => text(names[l], 100, l === 'de')); }
  function imageOK(key) { return typeof key === 'string' && Object.prototype.hasOwnProperty.call(C.images, key); }
  function upgradeState(input) {
    need(plain(input), 'data');
    if (input.schemaVersion === VERSION) return assertState(input);
    need(input.schemaVersion === 1 || input.schemaVersion === 2, 'version');
    const next=clone(input); next.schemaVersion=VERSION; next.catalog=next.catalog || []; next.audit=[];
    return assertState(next);
  }
  function assertState(state) {
    need(plain(state) && state.schemaVersion === VERSION, 'version');
    if(state.audit !== undefined){need(Array.isArray(state.audit)&&state.audit.length<=10000,'auditLimit');const ids=new Set();for(const row of state.audit){need(plain(row)&&idOK(row.id)&&!ids.has(row.id)&&timestamp(row.at)&&text(row.action,60,true)&&text(row.actor,200)&&text(row.detail,1200),'audit');ids.add(row.id);}}
    need(Array.isArray(state.catalog) && state.catalog.length <= LIMIT.catalog, 'catalog');
    need(Array.isArray(state.events) && Array.isArray(state.customers) && Array.isArray(state.orders), 'data');
    need(state.events.length <= LIMIT.events && state.customers.length <= LIMIT.customers && state.orders.length <= LIMIT.orders, 'limit');
    if (state.shop === null) need(!state.events.length && !state.customers.length && !state.orders.length, 'shop');
    else assertShop(state.shop);
    const catalogIds = new Set();
    for (const product of state.catalog) {
      need(plain(product) && idOK(product.id) && !catalogIds.has(product.id), 'catalog');
      catalogIds.add(product.id); unitValid(product); need(photoOK(product.photo),'photo');
      need(namesOK(product.names) && Object.prototype.hasOwnProperty.call(C.categories, product.category) && imageOK(product.imageKey), 'catalog');
      need(product.defaultPrice === null || integer(product.defaultPrice, LIMIT.price), 'catalog');
      need(typeof product.active === 'boolean' && typeof product.archived === 'boolean' && !(product.archived && product.active), 'catalog');
    }
    need(state.shop !== null || !state.catalog.length, 'shop');
    const eventMap = new Map(), itemMap = new Map(), customerSet = new Set(), orderSet = new Set(), customerKeys = new Set(), eventCustomer = new Set();
    for (const customer of state.customers) {
      need(plain(customer) && idOK(customer.id) && !customerSet.has(customer.id), 'customer');
      need(text(customer.firstName, 100) && text(customer.lastName, 100, true) && text(customer.phone, 80) && text(customer.note, 500), 'customer');
      const key = norm(customer.firstName) + '|' + norm(customer.lastName) + '|' + customer.phone.replace(/[^0-9+]/g,'');
      need(!customerKeys.has(key), 'duplicateCustomer');
      customerKeys.add(key); customerSet.add(customer.id);
    }
    for (const event of state.events) {
      need(plain(event) && idOK(event.id) && !eventMap.has(event.id), 'event');
      need(validDate(event.date) && text(event.title, 100, true) && text(event.time, 5) && (!event.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)), 'date');
      need(typeof event.closed === 'boolean' && text(event.note, 500) && Array.isArray(event.items) && event.items.length <= LIMIT.items, 'event');
      const names = new Set();
      for (const item of event.items) {
        unitValid(item);
        need(plain(item) && idOK(item.id) && !itemMap.has(item.id) && text(item.name, 100, true) && integer(item.price, LIMIT.price), 'item');
        need(item.active === undefined || typeof item.active === 'boolean', 'item');
        need(item.imageKey === undefined || imageOK(item.imageKey), 'item');
        need(item.names === undefined || namesOK(item.names), 'item');
        need(item.catalogId === undefined || (idOK(item.catalogId) && catalogIds.has(item.catalogId)), 'catalogReference');
        need(!names.has(norm(item.name)), 'duplicateItem');
        names.add(norm(item.name)); itemMap.set(item.id, { eventId: event.id, item });
      }
      eventMap.set(event.id, event);
    }
    for (const order of state.orders) {
      need(plain(order) && idOK(order.id) && !orderSet.has(order.id), 'order'); orderSet.add(order.id);
      need(eventMap.has(order.eventId) && customerSet.has(order.customerId), 'reference');
      const pair = order.eventId + '|' + order.customerId;
      need(!eventCustomer.has(pair), 'duplicateOrder'); eventCustomer.add(pair);
      need(typeof order.cancelled === 'boolean' && text(order.note, 500) && timestamp(order.createdAt) && timestamp(order.updatedAt), 'order');
      need(Array.isArray(order.lines) && order.lines.length > 0 && order.lines.length <= LIMIT.lines, 'lines');
      const products = new Set();
      for (const line of order.lines) {
        need(plain(line) && itemMap.has(line.itemId) && itemMap.get(line.itemId).eventId === order.eventId && !products.has(line.itemId), 'reference');
        unitValid(line); need(unitOf(line)===unitOf(itemMap.get(line.itemId).item),'unit');
        need(line.names === undefined || namesOK(line.names), 'line');
        need(text(line.name, 100, true) && integer(line.grams, LIMIT.grams, 1) && integer(line.price, LIMIT.price), 'line');
        products.add(line.itemId);
      }
      if (order.sale !== null) {
        need(!order.cancelled && plain(order.sale) && timestamp(order.sale.recordedAt) && Array.isArray(order.sale.lines) && order.sale.lines.length >= products.size && order.sale.lines.length <= LIMIT.lines, 'sale');
        need(order.sale.complete===undefined || typeof order.sale.complete==='boolean','sale');
        const sold = new Set();
        for (const line of order.sale.lines) {
          need(plain(line) && itemMap.has(line.itemId) && itemMap.get(line.itemId).eventId===order.eventId && !sold.has(line.itemId) && integer(line.grams, LIMIT.grams) && integer(line.price, LIMIT.price), 'sale');
          unitValid(line); need(unitOf(line)===unitOf(itemMap.get(line.itemId).item),'unit');
          need(line.name===undefined || text(line.name,100,true),'sale');
          need(line.names===undefined || namesOK(line.names),'sale');
          sold.add(line.itemId);
        }
        need([...products].every(id=>sold.has(id)),'sale');
      }
      if(order.payment!==undefined){need(plain(order.payment)&&integer(order.payment.amount,Number.MAX_SAFE_INTEGER)&&['cash','card','other'].includes(order.payment.method)&&timestamp(order.payment.at),'payment'); need((order.sale!==null&&!order.cancelled)||order.payment.amount===0,'payment');need(order.payment.amount<=(order.sale?totalLines(order.sale.lines):0),'overpayment');}
      need(!eventMap.get(order.eventId).closed || order.cancelled || (order.sale !== null&&order.sale.complete!==false), 'pendingClose');
    }
    need(new TextEncoder().encode(JSON.stringify(state)).length <= LIMIT.bytes, 'limit');
    return state;
  }
  function shopData(input) {
    const shop = { name: '', owner: '', street: '', zip: '', city: '', phone: '', email: '', hours: '', currency: 'EUR', language: 'de', skin: 'light' };
    for (const k of Object.keys(shop)) if (typeof input[k] === 'string') shop[k] = input[k].trim();
    assertShop(shop); return shop;
  }
  function setup(state, input) { need(state.shop === null, 'alreadySetup'); const next = clone(state); next.shop = shopData(input); if (input.catalog !== false) next.catalog = clone(C.templates); return assertState(next); }
  function updateShop(state, input) { const next = clone(state); next.shop = shopData(input); return assertState(next); }
  function eventById(state, id) { const event = state.events.find(e => e.id === id); need(event, 'missing'); return event; }
  function orderById(state, id) { const order = state.orders.find(e => e.id === id); need(order, 'missing'); return order; }
  function editable(state, eventId) { const event = eventById(state, eventId); need(!event.closed, 'closed'); return event; }
  function saveEvent(state, input) {
    need(state.shop, 'shop'); const next = clone(state);
    const old = input.id ? editable(next, input.id) : null;
    const result = { id: old ? old.id : uuid(), date: String(input.date || ''), time: String(input.time || ''), title: String(input.title || '').trim(), note: String(input.note || '').trim(), closed: false, items: [] };
    need(Array.isArray(input.items), 'items');
    result.items = input.items.map(item => ({ id: item.id || uuid(), name: String(item.name || '').trim(), price: item.price, unit:unitOf(item), active:item.active !== false, ...(item.catalogId ? {catalogId:item.catalogId} : {}), ...(item.imageKey ? {imageKey:item.imageKey} : {}), ...(item.names ? {names:clone(item.names)} : {}) }));
    if (old) {
      const usedIds = new Set(next.orders.filter(o => o.eventId === old.id).flatMap(o => [...o.lines,...(o.sale?.lines||[])].map(l => l.itemId)));
      for (const id of usedIds) {
        const original = old.items.find(i => i.id === id), changed = result.items.find(i => i.id === id);
        need(changed, 'usedItem');
        need(changed.name === original.name, 'usedItemName'); need(unitOf(changed)===unitOf(original),'usedUnit');
      }
      next.events[next.events.findIndex(e => e.id === old.id)] = result;
    } else next.events.push(result);
    return { state: assertState(next), id: result.id };
  }
  function copyEvent(state, eventId, date) {
    const old = eventById(state, eventId);
    return saveEvent(state, { date, title: old.title, time: old.time, note: old.note, items: old.items.map(({id,...item}) => clone(item)) });
  }
  function deleteEvent(state, eventId) {
    need(!state.orders.some(o => o.eventId === eventId), 'usedEvent');
    const next = clone(state); eventById(next,eventId); next.events = next.events.filter(e => e.id !== eventId); return assertState(next);
  }
  function saveOrder(state, input) {
    const next = clone(state); const event = editable(next, input.eventId);
    const old = input.id ? orderById(next, input.id) : null;
    need(!old || (old.sale === null && !old.cancelled && old.eventId === event.id), 'lockedOrder');
    let customerId = old ? old.customerId : input.customerId;
    if (!customerId) {
      need(plain(input.customer), 'customer');
      const customer = { id: uuid(), firstName: String(input.customer.firstName || '').trim(), lastName: String(input.customer.lastName || '').trim(), phone: String(input.customer.phone || '').trim(), note: String(input.customer.note || '').trim() };
      next.customers.push(customer); customerId = customer.id;
    }
    const now = new Date().toISOString();
    need(Array.isArray(input.lines) && input.lines.length, 'lines');
    const lines = input.lines.map(line => {
      const item = event.items.find(i => i.id === line.itemId); need(item, 'reference');
      const previous = old && old.lines.find(l => l.itemId === line.itemId);
      need(item.active !== false || previous, 'inactiveItem');
      return { itemId: item.id, name: previous ? previous.name : item.name, ...((previous?.names || item.names) ? {names:clone(previous?.names || item.names)} : {}), unit:unitOf(previous||item), grams: line.grams, price: previous ? previous.price : item.price };
    });
    const order = { id: old ? old.id : uuid(), eventId: event.id, customerId, lines, note: String(input.note || '').trim(), cancelled: false, sale: null, createdAt: old ? old.createdAt : now, updatedAt: now };
    if (old) next.orders[next.orders.findIndex(o => o.id === old.id)] = order; else next.orders.push(order);
    return { state: assertState(next), id: order.id };
  }
  function updateCustomer(state, id, input) {
    const next = clone(state), old = next.customers.find(c => c.id === id); need(old, 'customer');
    for (const key of ['firstName','lastName','phone','note']) old[key] = String(input[key] || '').trim();
    return assertState(next);
  }
  function saveSale(state, orderId, lines, complete=true) {
    const next=clone(state),order=orderById(next,orderId),event=editable(next,order.eventId); need(!order.cancelled,'cancelled'); need(typeof complete==='boolean','sale');
    need(Array.isArray(lines),'sale');
    order.sale={recordedAt:new Date().toISOString(), complete, lines:lines.map(line=>{
      const original=order.lines.find(x=>x.itemId===line.itemId)||order.sale?.lines.find(x=>x.itemId===line.itemId)||event.items.find(x=>x.id===line.itemId);
      need(original,'reference'); return {itemId:line.itemId,grams:line.grams,price:line.price,unit:unitOf(original),name:original.name,...(original.names?{names:clone(original.names)}:{})};
    })}; order.updatedAt=order.sale.recordedAt;
    return assertState(next);
  }
  function savePayment(state,orderId,amount,method='cash') {
    const next=clone(state),order=orderById(next,orderId);need(order.sale&&!order.cancelled,'payment');
    // Settlement can be recorded after a sale date is closed; plan and sale remain locked.
    need(integer(amount,Number.MAX_SAFE_INTEGER)&&amount<=totalLines(order.sale.lines),'overpayment');
    need(['cash','card','other'].includes(method),'payment');order.payment={amount,method,at:new Date().toISOString()};return assertState(next);
  }
  function paymentSummary(order) { const due=order.sale?totalLines(order.sale.lines):0,paid=order.payment?.amount||0; return {due,paid,balance:due-paid,status:!order.sale?'notSold':paid===due?'paid':paid>0?'partPaid':'unpaid'}; }
  function cancelOrder(state, orderId, cancelled = true) {
    const next = clone(state), order = orderById(next, orderId); editable(next, order.eventId); need(order.sale === null, 'hasSale');
    order.cancelled = cancelled; order.updatedAt = new Date().toISOString(); return assertState(next);
  }
  function clearSale(state, orderId) {
    const next = clone(state), order = orderById(next, orderId); editable(next, order.eventId); need(!(order.payment?.amount>0),'paymentFirst'); order.sale = null; order.updatedAt = new Date().toISOString(); return assertState(next);
  }
  function setClosed(state, eventId, closed) {
    const next = clone(state), event = eventById(next, eventId);
    need(typeof closed === 'boolean', 'event');
    if (closed) need(!next.orders.some(o => o.eventId === eventId && !o.cancelled && (o.sale === null || o.sale.complete===false)), 'pendingClose');
    event.closed = closed; return assertState(next);
  }
  const totalLines = lines => lines.reduce((sum, line) => safeAdd(sum, lineTotal(line.grams, line.price)), 0);
  const weightLines = lines => lines.reduce((sum, line) => safeAdd(sum, line.grams), 0);
  function quantities(lines) {const result={};for(const line of lines){const u=unitOf(line);result[u]=safeAdd(result[u]||0,line.grams);}return result;}
  function summary(state, eventId) {
    eventById(state, eventId);
    const orders = state.orders.filter(o => o.eventId === eventId), active = orders.filter(o => !o.cancelled), sold = active.filter(o => o.sale !== null);
    return {
      customers: new Set(active.map(o => o.customerId)).size, pending: active.filter(o=>!o.sale||o.sale.complete===false).length, fulfilled: sold.filter(o=>o.sale.complete!==false).length, cancelled: orders.length - active.length,
      plannedQuantities: quantities(active.flatMap(o=>o.lines)), soldQuantities:quantities(sold.flatMap(o=>o.sale.lines)), paidTotal:sold.reduce((a,o)=>safeAdd(a,paymentSummary(o).paid),0), balanceTotal:sold.reduce((a,o)=>safeAdd(a,paymentSummary(o).balance),0),
      plannedGrams: active.reduce((a,o) => safeAdd(a, weightLines(o.lines.filter(l=>unitOf(l)==='kg'))), 0), plannedTotal: active.reduce((a,o) => safeAdd(a, totalLines(o.lines)), 0),
      soldGrams: sold.reduce((a,o) => safeAdd(a, weightLines(o.sale.lines.filter(l=>unitOf(l)==='kg'))), 0), soldTotal: sold.reduce((a,o) => safeAdd(a, totalLines(o.sale.lines)), 0)
    };
  }
  function itemSummary(state,eventId) {
    const event=eventById(state,eventId),groups=new Map(event.items.map(item=>[item.id,{id:item.id,name:item.name,names:item.names,imageKey:item.imageKey,unit:unitOf(item),active:item.active!==false,price:item.price,prices:[],customers:0,grams:0,total:0,soldGrams:0,soldTotal:0,remainingGrams:0,allocations:[]} ]));
    const customers=new Map(state.customers.map(c=>[c.id,c]));
    for(const order of state.orders.filter(o=>o.eventId===eventId&&!o.cancelled)) {
      const ids=new Set([...order.lines.map(l=>l.itemId),...(order.sale?.lines||[]).map(l=>l.itemId)]);
      for(const id of ids){
        const line=order.lines.find(l=>l.itemId===id),sale=order.sale?.lines.find(l=>l.itemId===id),g=groups.get(id);
        if(line){g.customers++;g.grams=safeAdd(g.grams,line.grams);g.total=safeAdd(g.total,lineTotal(line.grams,line.price));if(!g.prices.includes(line.price))g.prices.push(line.price);}
        if(sale){g.soldGrams=safeAdd(g.soldGrams,sale.grams);g.soldTotal=safeAdd(g.soldTotal,lineTotal(sale.grams,sale.price));}
        const remaining=order.sale&&order.sale.complete!==false?0:Math.max(0,(line?.grams||0)-(sale?.grams||0));g.remainingGrams=safeAdd(g.remainingGrams,remaining);
        g.allocations.push({orderId:order.id,customer:customers.get(order.customerId),grams:line?.grams||0,total:line?lineTotal(line.grams,line.price):0,sale:sale||null,remainingGrams:remaining});
      }
    }return [...groups.values()];
  }
  function customerName(customer) { return `${customer.lastName}, ${customer.firstName}`.replace(/,\s*$/, ''); }
  function listOrders(state, eventId, opts = {}) {
    const customers = new Map(state.customers.map(c => [c.id, c]));
    const query = norm(opts.query || ''), collator = new Intl.Collator(opts.language || 'de', { numeric: true, sensitivity: 'base' });
    const rows = state.orders.filter(o => o.eventId === eventId).map(order => ({ order, customer: customers.get(order.customerId), total: totalLines(order.lines), grams: weightLines(order.lines.filter(l=>unitOf(l)==='kg')) })).filter(row => {
      if (opts.itemId && !row.order.lines.some(l => l.itemId === opts.itemId) && !row.order.sale?.lines.some(l=>l.itemId===opts.itemId)) return false;
      const status = row.order.cancelled ? 'cancelled' : row.order.sale ? (row.order.sale.complete===false?'partial':'fulfilled') : 'open';
      if (opts.status && opts.status !== 'all' && status !== opts.status) return false;
      return !query || norm(`${row.customer.firstName} ${row.customer.lastName} ${row.customer.phone} ${row.order.note}`).includes(query);
    });
    const direction = opts.direction === 'desc' ? -1 : 1;
    return rows.sort((a,b) => direction * ((opts.sort === 'total' ? a.total - b.total : opts.sort === 'grams' ? a.grams - b.grams : collator.compare(customerName(a.customer),customerName(b.customer))) || collator.compare(customerName(a.customer),customerName(b.customer)) || a.order.id.localeCompare(b.order.id)));
  }
  function demo(state) {
    need(state.shop && !state.events.length && !state.orders.length && !state.customers.length, 'demoNotEmpty');
    let result = saveEvent(state, { date: '2026-10-23', time: '17:30', title: 'Demo · Rindfleisch', note: 'Fiktive Beispieldaten / Fictional sample data', items: [ { name: 'Beinscheibe', price: 1500 }, { name: 'Schulter', price: 1800 }, { name: 'Hackfleisch', price: 1200 } ] });
    let next = result.state; const event = eventById(next, result.id), [leg,shoulder,mince] = event.items;
    const data = [ ['Paul','Beispiel',[[leg,2000],[mince,1000]]], ['Anna','Muster',[[leg,1500],[shoulder,2000]]], ['Karl','Testkunde',[[leg,1000],[shoulder,1000],[mince,500]]] ];
    for (const [firstName,lastName,lines] of data) next = saveOrder(next, { eventId: event.id, customer: { firstName,lastName,phone:'',note:'Demo' }, note: 'Demo', lines: lines.map(([item,g]) => ({ itemId:item.id, grams:g })) }).state;
    return next;
  }
  function catalogName(product, language = 'de') { return product.names?.[language] || product.names?.de || product.name || ''; }
  function catalogById(state, id) { const product=state.catalog.find(p => p.id === id); need(product, 'missing'); return product; }
  function seedCatalog(state) {
    need(state.shop, 'shop'); const next=clone(state);
    // Explicit restore of missing templates only. Never overwrites edits or resurrects archived cards.
    for (const p of C.templates) if (!next.catalog.some(x => x.id === p.id)) next.catalog.push(clone(p));
    return assertState(next);
  }
  function saveCatalogProduct(state, input) {
    need(state.shop, 'shop'); const next=clone(state), old=input.id ? catalogById(next,input.id) : null;
    need(!old || !old.archived, 'archivedProduct');
    const product={id:old?old.id:uuid(),category:input.category,names:Object.fromEntries(LANGS.map(l=>[l,String(input.names?.[l] || '').trim()])),imageKey:input.imageKey,unit:input.unit||old?.unit||'kg',photo:input.photo===undefined?(old?.photo||null):input.photo,
      defaultPrice:input.defaultPrice === undefined ? null : input.defaultPrice,active:input.active === undefined ? true : input.active,archived:false};
    if(old) next.catalog[next.catalog.findIndex(p=>p.id===old.id)]=product;else next.catalog.push(product);
    return {state:assertState(next),id:product.id};
  }
  function setCatalogActive(state,id,active) {
    const next=clone(state), p=catalogById(next,id); need(!p.archived,'archivedProduct'); need(typeof active==='boolean','catalog'); p.active=active; return assertState(next);
  }
  function catalogUsed(state,id) {return state.events.some(event=>event.items.some(item=>item.catalogId===id));}
  function deleteCatalogProduct(state,id) {
    const next=clone(state),p=catalogById(next,id);
    if(catalogUsed(next,id)){p.archived=true;p.active=false;}else next.catalog=next.catalog.filter(x=>x.id!==id);
    return assertState(next);
  }
  function restoreCatalogProduct(state,id) {
    const next=clone(state),p=catalogById(next,id); p.archived=false;p.active=false;return assertState(next);
  }
  function catalogEventItem(state,id,language='de',unitPrice) {
    const p=catalogById(state,id);need(p.active&&!p.archived,'inactiveItem');
    const priceValue=unitPrice===undefined?p.defaultPrice:unitPrice;need(integer(priceValue,LIMIT.price),'catalogPrice');
    return {id:uuid(),catalogId:p.id,name:catalogName(p,language),names:clone(p.names),imageKey:p.imageKey,unit:unitOf(p),price:priceValue,active:true};
  }
  function audited(action,fn) { return function(state,...args) {
    const result=fn(state,...args),next=result.state||result;if(JSON.stringify(next)===JSON.stringify(state))return result;
    const parts=[];
    if(JSON.stringify(state.shop)!==JSON.stringify(next.shop))parts.push('shop');
    for(const kind of ['events','customers','catalog','orders'])for(const row of next[kind]) {
      const before=state[kind].find(x=>x.id===row.id);if(JSON.stringify(before)!==JSON.stringify(row)){
        let d=kind+':'+row.id;if(kind==='orders')d+=' plan='+totalLines(row.lines)+' sale='+(row.sale?totalLines(row.sale.lines):0)+' paid='+(row.payment?.amount||0);parts.push(d);
      }
    }
    for(const kind of ['events','catalog'])for(const row of state[kind])if(!next[kind].some(x=>x.id===row.id))parts.push('removed '+kind+':'+row.id);
    next.audit=next.audit||[];next.audit.push({id:uuid(),at:new Date().toISOString(),action,actor:next.shop?.owner||'local',detail:parts.join('; ').slice(0,1200)});assertState(next);return result;
  };}
  const api={ upgradeState, catalogName, catalogById, seedCatalog, saveCatalogProduct, setCatalogActive, catalogUsed, deleteCatalogProduct, restoreCatalogProduct, catalogEventItem, VERSION, LIMIT, SKINS, LANGS, DomainError, fail, need, clone, norm, uuid, validDate, localDate, grams, price, parseDecimal, lineTotal, totalLines, weightLines, emptyState, assertState, shopData, setup, updateShop, eventById, orderById, saveEvent, copyEvent, deleteEvent, saveOrder, updateCustomer, saveSale, cancelOrder, clearSale, setClosed, summary, itemSummary, customerName, listOrders, demo, UNITS,unitOf,quantity,quantities,photoOK,savePayment,paymentSummary };
  for(const key of ['setup','updateShop','saveEvent','copyEvent','deleteEvent','saveOrder','updateCustomer','saveSale','cancelOrder','clearSale','setClosed','seedCatalog','saveCatalogProduct','setCatalogActive','deleteCatalogProduct','restoreCatalogProduct','savePayment'])api[key]=audited(key,api[key]);
  return Object.freeze(api);
});
