import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{#m=new Map();getItem(k){return this.#m.has(k)?this.#m.get(k):null;}setItem(k,v){this.#m.set(k,String(v));}removeItem(k){this.#m.delete(k);}}
globalThis.localStorage=new MemoryStorage();
const {requestClan,approveClanRequest,rejectClanRequest,shieldActive,breakShield,buyItem,buyShield,SHOP}=await import('../clans.js');
const base=()=>({resources:{gold:10000},clans:[{id:'c1',name:'Test',owner:'me',members:['me']}],myClan:'c1',players:[{id:'me',name:'Me',clanId:'c1',clanRole:'owner'},{id:'p1',name:'Player'}],sysMsgs:[],clanRequests:[],shield:null});
test('clan request waits for owner approval',()=>{const s=base();const req=requestClan(s,'c1','p1');assert.equal(req.ok,true);assert.equal(s.clans[0].members.includes('p1'),false);const id=s.clanRequests[0].id;assert.equal(approveClanRequest(s,id,'me').ok,true);assert.equal(s.clans[0].members.includes('p1'),true);});
test('only clan owner can approve and rejection records status',()=>{const s=base();requestClan(s,'c1','p1');const id=s.clanRequests[0].id;assert.equal(approveClanRequest(s,id,'p1').ok,false);assert.equal(rejectClanRequest(s,id,'me').ok,true);assert.equal(s.clanRequests[0].status,'rejected');});
test('gold cannot buy protection or non-resource items',()=>{const s=base();const before=s.resources.gold;assert.equal(buyItem(s,'protection12').ok,false);assert.equal(buyShield(s,24).ok,false);assert.equal(s.resources.gold,before);});

test('attacking removes the free starter shield',()=>{const s=base();assert.equal(shieldActive(s),true);assert.equal(breakShield(s),true);assert.equal(shieldActive(s),false);assert.equal(breakShield(s),false);});

test('gold can only buy primary resource packs',()=>{const s=base();const before=s.resources.gold;assert.equal(buyItem(s,'wood').ok,true);assert.equal(s.resources.gold,before-SHOP.wood.cost);assert.equal(s.resources.wood,SHOP.wood.amount);});
