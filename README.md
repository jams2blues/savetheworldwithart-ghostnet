<!--
  Developed by @jams2blues with love for the Tezos community
  File: README.md
  Summary: GitHub front‑page for ZeroArt (Ghostnet branch)
-->

<p align="center">
  <img src="public/images/logo.svg" alt="ZeroArt logo" width="90"/>
</p>

<h1 align="center">ZeroArt NFT Platform (Ghostnet)</h1>

> **ZeroArt** is a 100 % on‑chain, no‑code NFT deployment & interaction  
> platform for the Tezos blockchain. This branch targets **Ghostnet**  
> (testnet).  For mainnet, see the `mainnet` branch (coming soon).

---

## ✨ Features

| Module | Capabilities |
|--------|--------------|
| **Generate Contract** | Deploy V3 collection contracts in one click |
| **Mint / Burn / Transfer** | Full FA2 suite: mint (single or multi‑edition), burn, transfer |
| **Update Operators** | Add / remove FA2 operators |
| **Parent / Child Links** | Manage hierarchical relationships between contracts |
| **Collaborators (V3)** | Batch add/remove collaborator addresses & popup viewer |
| **On‑Chain License** | SVG license pulled live from mainnet contract `KT1S9…ZQ4z` |

All metadata & thumbnails are stored **fully on‑chain**.

---

## 🏗 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 14** + React 18 |
| UI | Material‑UI v5 (Grid v2) + Emotion |
| Blockchain | Taquito 17 • BeaconWallet 3 |
| Styling | styled‑components / @emotion/styled |
| Runtime | Node 20 |
| Language | Plain JavaScript (ES2022) |

---

## 🚀 Local Development

```bash
git clone https://github.com/YOUR‑ORG/zeroart.git
cd zeroart
yarn install
yarn dev          # http://localhost:3000
```

> **Note:** No `.env` files are required—RPC endpoints are hard‑coded for Ghostnet.

---

## 🔄 Deployment (Vercel)

| Setting           | Value          |
|-------------------|----------------|
| **Framework**     | Next.js        |
| **Build Command** | `next build`   |
| **Install**       | `yarn install` |
| **Output Dir**    | `.next`        |
| **Node Version**  | 20.x           |

Push to **`main`** → Vercel auto‑builds & deploys.

---

## 🧪 Testing Roadmap

| Layer | Tool   | Status  |
|-------|--------|---------|
| Unit  | Jest   | planned |
| e2e   | Cypress| planned |
| CI    | GitHub Actions | planned |

---

## 👥 Contributing

1. **Fork → Branch → PR**  
2. Use conventional commits (`feat:`, `fix:`, `chore:` …)  
3. Run `yarn lint && yarn build` before pushing.

Need help? Ping **@jams2blues** or open an Issue.

---

## 🛡 License

Source code © 2025 Save The World With Art™ 
On‑Chain NFT License 2.0 stored at  
[`KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z`](https://objkt.com/collections/KT1S9GHLCrGg5YwoJGDDuC347bCTikefZQ4z).

---

<p align="center">Made with 💚 on Tezos</p>
```

Everything is now ready for `git push origin main` → Vercel auto‑deploy.  
Happy shipping!