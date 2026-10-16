/* Persistence and encrypted portable backups. No network APIs. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./core.js') : root.LadleDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LadleStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const KEY = 'homensai.laedle.snapshot.v1';
  function parse(text) { try { return JSON.parse(text); } catch (_) { D.fail('data'); } }
  class BrowserRepository {
    constructor(storage) { this.storage = storage; this.mode = 'browser'; }
    load() {
      let text; try { text = this.storage.getItem(KEY); } catch (_) { D.fail('storage'); }
      if (!text) return { revision: 0, state: D.emptyState() };
      const envelope = parse(text);
      D.need(Number.isSafeInteger(envelope.revision) && envelope.revision > 0, 'data');
      return { revision: envelope.revision, state: D.upgradeState(envelope.state) };
    }
    save(expectedRevision, state) {
      D.assertState(state); const current = this.load(); D.need(current.revision === expectedRevision, 'conflict');
      const revision = expectedRevision + 1;
      try { this.storage.setItem(KEY, JSON.stringify({ revision, state })); } catch (_) { D.fail('storage'); }
      return revision;
    }
  }
  class NativeRepository {
    constructor(bridge) { this.bridge = bridge; this.mode = 'android'; }
    call(method, ...args) {
      const result = parse(this.bridge[method](...args));
      if (!result.ok) D.fail(result.error || 'storage');
      return result;
    }
    load() { const result = this.call('load'); return { revision: result.revision, state: D.upgradeState(result.state || D.emptyState()) }; }
    save(revision,state) { D.assertState(state); return this.call('save', revision, JSON.stringify(state)).revision; }
  }
  function b64(bytes) { let text = ''; for (let i=0; i<bytes.length; i+=16384) text += String.fromCharCode(...bytes.subarray(i,i+16384)); return btoa(text); }
  function from64(text, max) {
    D.need(typeof text === 'string' && text.length <= max && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text), 'backup');
    try { return Uint8Array.from(atob(text), c => c.charCodeAt(0)); } catch (_) { D.fail('backup'); }
  }
  const FORMAT = 'HomenS.AI-Laedle-AES256GCM';
  const ITERATIONS = 210000;
  function passwordOK(password) { D.need(typeof password === 'string' && password.length >= 10 && password.length <= 200, 'password'); }
  async function derive(password, salt) {
    D.need(globalThis.crypto && globalThis.crypto.subtle, 'crypto');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:ITERATIONS, hash:'SHA-256' }, material, { name:'AES-GCM',length:256 }, false, ['encrypt','decrypt']);
  }
  async function encrypt(state,password) {
    passwordOK(password); D.assertState(state); D.need(state.shop, 'shop');
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await derive(password,salt);
    const plaintext = new TextEncoder().encode(JSON.stringify(state)); D.need(plaintext.length <= D.LIMIT.bytes, 'limit');
    const data = await crypto.subtle.encrypt({ name:'AES-GCM',iv,additionalData:new TextEncoder().encode(FORMAT + ':1') },key,plaintext);
    return JSON.stringify({ format:FORMAT, version:1, kdf:'PBKDF2-SHA256', iterations:ITERATIONS, salt:b64(salt), iv:b64(iv), data:b64(new Uint8Array(data)) });
  }
  async function decrypt(text,password) {
    passwordOK(password); D.need(typeof text === 'string' && text.length <= 12 * 1024 * 1024, 'backup');
    const file = parse(text);
    D.need(file && file.format === FORMAT && file.version === 1 && file.kdf === 'PBKDF2-SHA256' && file.iterations === ITERATIONS, 'backup');
    const salt = from64(file.salt,32), iv = from64(file.iv,24), data = from64(file.data,12 * 1024 * 1024);
    D.need(salt.length === 16 && iv.length === 12 && data.length > 16, 'backup');
    const key = await derive(password,salt); let plain;
    try { plain = await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(FORMAT + ':1')},key,data); }
    catch (_) { D.fail('decrypt'); }
    D.need(plain.byteLength <= D.LIMIT.bytes, 'limit');
    const state = D.upgradeState(parse(new TextDecoder('utf-8',{ fatal:true }).decode(plain)));
    D.need(state.shop, 'shop'); return state;
  }
  const DRAFT_KEY='homensai.laedle.draft.v1';
  class DraftStore {
    constructor(storage,mode='browser'){this.storage=storage;this.mode=mode;}
    load(){
      let raw;if(this.mode==='android'){const r=parse(this.storage.readDraft());D.need(r.ok,'storage');raw=r.text;}else raw=this.storage.getItem(DRAFT_KEY);
      if(!raw)return null;D.need(raw.length<=750000,'data');const d=parse(raw);
      D.need(d.version===1&&Number.isSafeInteger(d.revision)&&d.revision>=0&&Number.isInteger(d.step)&&d.step>=1&&d.step<=3,'data');
      if(d.wizard){D.shopData(d.wizard);}else D.need(d.ui&&['eventForm','orderForm','saleForm','catalogForm','shopForm'].includes(d.ui.screen)&&d.ui.draft&&typeof d.ui.draft==='object','data');
      return d;
    }
    save(draft){const text=JSON.stringify(draft);D.need(text.length<=750000,'limit');if(this.mode==='android'){const r=parse(this.storage.saveDraft(text));D.need(r.ok,'storage');}else this.storage.setItem(DRAFT_KEY,text);}
    clear(){if(this.mode==='android'){const r=parse(this.storage.saveDraft(''));D.need(r.ok,'storage');}else this.storage.removeItem(DRAFT_KEY);}
  }
  return Object.freeze({ DraftStore,DRAFT_KEY, KEY, BrowserRepository, NativeRepository, encrypt, decrypt, parse });
});
