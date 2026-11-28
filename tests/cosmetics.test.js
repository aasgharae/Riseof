import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_AVATARS,HERO_SKINS,CASTLE_SKINS,DEFAULT_AVATAR_ID,seasonCosmetics} from '../cosmetics.js';
import {finalizeSeason} from '../season.js';

test('only four fixed base profile characters exist: two female and two male',()=>{
  assert.equal(BASE_AVATARS.length,4);
  assert.equal(BASE_AVATARS.filter(x=>x.gender==='دختر').length,2);
  assert.equal(BASE_AVATARS.filter(x=>x.gender==='پسر').length,2);
  assert.equal(new Set(BASE_AVATARS.map(x=>x.id)).size,4);
  assert.ok(BASE_AVATARS.some(x=>x.id===DEFAULT_AVATAR_ID));
});

test('season champion receives one hero skin and one castle skin',()=>{
  const now=Date.now();
  const S={season:{id:1,start:now-1000,end:now,bossStart:now-1000},boss:{dmg:999999,hits:1,snap:[]},
    resources:{gold:0,food:0,wood:0,stone:0,iron:0},cmd:{emblems:0},profile:{name:'قهرمان',avatarId:DEFAULT_AVATAR_ID},players:[{id:'me'}],pastSeasons:[]};
  const result=finalizeSeason(S,now);
  const prize=seasonCosmetics(1);
  assert.equal(result.rank,1);
  assert.ok(S.profile.unlockedHeroSkins.includes(prize.hero.id));
  assert.ok(S.profile.unlockedCastleSkins.includes(prize.castle.id));
  assert.equal(S.players[0].profile.avatarId,DEFAULT_AVATAR_ID);
  assert.ok(HERO_SKINS.length>=4 && CASTLE_SKINS.length>=4);
});

test('all four base portraits have bundled image assets and no upload flow', async()=>{
  const fs = await import('node:fs');
  for (const avatar of BASE_AVATARS) {
    assert.ok(avatar.image);
    assert.ok(fs.existsSync(new URL('../' + avatar.image, import.meta.url)));
  }
});

test('season rewards update permanent seasonal profile statistics',()=>{
  const now=Date.now();
  const S={season:{id:4,start:now-1000,end:now,bossStart:now-1000},boss:{dmg:999999,hits:1,snap:[]},
    resources:{gold:0,food:0,wood:0,stone:0,iron:0},cmd:{emblems:0},profile:{name:'قهرمان',avatarId:DEFAULT_AVATAR_ID},players:[],pastSeasons:[],stats:{}};
  const result=finalizeSeason(S,now);
  assert.equal(result.rank,1);
  assert.equal(S.stats.seasonParticipations,1);
  assert.equal(S.stats.seasonTop10,1);
  assert.equal(S.stats.seasonWins,1);
  assert.equal(S.pastSeasons[0].season,4);
});
