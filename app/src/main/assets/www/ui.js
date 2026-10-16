/* Android-local UI. All user text is escaped. No external services, eval, or inline handlers. */
(function () {
  'use strict';
  const D = window.LadleDomain, S = window.LadleStorage, I = window.LadleI18n, C = window.LadleCatalog;
  const app = document.getElementById('app'), modal = document.getElementById('modal');
  const repo = window.LadleNative ? new S.NativeRepository(window.LadleNative) : new S.BrowserRepository(window.localStorage);
  let state, revision = 0, busy = false, toastTimer, fileText = '', pendingDraft=null;
  const draftStore=new S.DraftStore(repo.mode==='android'?window.LadleNative:window.localStorage,repo.mode);
  function clearDraft(){try{draftStore.clear();pendingDraft=null;}catch(_){toast(t('draftWriteError'));}}
  function stashDraft(){try{if(!state)return;if(!state.shop&&ui.screen!=='restore'){collectWizard();draftStore.save({version:1,revision,wizard,step,ui:null});return;}if(ui.draft&&ui.dirty){collectDraft();draftStore.save({version:1,revision,wizard:null,step:1,ui:{screen:ui.screen,eventId:ui.eventId,orderId:ui.orderId,draft:ui.draft}});}}catch(_){toast(t('draftWriteError'));}}
  let wizard = { name:'Lädle', owner:'', street:'', zip:'', city:'', phone:'', email:'', hours:'', currency:'EUR', language:'de', skin:'light', demo:false, catalog:true };
  let step = 1;
  const ui = { screen:'home', eventId:null, orderId:null, itemId:null, tab:'customers', query:'', product:'', status:'all', sort:'name', direction:'asc', limit:50, draft:null, dirty:false, catalogQuery:'', catalogCategory:'', catalogStatus:'active', catalogLimit:40 };
  const icons = {
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
    bag:'<path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2m-8 4h.01M16 11h.01"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M15 7c-6-3-8 13 0 10M6 10h8m-8 4h7"/>',
    shop:'<path d="M3 10h18l-2-6H5l-2 6Zm2 0v11h14V10M9 21v-7h6v7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    back:'<path d="m14 6-6 6 6 6"/>',
    next:'<path d="m9 6 6 6-6 6"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit:'<path d="m4 16 11-11 4 4L8 20l-5 1 1-5ZM14 6l4 4"/>',
    skin:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 7h6m-6 5h9m-9 5h6"/>',
    backup:'<path d="M4 16v5h16v-5M12 3v13m-5-5 5 5 5-5"/>',
    restore:'<path d="M4 16v5h16v-5M12 16V3m-5 5 5-5 5 5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  const e = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function lang() { return state && state.shop ? state.shop.language : wizard.language; }
  function t(key, values={}) { let s = (I[lang()] || I.de)[key] || I.de[key] || key; return s.replace(/\{(\w+)\}/g, (_,k) => String(values[k] ?? '')); }
  const num = (value,digits=3) => new Intl.NumberFormat(lang(),{ maximumFractionDigits:digits }).format(value);
  const kg = value => num(value / 1000) + ' ' + t('kg');
  const qty=(value,item)=>num(value/1000)+' '+t('unit.'+D.unitOf(item));
  const quantityList=values=>Object.entries(values).filter(([u,n])=>n).map(([u,n])=>qty(n,{unit:u})).join(' · ')||'0';
  const unitSelect=(name,value,disabled=false)=>`<label class="field">${e(t('unitLabel'))}<select name="${name}"${disable(disabled)}>${D.UNITS.map(u=>option(u,t('unit.'+u),value||'kg')).join('')}</select></label>`;
  const draftUnit=line=>D.unitOf(D.eventById(state,ui.eventId).items.find(i=>i.id===line.itemId));
  const money = value => new Intl.NumberFormat(lang(),{style:'currency',currency:'EUR'}).format(value / 100);
  const unit = value => new Intl.NumberFormat(lang(),{ minimumFractionDigits:2,maximumFractionDigits:2 }).format(value / 100);
  const raw = (value,scale) => (value / 10 ** scale).toFixed(scale).replace(/\.?0+$/, '') || '0';
  const inputRaw = (value,scale) => String(value / 10 ** scale);
  const dateText = (value,options={day:'2-digit',month:'long',year:'numeric'}) => new Intl.DateTimeFormat(lang(),options).format(new Date(value+'T12:00:00'));
  const selected = (a,b) => a === b ? ' selected' : '';
  const checked = yes => yes ? ' checked' : '';
  const disable = yes => yes ? ' disabled' : '';
  const action = (label,name,cls='',extra='') => `<button type="button" data-action="${name}" class="${cls}" ${extra}>${e(label)}</button>`;
  function field(label,name,value='',options={}) {
    const type = options.type || 'text', attrs = options.attrs || '';
    const input = type === 'textarea' ? `<textarea name="${e(name)}" ${attrs}>${e(value)}</textarea>` : `<input name="${e(name)}" type="${type}" value="${e(value)}" ${attrs}>`;
    return `<label class="field ${options.wide ? 'wide' : ''}">${e(label)}${input}${options.help ? `<span class="field-help">${e(options.help)}</span>` : ''}</label>`;
  }
  const option = (value,label,current) => `<option value="${e(value)}"${selected(value,current)}>${e(label)}</option>`;
  const languageSelect = value => `<select name="language" aria-label="${e(t('language'))}" class="wizard-lang">${[['de','Deutsch'],['ru','Русский'],['en','English']].map(([v,l])=>option(v,l,value)).join('')}</select>`;
  const skins = skin => `<div class="skin-grid">${D.SKINS.map(id=>`<label class="skin-option"><div class="skin-sample ${id}" aria-hidden="true"></div><span class="row"><input type="radio" name="skin" value="${id}" data-testid="skin-${id}"${checked(id===skin)}><span>${e(t('skin.'+id))}</span></span></label>`).join('')}</div>`;
  const statusName = order => order.cancelled ? 'cancelled' : order.sale ? (order.sale.complete===false?'partial':'fulfilled') : 'open';
  function badge(order) { const s = statusName(order); return `<span class="badge ${s}">${s==='fulfilled'?'✓':s==='open'?'○':'×'} ${e(t(s))}</span>`; }
  function footer() { return `<footer class="app-footer"><span>HomenS<span>.AI</span> · Lädle Mini Local 0.3.0</span><span>${e(t('offline'))}</span></footer>`; }
  function shell(content, nav='dates', cls='') {
    const isHome = ui.screen === 'home';
    return `<header class="app-header"><div class="header-inner">${isHome ? icon('shop') : `<button type="button" class="icon-button ghost" data-action="back" aria-label="${e(t('back'))}">${icon('back')}</button>`}<div class="header-name"><div class="wordmark">HomenS<span>.AI</span></div><div class="shop-title">${e(state.shop.name)}</div></div>${ui.screen==='event' ? `<button type="button" class="icon-button" data-action="event-menu" aria-label="${e(t('eventMenu'))}">${icon('more')}</button>` : `<button type="button" class="icon-button ghost" data-action="settings" aria-label="${e(t('settings'))}">${icon('skin')}</button>`}</div></header><main id="main" class="${cls}">${content}${footer()}</main><nav class="nav-bottom" aria-label="${e(t('dates'))}"><button type="button" data-action="home" class="${nav==='dates'?'active':''}">${icon('calendar')}${e(t('dates'))}</button><button type="button" data-action="catalog" class="${nav==='catalog'?'active':''}">${icon('bag')}${e(t('catalog'))}</button><button type="button" data-action="settings" class="${nav==='settings'?'active':''}">${icon('shop')}${e(t('navShop'))}</button></nav>`;
  }
  function previewBanner() { return repo.mode === 'browser' ? `<div class="banner preview-banner">${e(t('browserWarning'))}</div>` : ''; }
  function errorBox() { return '<div id="form-error" class="error-box" role="alert" tabindex="-1"></div>'; }
  function toast(message) { const el=document.getElementById('toast'); clearTimeout(toastTimer); el.textContent=message; el.classList.add('visible'); toastTimer=setTimeout(()=>el.classList.remove('visible'),3500); }
  function dialog(title,body,buttons=[['close','close','']]) {
    if (modal.open) modal.close('cancel');
    modal.innerHTML = `<h2 id="modal-title">${e(title)}</h2>${body}<div class="form-actions">${buttons.map(([label,value,cls])=>`<button type="button" data-dialog="${e(value)}" class="${cls||''}">${e(t(label))}</button>`).join('')}</div>`;
    modal.returnValue='';
    return new Promise(resolve=>{ modal.addEventListener('close',()=>resolve(modal.returnValue),{once:true}); modal.showModal(); });
  }
  const confirm = (title,message) => dialog(t(title),`<p>${e(message)}</p>`,[['cancel','cancel',''],['yes','yes','primary']]).then(x=>x==='yes');
  function showError(error) {
    const key='error.'+(error && error.code || 'generic'), message=t(I.de[key]?key:'error.generic');
    const box=document.getElementById('form-error');
    if (box) { box.textContent=message; box.focus(); box.scrollIntoView({block:'nearest'}); }
    else dialog(t('errorTitle'),`<p>${e(message)}</p>`);
  }
  function commit(next,screen,patch={}) {
    D.assertState(next); const rev=repo.save(revision,next);
    revision=rev; state=next; clearDraft();ui.dirty=false; ui.draft=null;
    if (screen) Object.assign(ui,patch,{screen}); render(); toast(t('saved'));
  }
  function collectWizard() {
    for (const key of Object.keys(wizard)) {
      const el=app.querySelector(`[name="${key}"]`);
      if (!el) continue;
      if (key==='skin') { const el2=app.querySelector('[name="skin"]:checked'); if(el2) wizard.skin=el2.value; }
      else if (el.type==='checkbox') wizard[key]=el.checked;
      else wizard[key]=el.value;
    }
  }
  function renderWizard() {
    let fields='';
    if(step===1) fields=`${field(t('shopName'),'name',wizard.name,{attrs:'maxlength="100" required autocomplete="organization"'})}${field(t('owner'),'owner',wizard.owner,{attrs:'maxlength="200" autocomplete="name"'})}<label class="field">${e(t('language'))}${languageSelect(wizard.language)}</label>`;
    else if(step===2) fields=`${field(t('street'),'street',wizard.street,{attrs:'maxlength="200" autocomplete="street-address"'})}<div class="field-grid">${field(t('zip'),'zip',wizard.zip,{attrs:'maxlength="200" autocomplete="postal-code"'})}${field(t('city'),'city',wizard.city,{attrs:'maxlength="200" autocomplete="address-level2"'})}</div>${field(t('phone'),'phone',wizard.phone,{type:'tel',attrs:'maxlength="200" autocomplete="tel"'})}${field(t('email'),'email',wizard.email,{type:'email',attrs:'maxlength="200" autocomplete="email"'})}${field(t('hours'),'hours',wizard.hours,{type:'textarea',attrs:'maxlength="500"'})}`;
    else fields=`<p class="wizard-intro">${e(t('skinHint'))}</p>${skins(wizard.skin)}<label class="check-row"><input type="checkbox" name="catalog"${checked(wizard.catalog)}><span>${e(t('catalogSetup'))}<small class="field-help">${e(t('catalogSetupHint'))}</small></span></label><label class="check-row"><input type="checkbox" name="demo"${checked(wizard.demo)}><span>${e(t('demoCheck'))}<small class="field-help">${e(t('demoHint'))}</small></span></label><div class="banner">${e(t('privacySetup'))}</div>`;
    return `<header class="app-header"><div class="header-inner">${icon('shop')}<div class="header-name"><div class="wordmark">HomenS<span>.AI</span></div><div class="shop-title">Lädle</div></div></div></header><main id="main" class="wizard"><div class="kicker">${e(t('step',{n:step}))}</div><div class="wizard-progress" aria-hidden="true">${[1,2,3].map(n=>`<span class="${n<=step?'done':''}"></span>`).join('')}</div><h1>${e(t(step===1?'welcome':step===2?'contactData':'appearance'))}</h1>${step===1?`<p class="wizard-intro">${e(t('welcomeIntro'))}</p>`:'<div class="spacer"></div>'}<form data-form="wizard">${fields}${errorBox()}<div class="form-actions">${step>1?action(t('back'),'wizard-back'):''}<button type="submit" class="primary" data-testid="wizard-next">${e(t(step===3?'finish':'next'))}</button></div></form>${step===1?action(t('restore'),'wizard-restore','ghost spacer'):''}${footer()}</main>`;
  }
  function dateCard(event) {
    const sum=D.summary(state,event.id);
    return `<button type="button" class="card card-button date-card" data-action="event" data-id="${e(event.id)}"><span class="date-block"><strong>${e(event.date.slice(-2))}</strong><span>${e(dateText(event.date,{month:'short'}))}</span></span><span class="date-description"><strong>${e(event.title)}</strong><span class="date-meta">${e(dateText(event.date,{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}))}${event.time?' · '+e(event.time):''}</span><span class="date-meta">${e(t('people',{n:sum.customers}))}<span class="number">${e(money(event.closed?sum.soldTotal:sum.plannedTotal))}</span></span></span><span class="end"><span class="badge">${event.closed?'✓':'○'} ${e(t(event.closed?'closed':'activeDate'))}</span><br>${icon('next')}</span></button>`;
  }
  function renderHome() {
    const today=D.localDate(), upcoming=state.events.filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title)), past=state.events.filter(x=>x.date<today).sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
    let content=`${previewBanner()}${pendingDraft?.ui?`<div class="banner spacer">${e(t('draftAvailable'))}<div class="form-actions">${action(t('resumeDraft'),'resume-draft')}${action(t('discardDraft'),'discard-draft','ghost')}</div></div>`:''}<div class="page-top"><div><div class="kicker">Bestellbuch</div><h1>${e(t('pickupDates'))}</h1></div>${action(t('newDate'),'new-event','primary spacer')}</div><p class="muted spacer">${e(t('datesIntro'))}</p>`;
    if(!state.events.length) content+=`<div class="empty">${icon('calendar')}<h2>${e(t('noDates'))}</h2><p>${e(t('noDatesHint'))}</p></div>`;
    for(const [key,events] of [['upcomingDates',upcoming],['pastDates',past]]) if(events.length) content+=`<h2 class="section-title">${e(t(key))}</h2><section>${events.map(dateCard).join('')}</section>`;
    return shell(content);
  }
  function stats(sum) { return `<div class="stats"><div class="stat">${icon('users')}<strong class="number">${sum.customers}</strong><span>${e(t('customers'))}</span></div><div class="stat">${icon('bag')}<strong class="number">${e(quantityList(sum.plannedQuantities))}</strong><span>${e(t('planned'))}</span></div><div class="stat">${icon('coin')}<strong class="number" data-testid="planned-total">${e(money(sum.plannedTotal))}</strong><span>${e(t('plannedValue'))}</span></div></div><div class="actual-strip"><span>✓ ${e(t('sold'))}</span><strong class="number" data-testid="sold-total">${e(money(sum.soldTotal))}</strong><span>· ${e(quantityList(sum.soldQuantities))}</span><span>· ${e(t('fulfilledCount',{n:sum.fulfilled}))}</span><span>· ${e(t('pendingCount',{n:sum.pending}))}</span></div><div class="actual-strip"><span>${e(t('received'))}: <strong class="number">${e(money(sum.paidTotal))}</strong></span><span>${e(t('balance'))}: <strong class="number">${e(money(sum.balanceTotal))}</strong></span></div>`; }
  function filterControls(event) {
    return `<div class="filters"><input type="search" class="search" name="search" aria-label="${e(t(ui.tab==='customers'?'search':'searchProduct'))}" placeholder="${e(t(ui.tab==='customers'?'search':'searchProduct'))}" value="${e(ui.query)}"><select name="sort" aria-label="${e(t('sort'))}">${option('name',t('sortName'),ui.sort)}${option('total',t('sortAmount'),ui.sort)}${option('grams',t(ui.tab==='customers'?'sortWeight':'sortQuantity'),ui.sort)}</select><button type="button" data-action="direction" aria-label="${e(t(ui.direction==='asc'?'ascending':'descending'))}">${ui.direction==='asc'?'↑':'↓'} ${e(t(ui.direction==='asc'?'ascending':'descending'))}</button>${ui.tab==='customers'?`<select name="product" aria-label="${e(t('product'))}">${option('',t('allProducts'),ui.product)}${event.items.map(i=>option(i.id,D.catalogName(i,lang()),ui.product)).join('')}</select><select name="status" aria-label="${e(t('allStatuses'))}">${['all','open','partial','fulfilled','cancelled'].map(s=>option(s,t(s==='all'?'allStatuses':s),ui.status)).join('')}</select>`:''}</div>`;
  }
  function renderEvent() {
    const event=D.eventById(state,ui.eventId), sum=D.summary(state,event.id);
    return shell(`<button type="button" class="date-select" data-action="choose-date"><span><strong>${e(dateText(event.date))}${event.time?' · '+e(event.time):''}</strong><small>${e(event.title)}</small></span>${icon('down')}</button>${event.closed?`<div class="banner warning spacer">${icon('lock')} ${e(t('closedHint'))}</div>`:''}${stats(sum)}<div class="tabs" role="tablist" aria-label="${e(t('orderDetails'))}"><button type="button" role="tab" data-action="tab" data-tab="customers" aria-selected="${ui.tab==='customers'}">${icon('users')} ${e(t('customers'))}</button><button type="button" role="tab" data-action="tab" data-tab="items" aria-selected="${ui.tab==='items'}">${icon('bag')} ${e(t('prepare'))}</button></div>${ui.tab==='customers'?`<div class="row between"><h1>${e(t('customers'))}</h1>${event.closed?'':action(t('newOrder'),event.items.some(i=>i.active!==false)?'new-order':'edit-event','primary')}</div>`:`<h1>${e(t('prepare'))}</h1><p class="muted small spacer">${e(t('prepareHint'))}</p>`}${filterControls(event)}<div id="results">${renderResults()}</div>`);
  }
  function orderCard(row) {
    const {order,customer,total}=row;
    return `<button type="button" class="card card-button order-card" data-action="order" data-id="${e(order.id)}"><span class="order-head"><span><span class="name">${e(D.customerName(customer))}</span>${customer.phone?`<small class="field-help">${e(customer.phone)}</small>`:''}</span><span class="amount number">${e(money(total))}</span></span>${badge(order)}<div class="order-lines">${order.lines.map(line=>`<div class="order-line"><span>${e(D.catalogName(line,lang()))}</span><span class="weight number">${e(qty(line.grams,line))}</span><span class="line-price number">${e(money(D.lineTotal(line.grams,line.price)))}</span></div>`).join('')}</div>${order.sale?`<div class="product-meta"><span>✓ ${e(t('sold'))}</span><strong class="number">${e(money(D.totalLines(order.sale.lines)))}</strong></div>`:''}${order.note?`<div class="order-note">${e(order.note)}</div>`:''}</button>`;
  }
  function productCard(item) {
    const prices=item.prices.length?item.prices:[item.price];
    const priceString=prices.length>1?`${unit(Math.min(...prices))} – ${unit(Math.max(...prices))}`:unit(prices[0]);
    return `<button type="button" class="card card-button product-card" data-action="item" data-id="${e(item.id)}"><span class="product-header"><span class="product-name">${productArt(item.imageKey,'art-thumb')}${e(D.catalogName(item,lang()))}${item.active===false?`<small class="field-help">○ ${e(t('inactiveProduct'))}</small>`:''}</span><span class="product-amount number">${e(qty(item.grams,item))}</span></span><span class="product-meta"><span>${e(t('people',{n:item.customers}))}</span><span class="number">${e(priceString)} €/${e(t('unit.'+D.unitOf(item)))}</span><strong class="number">${e(money(item.total))}</strong></span><span class="product-meta"><span>${e(t('remaining'))}: ${e(qty(item.remainingGrams,item))}</span></span><span class="product-meta"><span>✓ ${e(t('sold'))}: ${e(qty(item.soldGrams,item))}</span><span class="number">${e(money(item.soldTotal))}</span></span></button>`;
  }
  function renderResults() {
    const event=D.eventById(state,ui.eventId);
    if(ui.tab==='customers') {
      const rows=D.listOrders(state,event.id,{query:ui.query,itemId:ui.product,status:ui.status,sort:ui.sort,direction:ui.direction,language:lang()});
      if(!rows.length) return `<div class="empty">${icon('users')}<h2>${e(t(state.orders.some(o=>o.eventId===event.id)?'noResults':'noOrders'))}</h2><p>${e(t('noOrdersHint'))}</p></div>`;
      return `<p class="small muted">${e(t('listCount',{n:rows.length}))}</p><div class="orders-list spacer">${rows.slice(0,ui.limit).map(orderCard).join('')}</div>${rows.length>ui.limit?action(t('showMore'),'more','spacer'):''}`;
    }
    const direction=ui.direction==='asc'?1:-1;
    const items=D.itemSummary(state,event.id).filter(i=>D.norm(D.catalogName(i,lang())).includes(D.norm(ui.query))).sort((a,b)=>direction*((ui.sort==='grams'?(D.unitOf(a).localeCompare(D.unitOf(b))||a.grams-b.grams):ui.sort==='total'?a.total-b.total:D.catalogName(a,lang()).localeCompare(D.catalogName(b,lang()),lang()))||D.catalogName(a,lang()).localeCompare(D.catalogName(b,lang()),lang())));
    if(!items.length) return `<div class="empty">${icon('bag')}<h2>${e(t(event.items.length?'noResults':'noProducts'))}</h2><p>${e(t('noProductsHint'))}</p>${!event.closed?action(t('editAssortment'),'edit-event','primary'):''}</div>`;
    return `<div class="products-list">${items.map(productCard).join('')}</div>`;
  }
  function refreshResults() { const results=document.getElementById('results'); if(results) results.innerHTML=renderResults(); }
  function orderLines(lines,names) {
    return lines.map(line=>`<div class="details-pair"><div><strong>${e(D.catalogName(line.name?line:names.find(x=>x.itemId===line.itemId),lang()))}</strong><small class="field-help number">${e(qty(line.grams,line))} × ${e(unit(line.price))} €/${e(t('unit.'+D.unitOf(line)))}</small></div><strong class="number">${e(money(D.lineTotal(line.grams,line.price)))}</strong></div>`).join('');
  }
  function renderOrder() {
    const order=D.orderById(state,ui.orderId), event=D.eventById(state,order.eventId), customer=state.customers.find(c=>c.id===order.customerId);
    let content=`<div class="kicker">${e(dateText(event.date))} · ${e(event.title)}</div><h1 class="spacer">${e(D.customerName(customer))}</h1>${badge(order)}<div class="card spacer"><div class="row between"><div><div>${e(customer.phone || '—')}</div>${customer.note?`<small class="note">${e(customer.note)}</small>`:''}</div><button type="button" class="icon-button" data-action="edit-customer" aria-label="${e(t('contactEdit'))}">${icon('edit')}</button></div></div><h2 class="section-title">${e(t('originalOrder'))}</h2><div class="card">${orderLines(order.lines,order.lines)}<div class="details-pair"><strong>${e(t('orderTotal'))}</strong><strong class="number">${e(money(D.totalLines(order.lines)))}</strong></div></div>${order.note?`<p class="note muted small spacer">${e(order.note)}</p>`:''}<h2 class="section-title">${e(t('actualSale'))}</h2>`;
    if(order.sale) content+=`<div class="card">${orderLines(order.sale.lines,order.lines)}<div class="details-pair"><strong>${e(t('saleTotal'))}</strong><strong class="number" data-testid="order-sold-total">${e(money(D.totalLines(order.sale.lines)))}</strong></div><small>${e(t('recorded',{date:new Intl.DateTimeFormat(lang(),{dateStyle:'short',timeStyle:'short'}).format(new Date(order.sale.recordedAt))}))}</small></div>`;
    else content+=`<div class="banner">${e(t('noSale'))}</div>`;
    const payment=D.paymentSummary(order);
    if(order.sale)content+=`<h2 class="section-title">${e(t('payment'))}</h2><div class="card"><div class="details-pair"><span>${e(t('received'))}</span><strong class="number" data-testid="received-total">${e(money(payment.paid))}</strong></div><div class="details-pair"><span>${e(t('balance'))}</span><strong class="number">${e(money(payment.balance))}</strong></div><p class="badge">${e(t(payment.status))}</p><div class="form-actions">${action(t('editPayment'),'payment')}</div></div>`;
    if(event.closed) content+=`<div class="banner warning spacer">${e(t('closedHint'))}</div>`;
    else if(order.cancelled) content+=`<div class="form-actions">${action(t('restoreOrder'),'uncancel-order','primary')}</div>`;
    else content+=`<div class="form-actions">${action(t(order.sale?'correctSale':'recordSale'),'sale-form','primary')}${!order.sale?action(t('editOrder'),'edit-order'):''}</div><div class="form-actions">${action(t(order.sale?'clearSale':'cancelOrder'),order.sale?'clear-sale':'cancel-order','ghost danger')}</div>`;
    return shell(content);
  }
  function productArt(key, cls='',photo=null) {
    if(photo&&D.photoOK(photo))return `<img class="product-photo ${cls}" alt="${e(t('ownPhoto'))}" src="${photo}">`;
    const safe=Object.prototype.hasOwnProperty.call(C.images,key)?key:'other';
    return `<svg class="product-art ${cls}" viewBox="0 0 100 100" role="img" aria-label="${e(t('image.'+safe))}">${C.images[safe]}</svg>`;
  }
  function catalogRows() {
    const query=D.norm(ui.catalogQuery);
    return state.catalog.filter(p=>(!ui.catalogCategory||p.category===ui.catalogCategory)&&
      (ui.catalogStatus==='archived'?p.archived:!p.archived&&(ui.catalogStatus==='all'||(ui.catalogStatus==='active')===p.active))&&
      (!query||Object.values(p.names).some(n=>D.norm(n).includes(query))))
      .sort((a,b)=>D.catalogName(a,lang()).localeCompare(D.catalogName(b,lang()),lang()));
  }
  function catalogCard(p) {
    const status=p.archived?'archivedProduct':p.active?'activeProduct':'inactiveProduct';
    return `<article class="catalog-card${p.active?'':' catalog-inactive'}" data-catalog-id="${e(p.id)}"><div class="catalog-art">${productArt(p.imageKey,'',p.photo)}</div><div class="catalog-body"><small class="muted">${e(C.categories[p.category][lang()])}</small><h2>${e(D.catalogName(p,lang()))}</h2><span class="badge ${p.active?'fulfilled':'cancelled'}">${p.active?'✓':'○'} ${e(t(status))}</span><p class="number small">${p.defaultPrice===null?e(t('priceNotSet')):e(unit(p.defaultPrice))+' €/'+e(t('unit.'+D.unitOf(p)))}</p><div class="catalog-actions">${p.archived?action(t('restoreProduct'),'catalog-restore','',`data-id="${e(p.id)}"`):action(t('editProduct'),'catalog-edit','',`data-id="${e(p.id)}"`)+action(t(p.active?'deactivateProduct':'activateProduct'),'catalog-toggle','ghost',`data-id="${e(p.id)}"`)}${!p.archived?action(t('deleteProduct'),'catalog-delete','ghost danger',`data-id="${e(p.id)}"`):''}</div></div></article>`;
  }
  function renderCatalogResults() {
    const rows=catalogRows();
    return `<p class="small muted">${e(t('listCount',{n:rows.length}))}</p><div class="catalog-grid">${rows.slice(0,ui.catalogLimit).map(catalogCard).join('')}</div>${!rows.length?`<div class="empty"><h2>${e(t('catalogEmpty'))}</h2></div>`:''}${rows.length>ui.catalogLimit?action(t('showMore'),'catalog-more'):''}`;
  }
  function renderCatalog() {
    return shell(`<h1>${e(t('catalog'))}</h1><p class="muted spacer">${e(t('catalogHint'))}</p><div class="row wrap spacer">${action(t('newCatalogProduct'),'catalog-new','primary')}</div><div class="filters catalog-filters"><input name="catalogSearch" type="search" value="${e(ui.catalogQuery)}" placeholder="${e(t('catalogSearch'))}" aria-label="${e(t('catalogSearch'))}"><select name="catalogCategory" aria-label="${e(t('category'))}">${option('',t('allCategories'),ui.catalogCategory)}${Object.entries(C.categories).map(([id,names])=>option(id,names[lang()],ui.catalogCategory)).join('')}</select><select name="catalogStatus" aria-label="${e(t('catalogStatus'))}">${[['all','catalogAll'],['active','activeProduct'],['inactive','inactiveProduct'],['archived','archivedProduct']].map(([v,l])=>option(v,t(l),ui.catalogStatus)).join('')}</select></div><div id="catalog-results">${renderCatalogResults()}</div><p class="banner small">${e(t('catalogActivationHint'))}</p><p class="small muted spacer">${e(t('catalogImages'))}</p><div class="spacer">${action(t('restoreTemplates'),'catalog-seed')}</div>`,'catalog');
  }
  function initCatalogDraft(id) {
    const p=id?D.catalogById(state,id):null;
    return p?{...D.clone(p),priceRaw:p.defaultPrice===null?'':inputRaw(p.defaultPrice,2)}:{id:null,names:{de:'',en:'',ru:''},category:'beef',imageKey:'steak',unit:'kg',photo:null,active:true,priceRaw:''};
  }
  function renderCatalogForm() {
    const p=ui.draft;
    return shell(`<h1>${e(t(p.id?'editProduct':'newCatalogProduct'))}</h1><form data-form="catalog" class="spacer"><div class="catalog-editor-art">${productArt(p.imageKey,'',p.photo)}</div><div class="form-actions">${action(t('choosePhoto'),'choose-photo')}${p.photo?action(t('removePhoto'),'remove-photo','ghost danger'):''}</div><input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden><p class="small muted">${e(t('photoHint'))}</p>${field(t('catalogNameDE'),'name-de',p.names.de,{attrs:'maxlength="100" required'})}${field(t('catalogNameEN'),'name-en',p.names.en,{attrs:'maxlength="100"'})}${field(t('catalogNameRU'),'name-ru',p.names.ru,{attrs:'maxlength="100"'})}<p class="small muted spacer">${e(t('translationFallback'))}</p><label class="field">${e(t('category'))}<select name="category">${Object.entries(C.categories).map(([id,names])=>option(id,names[lang()],p.category)).join('')}</select></label><label class="field">${e(t('illustration'))}<select name="imageKey">${Object.keys(C.images).map(id=>option(id,t('image.'+id),p.imageKey)).join('')}</select></label>${unitSelect('unit',p.unit)}${field(t('catalogPrice'),'priceRaw',p.priceRaw,{attrs:'inputmode="decimal" maxlength="15"'})}<label class="check-row"><input name="active" type="checkbox"${checked(p.active)}><span>${e(t('catalogEnabled'))}</span></label><p class="small muted">${e(t('quantityUnitNotice'))}</p>${errorBox()}<div class="form-actions"><button type="submit" class="primary" data-testid="save-catalog">${e(t('save'))}</button>${action(t('cancel'),'back')}</div></form>`,'catalog');
  }
  async function pickCatalogProduct() {
    collectDraft();const available=state.catalog.filter(p=>p.active&&!p.archived&&!ui.draft.items.some(i=>i.catalogId===p.id));
    if(!available.length){await dialog(t('catalog'),`<p>${e(t('catalogNoSelectable'))}</p>`);return;}
    const first=available[0];
    const response=await dialog(t('addFromCatalog'),`<label class="field">${e(t('chooseCatalogProduct'))}<select name="catalogChoice">${available.map(p=>option(p.id,D.catalogName(p,lang()),first.id)).join('')}</select></label>${field(t('pricePerKg'),'catalogEventPrice',first.defaultPrice===null?'':inputRaw(first.defaultPrice,2),{attrs:'inputmode="decimal" maxlength="15"'})}<p class="small muted">${e(t('priceSnapshotHint'))}</p>`,[['cancel','cancel',''],['addToDate','add','primary']]);
    if(response!=='add')return;
    const p=D.catalogEventItem(state,modal.querySelector('[name="catalogChoice"]').value,lang(),D.price(modal.querySelector('[name="catalogEventPrice"]').value));
    ui.draft.items=ui.draft.items.filter(i=>i.name.trim()||i.priceRaw.trim());
    ui.draft.items.push({...p,priceRaw:inputRaw(p.price,2)});ui.dirty=true;render();
  }
  function renderItem() {
    const item=D.itemSummary(state,ui.eventId).find(i=>i.id===ui.itemId); D.need(item,'missing');
    return shell(`<div class="kicker">${e(dateText(D.eventById(state,ui.eventId).date))}</div><h1 class="spacer">${e(D.catalogName(item,lang()))}</h1><div class="plan-actual spacer"><div><small>${e(t('planned'))}</small><strong class="number">${e(qty(item.grams,item))}</strong><span class="number">${e(money(item.total))}</span></div><div><small>${e(t('sold'))}</small><strong class="number">${e(qty(item.soldGrams,item))}</strong><span class="number">${e(money(item.soldTotal))}</span></div></div><h2 class="section-title">${e(t('allocations'))}</h2>${item.allocations.length?item.allocations.sort((a,b)=>D.customerName(a.customer).localeCompare(D.customerName(b.customer),lang())).map(a=>`<button type="button" class="card card-button" data-action="order" data-id="${e(a.orderId)}"><div class="row between"><strong>${e(D.customerName(a.customer))}</strong><strong class="number">${e(qty(a.grams,item))}</strong></div><div class="product-meta"><span>${e(t('planned'))}: ${e(money(a.total))}</span><span>${e(t('sold'))}: ${a.sale?e(qty(a.sale.grams,item))+' · '+e(money(D.lineTotal(a.sale.grams,a.sale.price))):'—'}</span></div></button>`).join(''):`<div class="banner">${e(t('noAllocations'))}</div>`}`);
  }
  function initEventDraft(eventId) {
    const event=eventId?D.eventById(state,eventId):null;
    ui.draft=event?{...D.clone(event),items:event.items.map(i=>({...i,priceRaw:inputRaw(i.price,2)}))}:{id:null,date:D.localDate(),time:'',title:'',note:'',items:[{id:D.uuid(),name:'',priceRaw:''}]};
  }
  function renderEventForm() {
    const draft=ui.draft, used=new Set(draft.id?state.orders.filter(o=>o.eventId===draft.id).flatMap(o=>[...o.lines,...(o.sale?.lines||[])].map(l=>l.itemId)):[]);
    return shell(`<h1>${e(t(draft.id?'editDate':'newDate'))}</h1><form data-form="event" class="spacer">${field(t('eventTitle'),'title',draft.title,{attrs:'maxlength="100" required',help:t('eventTitlePlaceholder')})}<div class="field-grid">${field(t('date'),'date',draft.date,{type:'date',attrs:'min="2000-01-01" max="2199-12-31" required'})}${field(t('time'),'time',draft.time,{type:'time'})}</div>${field(t('note'),'note',draft.note,{type:'textarea',attrs:'maxlength="500"'})}<h2 class="section-title">${e(t('assortment'))}</h2><p class="small muted">${e(t('priceSnapshotHint'))}</p><div class="spacer">${draft.items.map((item,n)=>`<section class="card" data-product-index="${n}">${item.imageKey?productArt(item.imageKey,'art-thumb'):''}${field(t('productName'),`itemName-${n}`,item.name,{attrs:`maxlength="100"${disable(used.has(item.id))}`})}<div class="row">${unitSelect(`itemUnit-${n}`,item.unit,used.has(item.id))}${field(t('pricePerKg'),`itemPrice-${n}`,item.priceRaw,{attrs:'inputmode="decimal" maxlength="15"'})}<button type="button" data-action="remove-product" data-index="${n}" class="ghost danger"${disable(used.has(item.id))}>${e(t('remove'))}</button></div><label class="check-row"><input type="checkbox" name="itemActive-${n}"${checked(item.active!==false)}><span>${e(t('eventItemActive'))}</span></label>${item.active===false?`<p class="small muted">${e(t('eventItemInactiveHint'))}</p>`:''}</section>`).join('')}</div>${action(t('addFromCatalog'),'catalog-pick','spacer primary')} ${action(t('addProduct'),'add-product','spacer')}${errorBox()}<div class="form-actions"><button type="submit" class="primary" data-testid="save-event">${e(t('save'))}</button>${action(t('cancel'),'back')}</div></form>`);
  }
  function initOrderDraft(orderId) {
    const event=D.eventById(state,ui.eventId), order=orderId?D.orderById(state,orderId):null;
    ui.draft=order?{id:order.id,customerId:order.customerId,firstName:'',lastName:'',phone:'',note:order.note,lines:order.lines.map(l=>({itemId:l.itemId,weight:inputRaw(l.grams,3)}))}:{id:null,customerId:'',firstName:'',lastName:'',phone:'',note:'',lines:[{itemId:(event.items.find(i=>i.active!==false)||D.fail('inactiveItem')).id,weight:''}]};
  }
  function draftPrice(line) {
    const old=ui.draft.id && state.orders.find(o=>o.id===ui.draft.id), previous=old && old.lines.find(l=>l.itemId===line.itemId);
    return previous?previous.price:D.eventById(state,ui.eventId).items.find(i=>i.id===line.itemId).price;
  }
  function renderOrderForm() {
    const draft=ui.draft,event=D.eventById(state,ui.eventId);
    const customers=[...state.customers].sort((a,b)=>D.customerName(a).localeCompare(D.customerName(b),lang()));
    return shell(`<div class="kicker">${e(dateText(event.date))} · ${e(event.title)}</div><h1 class="spacer">${e(t(draft.id?'editOrder':'newOrder'))}</h1><form data-form="order" class="spacer"><label class="field">${e(t('customerSelect'))}<select name="customerId"${disable(Boolean(draft.id))}>${option('',t('newCustomer'),draft.customerId)}${customers.map(c=>option(c.id,D.customerName(c)+(c.phone?' · '+c.phone:''),draft.customerId)).join('')}</select></label>${!draft.customerId?`<div class="field-grid">${field(t('firstName'),'firstName',draft.firstName,{attrs:'maxlength="100" autocomplete="given-name"'})}${field(t('lastName'),'lastName',draft.lastName,{attrs:'maxlength="100" required autocomplete="family-name"'})}</div>${field(t('phone'),'phone',draft.phone,{type:'tel',attrs:'maxlength="80" autocomplete="tel"'})}`:''}<h2 class="section-title">${e(t('positions'))}</h2>${draft.lines.map((line,n)=>`<section class="card"><label class="field">${e(t('product'))}<select name="lineItem-${n}">${event.items.filter(i=>i.active!==false||i.id===line.itemId).map(i=>option(i.id,D.catalogName(i,lang()),line.itemId)).join('')}</select></label><div class="row">${field(t('quantity')+' ('+t('unit.'+draftUnit(line))+')',`lineWeight-${n}`,line.weight,{attrs:'inputmode="decimal" maxlength="15" required'})}<div class="grow end small"><span class="number">${e(unit(draftPrice(line)))} €/${e(t('unit.'+draftUnit(line)))}</span><div class="number" data-line-total="${n}">—</div></div></div>${draft.lines.length>1?action(t('remove'),'remove-line','ghost danger',`data-index="${n}"`):''}</section>`).join('')}${action(t('addLine'),'add-line','spacer')}${field(t('note'),'note',draft.note,{type:'textarea',attrs:'maxlength="500"'})}<div class="sticky-total"><span>${e(t('orderTotal'))}</span><span class="number" id="draft-total">—</span></div>${errorBox()}<div class="form-actions"><button type="submit" class="primary" data-testid="save-order">${e(t('save'))}</button>${action(t('cancel'),'back')}</div></form>`);
  }
  function initSaleDraft() {
    const order=D.orderById(state,ui.orderId),source=order.sale?order.sale.lines:order.lines;
    ui.draft={complete:order.sale?.complete!==false,lines:source.map(line=>({itemId:line.itemId,weight:order.sale?inputRaw(line.grams,3):'',priceRaw:inputRaw(line.price,2)}))};
  }
  function renderSaleForm() {
    const order=D.orderById(state,ui.orderId),event=D.eventById(state,ui.eventId),customer=state.customers.find(c=>c.id===order.customerId);
    return shell(`<div class="kicker">${e(D.customerName(customer))}</div><h1 class="spacer">${e(t(order.sale?'correctSale':'recordSale'))}</h1><p class="banner spacer">${e(t('saleHint'))}</p><p class="small muted spacer">${e(t('cumulativeHint'))}</p>${action(t('useOrdered'),'copy-quantities','spacer')}<form data-form="sale" class="spacer">${ui.draft.lines.map((line,n)=>{
      const original=order.lines.find(l=>l.itemId===line.itemId),item=original||event.items.find(i=>i.id===line.itemId);
      return `<section class="card sale-item"><h3>${e(D.catalogName(item,lang()))}</h3><p class="muted number">${original?e(t('planned'))+': '+e(qty(original.grams,item))+' · '+e(unit(original.price))+' €/'+e(t('unit.'+D.unitOf(item))):e(t('extraSale'))}</p><div class="quantity-row">${field(t('actualQuantity')+' ('+t('unit.'+D.unitOf(item))+')',`saleWeight-${n}`,line.weight,{attrs:'inputmode="decimal" maxlength="15" required'})}${field(t('actualPrice')+' / '+t('unit.'+D.unitOf(item)),`salePrice-${n}`,line.priceRaw,{attrs:'inputmode="decimal" maxlength="15" required'})}</div><div class="sale-line-total number" data-line-total="${n}">—</div>${!original?action(t('remove'),'remove-sale-line','ghost danger',`data-index="${n}"`):''}</section>`;
    }).join('')}${action(t('addExtraSale'),'extra-sale','spacer')}<label class="check-row spacer"><input type="checkbox" name="complete"${checked(ui.draft.complete)}><span>${e(t('completeSale'))}</span></label><div class="sticky-total"><span>${e(t('saleTotal'))}</span><span class="number" id="draft-total">—</span></div>${errorBox()}<div class="form-actions"><button type="submit" class="primary" data-testid="save-sale">${e(t('saveSale'))}</button>${action(t('cancel'),'back')}</div></form>`);
  }
  function renderAudit(){return shell(`<h1>${e(t('audit'))}</h1><p class="banner spacer">${e(t('auditHint'))}</p>${[...(state.audit||[])].reverse().slice(0,100).map(a=>`<article class="card spacer"><strong>${e(t('audit.'+a.action))}</strong><p class="small muted">${e(new Intl.DateTimeFormat(lang(),{dateStyle:'short',timeStyle:'short'}).format(new Date(a.at)))} · ${e(a.actor)}</p><details><summary>${e(t('details'))}</summary><p class="audit-detail">${e(a.detail)}</p></details></article>`).join('')}`,'settings');}
  async function editPayment(){
    const order=D.orderById(state,ui.orderId),ps=D.paymentSummary(order);
    const result=await dialog(t('payment'),`<p>${e(t('saleTotal'))}: <strong>${e(money(ps.due))}</strong></p><p class="small spacer">${e(t('paymentHint'))}</p>${field(t('received'),'paid',inputRaw(ps.paid,2),{attrs:'inputmode="decimal" maxlength="15"'})}<label class="field">${e(t('paymentMethod'))}<select name="paymentMethod">${['cash','card','other'].map(m=>option(m,t('method.'+m),order.payment?.method||'cash')).join('')}</select></label>`,[['cancel','cancel',''],['save','save','primary']]);
    if(result==='save')commit(D.savePayment(state,order.id,D.price(modal.querySelector('[name="paid"]').value),modal.querySelector('[name="paymentMethod"]').value));
  }
  async function addExtraSale(){
    collectDraft();const event=D.eventById(state,ui.eventId),items=event.items.filter(i=>i.active!==false&&!ui.draft.lines.some(l=>l.itemId===i.id));D.need(items.length,'extraUnavailable');
    const result=await dialog(t('addExtraSale'),`<label class="field">${e(t('product'))}<select name="extraItem">${items.map(i=>option(i.id,D.catalogName(i,lang()),items[0].id)).join('')}</select></label>`,[['cancel','cancel',''],['addToDate','add','primary']]);
    if(result==='add'){const item=items.find(i=>i.id===modal.querySelector('[name="extraItem"]').value);ui.draft.lines.push({itemId:item.id,weight:'',priceRaw:inputRaw(item.price,2)});ui.dirty=true;render();}
  }
  function renderSettings() {
    const rows=[['audit','auditHint','audit','info'],['catalog','catalogHint','catalog','bag'],['editShop','editShopHint','shop-form','shop'],['appearance','skinHint','appearance','skin'],['backup','backupHint','backup','backup'],['restore','restoreHint','restore','restore'],['about','fontNote','about','info']];
    return shell(`${previewBanner()}<h1>${e(t('settings'))}</h1><div class="card spacer"><h2>${e(state.shop.name)}</h2>${[state.shop.owner,state.shop.street,[state.shop.zip,state.shop.city].filter(Boolean).join(' '),state.shop.phone,state.shop.email].filter(Boolean).map(s=>`<p class="muted small">${e(s)}</p>`).join('')}${state.shop.hours?`<p class="note small spacer">${e(state.shop.hours)}</p>`:''}</div>${rows.map(([title,hint,name,img])=>`<button type="button" class="settings-row" data-action="${name}">${icon(img)}<span class="grow">${e(t(title))}<small>${e(t(hint))}</small></span>${icon('next')}</button>`).join('')}<div class="banner warning spacer">${e(t('backupReminder'))}</div>`,'settings');
  }
  function renderShopForm() {
    const d=ui.draft;
    return shell(`<h1>${e(t('editShop'))}</h1><form data-form="shop" class="spacer">${field(t('shopName'),'name',d.name,{attrs:'maxlength="100" required'})}${field(t('owner'),'owner',d.owner,{attrs:'maxlength="200"'})}${field(t('street'),'street',d.street,{attrs:'maxlength="200"'})}<div class="field-grid">${field(t('zip'),'zip',d.zip,{attrs:'maxlength="200"'})}${field(t('city'),'city',d.city,{attrs:'maxlength="200"'})}</div>${field(t('phone'),'phone',d.phone,{type:'tel',attrs:'maxlength="200"'})}${field(t('email'),'email',d.email,{type:'email',attrs:'maxlength="200"'})}${field(t('hours'),'hours',d.hours,{type:'textarea',attrs:'maxlength="500"'})}${errorBox()}<div class="form-actions"><button type="submit" class="primary">${e(t('save'))}</button>${action(t('cancel'),'back')}</div></form>`,'settings');
  }
  function renderAppearance() { return shell(`<h1>${e(t('appearance'))}</h1><p class="muted spacer">${e(t('skinHint'))}</p><section class="spacer">${skins(state.shop.skin)}</section><label class="field spacer">${e(t('language'))}${languageSelect(state.shop.language)}</label><p class="muted small">${e(t('fontNote'))}</p>`,'settings'); }
  function renderBackup() {
    return shell(`<h1>${e(t('backup'))}</h1><p class="banner spacer">${e(t('backupPrivacy'))}</p><form data-form="backup" class="spacer">${field(t('password'),'password','',{type:'password',attrs:'minlength="10" maxlength="200" required autocomplete="new-password"'})}${field(t('repeatPassword'),'repeatPassword','',{type:'password',attrs:'minlength="10" maxlength="200" required autocomplete="new-password"'})}${errorBox()}<button type="submit" class="primary">${e(t('export'))}</button></form>`,'settings');
  }
  function restoreContent() {
    return `<h1>${e(t('restore'))}</h1><p class="banner warning spacer">${e(t('restoreHint'))}</p>${action(t('pickFile'),'pick-file','spacer')}<p id="file-status" class="small muted spacer">${fileText?e(t('fileSelected')):''}</p><input type="file" id="backup-file" accept=".ladle,.json,application/json" hidden><form data-form="restore" class="spacer">${field(t('password'),'password','',{type:'password',attrs:'minlength="10" maxlength="200" required autocomplete="current-password"'})}${errorBox()}<button type="submit" class="primary">${e(t('checkBackup'))}</button></form>`;
  }
  function render() {
    document.documentElement.lang=lang(); document.documentElement.dataset.skin=state.shop?state.shop.skin:wizard.skin;
    if(window.LadleNative && window.LadleNative.appearance) window.LadleNative.appearance(document.documentElement.dataset.skin);
    document.title=(state.shop?state.shop.name:'Lädle')+' · HomenS.AI';
    const routes={audit:renderAudit,catalog:renderCatalog,catalogForm:renderCatalogForm,home:renderHome,event:renderEvent,order:renderOrder,item:renderItem,eventForm:renderEventForm,orderForm:renderOrderForm,saleForm:renderSaleForm,settings:renderSettings,shopForm:renderShopForm,appearance:renderAppearance,backup:renderBackup,restore:()=>state.shop?shell(restoreContent(),'settings'):`<main id="main" class="wizard">${action(t('back'),'wizard-return','ghost')}${restoreContent()}</main>`};
    if(!state.shop && ui.screen!=='restore') app.innerHTML=renderWizard();
    else app.innerHTML=(routes[ui.screen]||renderHome)();
    if(ui.screen==='orderForm'||ui.screen==='saleForm') recalculate();
    window.LadleAppReady=true;
  }
  function collectDraft() {
    if(!ui.draft) return;
    const value=name=>{const node=app.querySelector(`[name="${name}"]`);return node?node.value:undefined;};
    if(ui.screen==='eventForm') {
      for(const k of ['title','date','time','note']) if(value(k)!==undefined) ui.draft[k]=value(k);
      ui.draft.items.forEach((item,n)=>{item.name=value(`itemName-${n}`)??item.name;item.priceRaw=value(`itemPrice-${n}`)??item.priceRaw;item.unit=value(`itemUnit-${n}`)??item.unit??'kg'; const active=app.querySelector(`[name="itemActive-${n}"]`);if(active)item.active=active.checked;});
    } else if(ui.screen==='orderForm') {
      for(const k of ['customerId','firstName','lastName','phone','note']) if(value(k)!==undefined) ui.draft[k]=value(k);
      ui.draft.lines.forEach((line,n)=>{line.itemId=value(`lineItem-${n}`)??line.itemId;line.weight=value(`lineWeight-${n}`)??line.weight;});
    } else if(ui.screen==='saleForm') {ui.draft.lines.forEach((line,n)=>{line.weight=value(`saleWeight-${n}`)??line.weight;line.priceRaw=value(`salePrice-${n}`)??line.priceRaw;});ui.draft.complete=app.querySelector('[name=complete]').checked;}
    else if(ui.screen==='catalogForm'){for(const l of D.LANGS)ui.draft.names[l]=value('name-'+l)??ui.draft.names[l];for(const k of ['category','imageKey','priceRaw','unit'])ui.draft[k]=value(k)??ui.draft[k];const active=app.querySelector('[name="active"]');if(active)ui.draft.active=active.checked;}
    else if(ui.screen==='shopForm') for(const k of ['name','owner','street','zip','city','phone','email','hours']) if(value(k)!==undefined) ui.draft[k]=value(k);
  }
  function recalculate() {
    let total=0,valid=true;
    ui.draft.lines.forEach((line,n)=>{
      let amount=null;try {amount=D.lineTotal(D.quantity(line.weight,draftUnit(line),ui.screen==='saleForm'),ui.screen==='saleForm'?D.price(line.priceRaw):draftPrice(line));total+=amount;} catch(_){valid=false;}
      const el=app.querySelector(`[data-line-total="${n}"]`);if(el) el.textContent=amount===null?'—':money(amount);
    });
    const totalEl=document.getElementById('draft-total');if(totalEl) totalEl.textContent=valid?money(total):'—';
  }
  async function navigate(screen,patch={},force=false) {
    if(ui.dirty&&!force&&!(await confirm('discard',t('discardHint')))) return false;
    if(ui.dirty)clearDraft();
    Object.assign(ui,patch,{screen,dirty:false}); if(!patch.draft) ui.draft=null;
    render(); window.scrollTo(0,0); return true;
  }
  async function back() {
    if(modal.open){modal.close('cancel');return;}
    if(!state.shop){if(ui.screen==='restore'){ui.screen='home';render();}else if(step>1){collectWizard();step--;render();}return;}
    const screen=ui.screen;
    if(screen==='catalogForm')await navigate('catalog');
    else if(['order','item'].includes(screen)) await navigate('event');
    else if(screen==='saleForm') await navigate('order');
    else if(screen==='orderForm') await navigate(ui.draft&&ui.draft.id?'order':'event');
    else if(screen==='eventForm') await navigate(ui.draft&&ui.draft.id?'event':'home');
    else if(['appearance','shopForm','backup','restore'].includes(screen)) await navigate('settings');
    else await navigate('home');
  }
  window.LadleBack=function(){if(modal.open||ui.screen!=='home'||(!state.shop&&step>1)||ui.dirty){back();return true;}return false;};
  async function eventMenu() {
    const event=D.eventById(state,ui.eventId);
    const choices=event.closed?[['reopenDate','reopen']]:[['editDate','edit'],['copyDate','copy'],['closeDate','finish']];
    if(!state.orders.some(o=>o.eventId===event.id)) choices.push(['deleteDate','delete']);
    const picked=await dialog(t('eventMenu'),`<div class="menu-grid">${choices.map(([label,value])=>`<button type="button" data-dialog="${value}"${value==='delete'?' class="danger"':''}>${e(t(label))}</button>`).join('')}</div>`);
    if(picked==='edit') {initEventDraft(event.id);await navigate('eventForm',{draft:ui.draft});}
    if(picked==='copy') {
      const response=await dialog(t('copyDate'),field(t('date'),'copyDate',D.localDate(),{type:'date',attrs:'min="2000-01-01" max="2199-12-31"'}),[['cancel','cancel',''],['save','save','primary']]);
      if(response==='save'){const result=D.copyEvent(state,event.id,modal.querySelector('[name="copyDate"]').value);commit(result.state,'event',{eventId:result.id,query:'',product:'',status:'all'});}
    }
    if(picked==='finish'&&await confirm('closeDate',t('closeConfirm'))) commit(D.setClosed(state,event.id,true));
    if(picked==='reopen'&&await confirm('reopenDate',t('reopenConfirm'))) commit(D.setClosed(state,event.id,false));
    if(picked==='delete'&&await confirm('deleteDate',t('deleteConfirm'))) commit(D.deleteEvent(state,event.id),'home');
  }
  async function chooseDate() {
    const events=[...state.events].sort((a,b)=>a.date.localeCompare(b.date));
    const picked=await dialog(t('chooseDate'),`<div class="menu-grid">${events.map(event=>`<button type="button" data-dialog="${e(event.id)}">${e(dateText(event.date))}<small class="field-help">${e(event.title)}</small></button>`).join('')}</div>`);
    if(events.some(x=>x.id===picked)) navigate('event',{eventId:picked,query:'',product:'',status:'all',limit:50});
  }
  async function editCustomer() {
    const order=D.orderById(state,ui.orderId),c=state.customers.find(c=>c.id===order.customerId);
    const picked=await dialog(t('contactEdit'),`<p class="small muted">${e(t('contactHint'))}</p>${field(t('firstName'),'firstName',c.firstName,{attrs:'maxlength="100"'})}${field(t('lastName'),'lastName',c.lastName,{attrs:'maxlength="100"'})}${field(t('phone'),'phone',c.phone,{type:'tel',attrs:'maxlength="80"'})}${field(t('note'),'customerNote',c.note,{type:'textarea',attrs:'maxlength="500"'})}`,[['cancel','cancel',''],['save','save','primary']]);
    if(picked==='save') commit(D.updateCustomer(state,c.id,{firstName:modal.querySelector('[name="firstName"]').value,lastName:modal.querySelector('[name="lastName"]').value,phone:modal.querySelector('[name="phone"]').value,note:modal.querySelector('[name="customerNote"]').value}));
  }
  const fileRequests=new Map();
  window.LadleNativeResult=function(id,json){const request=fileRequests.get(id);if(!request)return;fileRequests.delete(id);try{const result=JSON.parse(json);result.ok?request.resolve(result):request.reject(new D.DomainError(result.error||'file'));}catch(_){request.reject(new D.DomainError('file'));}};
  function nativeFile(method,text) {return new Promise((resolve,reject)=>{const id=D.uuid();fileRequests.set(id,{resolve,reject});try{if(method==='exportFile')window.LadleNative.exportFile(id,text);else if(method==='choosePhoto')window.LadleNative.choosePhoto(id);else window.LadleNative.importFile(id);}catch(_){fileRequests.delete(id);reject(new D.DomainError('file'));}});}
  async function exportBackup(form) {
    const password=form.elements.password.value;D.need(password===form.elements.repeatPassword.value,'passwordMatch');
    const encrypted=await S.encrypt(state,password);
    if(repo.mode==='android'){const result=await nativeFile('exportFile',encrypted);if(!result.cancelled)toast(t('backupSaved'));}
    else {const blob=new Blob([encrypted],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`Laedle-${D.localDate()}.ladle`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast(t('downloadStarted'));}
    form.reset();
  }
  async function restoreBackup(form) {
    D.need(fileText,'file');const restored=await S.decrypt(fileText,form.elements.password.value);form.elements.password.value='';
    if(await confirm('replaceData',t('replaceHint',{name:restored.shop.name,events:restored.events.length,orders:restored.orders.length}))){commit(restored,'home',{eventId:null,orderId:null});fileText='';toast(t('restored'));}
  }
  async function importPhoto(file){
    D.need(file&&file.size<=10*1024*1024&&['image/jpeg','image/png','image/webp'].includes(file.type),'photo');
    const bitmap=await createImageBitmap(file);try{D.need(bitmap.width>0&&bitmap.height>0&&bitmap.width*bitmap.height<=80000000,'photo');const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const photo=canvas.toDataURL('image/jpeg',0.72);D.need(D.photoOK(photo),'photo');return photo;}finally{bitmap.close();}
  }
  async function recoverHistory(){
    const info=JSON.parse(window.LadleNative.recoveryList());D.need(info.ok,'storage');const rows=info.history.filter(r=>r.valid);D.need(rows.length,'noHistory');
    const choice=await dialog(t('recoverHistory'),`<p>${e(t('recoverHint'))}</p><div class="menu-grid">${rows.map(r=>`<button type="button" data-dialog="${r.revision}">${e(t('revision'))} ${r.revision} · ${e(new Date(r.at).toLocaleString(lang()))}</button>`).join('')}</div>`);
    const selected=rows.find(r=>String(r.revision)===choice);if(!selected||!await confirm('recoverHistory',t('recoverHint')))return;
    const result=JSON.parse(window.LadleNative.restoreHistory(info.revision,selected.revision));D.need(result.ok,result.error||'storage');clearDraft();window.location.reload();
  }
  async function handleAction(name,button) {
    if(name==='resume-draft'){D.need(pendingDraft&&pendingDraft.revision===revision,'staleDraft');const saved=pendingDraft.ui;Object.assign(ui,saved,{dirty:true});pendingDraft=null;render();return;}
    if(name==='discard-draft'){if(await confirm('discardDraft',t('discardHint'))){clearDraft();render();}return;}
    if(name==='recover-history')return recoverHistory();
    if(name==='emergency-restore'){const info=JSON.parse(window.LadleNative.recoveryList());D.need(info.ok,'storage');revision=info.revision;ui.screen='restore';render();return;}
    if(name==='audit')return navigate('audit');
    if(name==='payment')return editPayment();
    if(name==='extra-sale')return addExtraSale();
    if(name==='remove-sale-line'){collectDraft();ui.draft.lines.splice(Number(button.dataset.index),1);ui.dirty=true;render();return;}
    if(name==='choose-photo'){collectDraft();if(repo.mode==='android'){const result=await nativeFile('choosePhoto');if(!result.cancelled){ui.draft.photo=result.photo;ui.dirty=true;render();}}else document.getElementById('photo-file').click();return;}
    if(name==='remove-photo'){collectDraft();ui.draft.photo=null;ui.dirty=true;render();return;}
    if(name==='catalog')return navigate('catalog');
    if(name==='catalog-new'||name==='catalog-edit')return navigate('catalogForm',{draft:initCatalogDraft(name==='catalog-edit'?button.dataset.id:null)});
    if(name==='catalog-pick')return pickCatalogProduct();
    if(name==='catalog-toggle'){const p=D.catalogById(state,button.dataset.id);commit(D.setCatalogActive(state,p.id,!p.active));return;}
    if(name==='catalog-delete'){const id=button.dataset.id;if(await confirm('deleteProduct',t(D.catalogUsed(state,id)?'archiveProductConfirm':'deleteProductConfirm')))commit(D.deleteCatalogProduct(state,id));return;}
    if(name==='catalog-restore'){commit(D.restoreCatalogProduct(state,button.dataset.id));toast(t('restoreProductHint'));return;}
    if(name==='catalog-seed'&&await confirm('restoreTemplates',t('restoreTemplatesConfirm'))){commit(D.seedCatalog(state));return;}
    if(name==='catalog-more'){ui.catalogLimit+=40;document.getElementById('catalog-results').innerHTML=renderCatalogResults();return;}
    if(name==='back')return back();
    if(name==='home')return navigate('home');
    if(name==='settings')return navigate('settings');
    if(name==='wizard-back'){collectWizard();step--;render();return;}
    if(name==='wizard-restore'){collectWizard();ui.screen='restore';render();return;}
    if(name==='wizard-return'){ui.screen='home';render();return;}
    if(name==='event')return navigate('event',{eventId:button.dataset.id,tab:'customers',query:'',product:'',status:'all',limit:50});
    if(name==='new-event'||name==='edit-event') {initEventDraft(name==='edit-event'?ui.eventId:null);return navigate('eventForm',{draft:ui.draft});}
    if(name==='event-menu')return eventMenu();
    if(name==='choose-date')return chooseDate();
    if(name==='tab'){ui.tab=button.dataset.tab;ui.query='';ui.product='';ui.limit=50;render();return;}
    if(name==='direction'){ui.direction=ui.direction==='asc'?'desc':'asc';render();return;}
    if(name==='more'){ui.limit+=50;refreshResults();return;}
    if(name==='order')return navigate('order',{orderId:button.dataset.id,eventId:D.orderById(state,button.dataset.id).eventId});
    if(name==='item')return navigate('item',{itemId:button.dataset.id});
    if(name==='new-order'||name==='edit-order'){initOrderDraft(name==='edit-order'?ui.orderId:null);return navigate('orderForm',{draft:ui.draft});}
    if(name==='sale-form'){initSaleDraft();return navigate('saleForm',{draft:ui.draft});}
    if(name==='copy-quantities'){collectDraft();const order=D.orderById(state,ui.orderId);ui.draft.lines.forEach(l=>{l.weight=inputRaw((order.lines.find(x=>x.itemId===l.itemId)?.grams||0),3);});ui.dirty=true;render();return;}
    if(name==='add-product'){collectDraft();ui.draft.items.push({id:D.uuid(),name:'',priceRaw:''});ui.dirty=true;render();return;}
    if(name==='remove-product'){collectDraft();ui.draft.items.splice(Number(button.dataset.index),1);ui.dirty=true;render();return;}
    if(name==='add-line'){collectDraft();const event=D.eventById(state,ui.eventId),item=event.items.find(i=>i.active!==false&&!ui.draft.lines.some(l=>l.itemId===i.id));D.need(item,'reference');ui.draft.lines.push({itemId:item.id,weight:''});ui.dirty=true;render();return;}
    if(name==='remove-line'){collectDraft();ui.draft.lines.splice(Number(button.dataset.index),1);ui.dirty=true;render();return;}
    if(name==='cancel-order'&&await confirm('cancelOrder',t('cancelOrderConfirm'))){commit(D.cancelOrder(state,ui.orderId));return;}
    if(name==='uncancel-order'){commit(D.cancelOrder(state,ui.orderId,false));return;}
    if(name==='clear-sale'&&await confirm('clearSale',t('clearSaleConfirm'))){commit(D.clearSale(state,ui.orderId));return;}
    if(name==='edit-customer')return editCustomer();
    if(name==='shop-form')return navigate('shopForm',{draft:D.clone(state.shop)});
    if(['appearance','backup','restore'].includes(name)){fileText='';return navigate(name);}
    if(name==='about')return dialog(t('about'),`<p>HomenS.AI · Lädle Mini Local 0.3.0</p><p>${e(t('aboutText'))}</p><p>${e(t('moneyNote'))}</p><p class="small muted">${e(t('fontNote'))}</p>`);
    if(name==='pick-file'){
      if(repo.mode==='android'){const result=await nativeFile('importFile');if(!result.cancelled){fileText=result.text;document.getElementById('file-status').textContent=t('fileSelected');}}
      else document.getElementById('backup-file').click();return;
    }
    if(name==='reload')window.location.reload();
  }
  async function submit(form) {
    const kind=form.dataset.form;
    if(kind==='wizard'){
      collectWizard();D.shopData(wizard);
      if(step<3){step++;render();window.scrollTo(0,0);return;}
      let next=D.setup(state,wizard);if(wizard.demo)next=D.demo(next);commit(next,'home');return;
    }
    collectDraft();
    if(kind==='event'){
      const input={...ui.draft,items:ui.draft.items.filter(i=>i.name.trim()||i.priceRaw.trim()).map(i=>({...i,price:D.price(i.priceRaw)}))};
      const result=D.saveEvent(state,input);commit(result.state,'event',{eventId:result.id,tab:'customers',query:'',product:'',status:'all'});return;
    }
    if(kind==='catalog'){const d=ui.draft;const result=D.saveCatalogProduct(state,{...d,defaultPrice:d.priceRaw.trim()===''?null:D.price(d.priceRaw)});commit(result.state,'catalog');return;}
    if(kind==='order'){
      const d=ui.draft,input={id:d.id,eventId:ui.eventId,customerId:d.customerId,customer:{firstName:d.firstName,lastName:d.lastName,phone:d.phone,note:''},note:d.note,lines:d.lines.map(l=>({itemId:l.itemId,grams:D.quantity(l.weight,draftUnit(l))}))};
      const result=D.saveOrder(state,input);commit(result.state,'order',{orderId:result.id});return;
    }
    if(kind==='sale'){commit(D.saveSale(state,ui.orderId,ui.draft.lines.map(l=>({itemId:l.itemId,grams:D.quantity(l.weight,draftUnit(l),true),price:D.price(l.priceRaw)})),ui.draft.complete),'order');return;}
    if(kind==='shop'){commit(D.updateShop(state,ui.draft),'settings');return;}
    if(kind==='backup')return exportBackup(form);
    if(kind==='restore')return restoreBackup(form);
  }
  document.addEventListener('click',async event=>{
    const modalButton=event.target.closest('[data-dialog]');if(modalButton){modal.close(modalButton.dataset.dialog);return;}
    const button=event.target.closest('[data-action]');if(!button||busy)return;
    try{await handleAction(button.dataset.action,button);stashDraft();}catch(error){showError(error);}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();if(busy)return;
    busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await submit(form);stashDraft();}catch(error){showError(error);}finally{busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
  });
  app.addEventListener('input',event=>{
    if(!state.shop){collectWizard();stashDraft();return;}
    if(event.target.name==='catalogSearch'){ui.catalogQuery=event.target.value;ui.catalogLimit=40;document.getElementById('catalog-results').innerHTML=renderCatalogResults();return;}
    if(event.target.name==='search'){ui.query=event.target.value;ui.limit=50;refreshResults();return;}
    if(ui.draft){ui.dirty=true;collectDraft();if(ui.screen==='orderForm'||ui.screen==='saleForm')recalculate();stashDraft();}
  });
  app.addEventListener('change',async event=>{
    try{
      const name=event.target.name;
      if(event.target.id==='photo-file'){const file=event.target.files?.[0];if(file){collectDraft();ui.draft.photo=await importPhoto(file);ui.dirty=true;render();stashDraft();}return;}
      if(event.target.id==='backup-file'){
        const file=event.target.files&&event.target.files[0];if(!file)return;D.need(file.size<=12*1024*1024,'limit');fileText=await file.text();document.getElementById('file-status').textContent=file.name;return;
      }
      if(!state.shop){collectWizard();if(name==='language')render();if(name==='skin')document.documentElement.dataset.skin=wizard.skin;stashDraft();return;}
      if(ui.screen==='catalog'&&['catalogCategory','catalogStatus'].includes(name)){ui[name]=event.target.value;ui.catalogLimit=40;document.getElementById('catalog-results').innerHTML=renderCatalogResults();return;}
      if(ui.screen==='catalogForm'&&['category','imageKey','unit'].includes(name)){collectDraft();ui.dirty=true;render();return;}
      if(ui.screen==='appearance'&&(name==='skin'||name==='language')){commit(D.updateShop(state,{...state.shop,[name]:event.target.value}));return;}
      if(ui.screen==='event'&&['sort','product','status'].includes(name)){ui[name]=event.target.value;ui.limit=50;refreshResults();return;}
      if(ui.screen==='orderForm'&&(name==='customerId'||name.startsWith('lineItem-'))){collectDraft();ui.dirty=true;render();return;}
    }catch(error){showError(error);}
  });
  document.addEventListener('change',event=>{if(event.target.name==='catalogChoice'){const p=D.catalogById(state,event.target.value);modal.querySelector('[name="catalogEventPrice"]').value=p.defaultPrice===null?'':inputRaw(p.defaultPrice,2);}});
  window.LadleFlushDraft=stashDraft;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stashDraft();});
  window.addEventListener('beforeunload',event=>{stashDraft();if(ui.dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('storage',event=>{if(event.key===S.KEY)showError(new D.DomainError('conflict'));});
  try{const loaded=repo.load();state=loaded.state;revision=loaded.revision;try{pendingDraft=draftStore.load();if(pendingDraft?.wizard&&pendingDraft.revision===revision&&!state.shop){wizard=pendingDraft.wizard;step=pendingDraft.step;}}catch(_){pendingDraft=null;}render();}
  catch(error){state=D.emptyState();app.innerHTML=`<main id="main"><h1>Lädle</h1><div class="error-box">${e(t('fatal'))}</div>${action(t('retry'),'reload','primary')}${repo.mode==='android'?action(t('recoverHistory'),'recover-history','spacer')+action(t('restore'),'emergency-restore','spacer'):''}</main>`;}
})();
