import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('section renderer no longer injects unrelated global tabs',()=>{
  assert.doesNotMatch(app,/ER_SEG/);
  assert.doesNotMatch(app,/sheetSeg/);
  assert.match(app,/if\(cur==='hospital'\)/);
  assert.match(app,/if\(cur==='train'\)/);
  assert.match(app,/if\(cur==='cmd'\)/);
});

test('shop and clan are separate destinations without cross-navigation tabs',()=>{
  const clan=app.slice(app.indexOf('function renderClan()'),app.indexOf('window.doCreateClan'));
  const shop=app.slice(app.indexOf('function renderShop()'),app.indexOf('window.doBuy'));
  assert.doesNotMatch(clan,/openSheet\('shop'\)/);
  assert.doesNotMatch(shop,/openSheet\('clan'\)/);
});

test('clan chat has its own section and is not a messenger tab',()=>{
  assert.match(app,/if\(cur==='clanchat'\)\{renderClanChat\(\);return;\}/);
  assert.match(app,/clanchat/);
  assert.match(app,/const MSG_TABS=\[\['inbox'/);
  assert.doesNotMatch(app,/const MSG_TABS=\[[^;]*clan/);
});

test('main navigation uses custom SVG assets instead of emoji glyphs',()=>{
  assert.match(app,/assets\/ui\/'\+ic\+'\.svg/);
  assert.match(html,/assets\/ui\/messages\.svg/);
  assert.match(html,/assets\/ui\/food\.svg/);
});
