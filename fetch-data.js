/**
 * Victoria VR — On-Chain Data Fetcher
 * Runs via GitHub Actions every 10 minutes.
 * Writes JSON snapshots to data/ for the dashboard to consume.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Addresses ──────────────────────────────────────────────────
const VR_TOKEN  = '0x7d5121505149065b562C789A0145eD750e6E8cdD';
const NTT_MGR   = '0xC721f339fEC6aFe1C9adFc11E2ad2545aE26eA15';
const NTT_EXEC  = '0xD2D9c936165a85F27a5a7e07aFb974D022B89463';
const WORMHOLE  = '0x461169e7132bAF37a42aa0CDff597d7FC29D96e5';
const SMART_ACC = '0x49719D256A5eA16bFa579ea16E95bea9fa41A452';
const MEXC      = '0x9642b23Ed1E01Df1092B92641051881a322F5D4E';
const DEPLOYER  = '0xAe0197E27B6F6DBbcf6CdecD5aB5f1D56FE51859';
const UNI_POOL  = '0x4085cAFb2c519e6bf69Ad410d91dbb6139948366';
const MEV_BOT   = '0xd862CDcfEB856C32B3C4F7563f4811D8Ddfd42e2';

const WATCH_WALLETS = [
  { addr: MEXC,      name: 'MEXC Hot Wallet',   cls: 'lbl-mexc'     },
  { addr: SMART_ACC, name: 'EIP-7702 Account',  cls: 'lbl-account'  },
  { addr: NTT_MGR,   name: 'NTT Manager ETH',   cls: 'lbl-ntt'      },
  { addr: DEPLOYER,  name: 'VR Land Deployer',  cls: 'lbl-deployer' },
  { addr: MEV_BOT,   name: 'MEV Bot',           cls: 'lbl-mev'      },
  { addr: UNI_POOL,  name: 'Uniswap V2 Pool',   cls: 'lbl-pool'     },
];

const BS  = 'https://eth.blockscout.com/api/v2';
const CG  = 'https://api.coingecko.com/api/v3';
const CG_KEY = process.env.COINGECKO_API_KEY || '';
const DATA_DIR = path.join(__dirname, '..', 'data');

// ── Fetch helper ───────────────────────────────────────────────
function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'vr-dashboard/1.0' } }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(null); }
      });
    });
    req.on('error', (e) => { console.error('[fetch error]', url, e.message); resolve(null); });
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
  });
}

function save(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  const payload = {
    fetched_at: new Date().toISOString(),
    data
  };
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));
  console.log(`✓ Saved ${filename} (${JSON.stringify(data).length} chars)`);
}

// ── Fetchers ───────────────────────────────────────────────────
async function fetchBridgeTransfers() {
  console.log('Fetching bridge transfers...');
  const d = await get(`${BS}/addresses/${NTT_MGR}/token-transfers?token=${VR_TOKEN}&type=ERC-20&limit=50`);
  if (!d?.items) { console.warn('  No bridge data'); return; }

  const nttLow = NTT_MGR.toLowerCase();
  const locks   = d.items.filter(tx => (tx.to?.hash || '').toLowerCase() === nttLow);
  const unlocks = d.items.filter(tx => (tx.from?.hash || '').toLowerCase() === nttLow);

  // Extract price from token metadata if present
  const tokenMeta = d.items[0]?.token || null;

  save('bridge.json', { locks, unlocks, tokenMeta, total: d.items.length });
  console.log(`  Locks: ${locks.length}, Unlocks: ${unlocks.length}`);
}

async function fetchHolders() {
  console.log('Fetching token holders...');
  const d = await get(`${BS}/tokens/${VR_TOKEN}/holders`);
  if (!d?.items) { console.warn('  No holder data'); return; }
  save('holders.json', { holders: d.items });
  console.log(`  Holders fetched: ${d.items.length}`);
}

async function fetchRecentTransfers() {
  console.log('Fetching recent token transfers...');
  const d = await get(`${BS}/tokens/${VR_TOKEN}/transfers?limit=50`);
  if (!d?.items) { console.warn('  No transfer data'); return; }
  save('transfers.json', { transfers: d.items });
  console.log(`  Transfers fetched: ${d.items.length}`);
}

async function fetchPrice() {
  console.log('Fetching price data...');
  const keyParam = CG_KEY ? `&x_cg_demo_api_key=${CG_KEY}` : '';

  const [price, spark] = await Promise.all([
    get(`${CG}/simple/price?ids=victoria-vr&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true${keyParam}`),
    get(`${CG}/coins/victoria-vr/market_chart?vs_currency=usd&days=7&interval=daily${keyParam}`)
  ]);

  const priceData = price?.['victoria-vr'] || null;
  const sparkData = spark?.prices?.map(p => p[1]) || [];

  save('price.json', { price: priceData, sparkline: sparkData });
  console.log(`  Price: $${priceData?.usd ?? 'N/A'}`);
}

async function fetchWalletBalances() {
  console.log('Fetching wallet balances...');
  const results = await Promise.all(
    WATCH_WALLETS.map(async (w) => {
      const d = await get(`${BS}/addresses/${w.addr}/token-balances`);
      let balance = '0';
      if (Array.isArray(d)) {
        const vrBal = d.find(t =>
          (t.token?.address_hash || t.token?.address || '').toLowerCase() === VR_TOKEN.toLowerCase()
        );
        if (vrBal) balance = vrBal.value;
      }
      return { ...w, balance };
    })
  );
  save('wallets.json', { wallets: results });
  console.log(`  Wallets fetched: ${results.length}`);
}

async function fetchDeployerActivity() {
  console.log('Fetching deployer activity...');
  const d = await get(`${BS}/addresses/${DEPLOYER}/transactions?limit=10`);
  if (!d?.items) { console.warn('  No deployer data'); return; }
  save('deployer.json', { transactions: d.items });
  console.log(`  Deployer txs: ${d.items.length}`);
}

async function fetchWormholeActivity() {
  console.log('Fetching Wormhole transceiver activity...');
  const d = await get(`${BS}/addresses/${WORMHOLE}/transactions?limit=20`);
  if (!d?.items) { console.warn('  No wormhole data'); return; }
  save('wormhole.json', { transactions: d.items });
  console.log(`  Wormhole txs: ${d.items.length}`);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n[${new Date().toISOString()}] Starting VR data fetch...`);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Run all fetches — don't let one failure block others
  const tasks = [
    fetchBridgeTransfers(),
    fetchHolders(),
    fetchRecentTransfers(),
    fetchPrice(),
    fetchWalletBalances(),
    fetchDeployerActivity(),
    fetchWormholeActivity(),
  ];

  const results = await Promise.allSettled(tasks);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) {
    console.warn(`\n⚠ ${failed.length} task(s) failed:`);
    failed.forEach(f => console.warn(' ', f.reason));
  }

  // Write a manifest with last-fetch timestamp
  save('manifest.json', {
    last_fetch: new Date().toISOString(),
    sources: ['blockscout', 'coingecko'],
    files: ['bridge.json', 'holders.json', 'transfers.json', 'price.json', 'wallets.json', 'deployer.json', 'wormhole.json'],
  });

  console.log('\n✅ Fetch complete.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
