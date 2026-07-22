const o1js = await import('o1js');
o1js.setProofSystemBackend('rust');
const { Cache, Mina } = o1js;
const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);
const { FungibleTokenAdmin } = await import('./build/src/index.js');
const t=Date.now();
try { const {verificationKey:vk}=await FungibleTokenAdmin.compile({cache:Cache.FileSystem('/tmp/lumina-testcache')});
  console.error(`[done] vk=${vk.hash.toString()} (${Math.round((Date.now()-t)/1000)}s)`);
} catch(e){ console.error('[err]', (e.message||'').split('\n')[0]); }
