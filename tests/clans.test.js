import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{#m=new Map();getItem(k){return this.#m.has(k)?this.#m.get(k):null;}setItem(k,v){this.#m.set(k,String(v));}removeItem(k){this.#m.delete(k);}}
globalThis.localStorage=new MemoryStorage();
const {requestClan,approveClanRequest,rejectClanRequest,shieldActive,buyItem,SHOP}=await import('../clans.js');
const base=()=>({resources:{gold:10000},clans:[{id:'c1',name:'Test',owner:'me',members:['me']}],myClan:'c1',players:[{id:'me',name:'Me',clanId:'c1',clanRole:'owner'},{id:'p1',name:'Player'}],sysMsgs:[],clanRequests:[],shield:null});
test('clan request waits for owner approval',()=>{const s=base();const req=requestClan(s,'c1','p1');assert.equal(req.ok,true);assert.equal(s.clans[0].members.includes('p1'),false);const id=s.clanRequests[0].id;assert.equal(approveClanRequest(s,id,'me').ok,true);assert.equal(s.clans[0].members.includes('p1'),true);});
test('only clan owner can approve and rejection records status',()=>{const s=base();requestClan(s,'c1','p1');const id=s.clanRequests[0].id;assert.equal(approveClanRequest(s,id,'p1').ok,false);assert.equal(rejectClanRequest(s,id,'me').ok,true);assert.equal(s.clanRequests[0].status,'rejected');});
test('protection purchase deducts the price once and activates shield',()=>{const s=base();const before=s.resources.gold;const r=buyItem(s,'protection12');assert.equal(r.ok,true);assert.equal(s.resources.gold,before-SHOP.protection12.cost);assert.equal(shieldActive(s),true);});
