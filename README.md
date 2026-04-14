# Victoria VR — On-Chain Intelligence Dashboard

Private dashboard for monitoring $VR token on-chain activity: bridge flows, Wormhole NTT, whale tracking, anomaly detection.

## Architecture

```
GitHub Actions (every 10 min)
  └─ scripts/fetch-data.js
       ├─ Blockscout ETH API  →  data/bridge.json
       ├─ Blockscout ETH API  →  data/holders.json
       ├─ Blockscout ETH API  →  data/transfers.json
       ├─ Blockscout ETH API  →  data/wormhole.json
       ├─ Blockscout ETH API  →  data/deployer.json
       ├─ Blockscout ETH API  →  data/wallets.json
       ├─ CoinGecko API       →  data/price.json
       └─ data/manifest.json  (last fetch timestamp)

index.html
  ├─ Loads from data/*.json first (same-origin, no CORS)
  └─ Falls back to live API if cache is stale
```

## Setup

### 1. Create the repo (run once in this folder)

```bash
gh repo create victoria-vr-dashboard --private --source=. --push
```

### 2. Optional: Add CoinGecko API key (higher rate limits)

Go to **GitHub repo → Settings → Secrets → Actions → New secret**  
Name: `COINGECKO_API_KEY`  
Value: your key from https://www.coingecko.com/en/api

### 3. Enable GitHub Pages

Go to **GitHub repo → Settings → Pages**  
Source: `Deploy from a branch`  
Branch: `main` / `/ (root)`

> **Note:** GitHub Pages for private repos requires GitHub Pro ($4/mo).  
> Free alternative: connect the repo to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — both are free and work with private repos.

### 4. Trigger first data fetch

Go to **GitHub repo → Actions → Fetch VR On-Chain Data → Run workflow**

### 5. View locally (no server needed after first fetch)

```bash
python -m http.server 8080
# open http://localhost:8080
```

## Key Addresses

| Name | Address | Role |
|------|---------|------|
| VR Token | `0x7d5121505149065b562C789A0145eD750e6E8cdD` | ERC-20 |
| NTT Manager ETH | `0xC721f339fEC6aFe1C9adFc11E2ad2545aE26eA15` | Bridge lock/unlock |
| NTT Executor | `0xD2D9c936165a85F27a5a7e07aFb974D022B89463` | Bridge orchestrator |
| Wormhole Transceiver | `0x461169e7132bAF37a42aa0CDff597d7FC29D96e5` | Wormhole relay |
| MEXC Hot Wallet | `0x9642b23Ed1E01Df1092B92641051881a322F5D4E` | Exchange |
| VR Land Deployer | `0xAe0197E27B6F6DBbcf6CdecD5aB5f1D56FE51859` | NFT deployer |
