# Poin DEX

Aplikasi DeFi (DApp) Swap di jaringan **OPN Chain**, terhubung MetaMask, gas memakai token OPN.
MVP: fitur **Swap**. Roadmap: Liquidity Pool, Farming, Bridge.

Lihat [PRD.md](PRD.md) untuk spesifikasi lengkap.

## Struktur Monorepo

```
PoinDEX/
├─ apps/web/            # Frontend DApp (Next.js) — Tahap 2
└─ packages/contracts/  # Smart contracts (Hardhat, Solidity 0.8.30) — Tahap 1
```

## Smart Contracts (packages/contracts)

Mesin AMM: **Uniswap V2 fork** (Factory + Router02 + Pair) + **WOPN** (Wrapped OPN) + token uji.
Catatan: `UniswapV2Library.pairFor` memakai `factory.getPair` (bukan hardcoded init-code-hash)
untuk menghilangkan risiko fork V2 #1.

### Setup

```bash
cd packages/contracts
cp .env.example .env        # isi PRIVATE_KEY untuk deploy
npm install                 # (atau `npm install` dari root monorepo)
npm run build               # compile
npm run test                # unit + property tests
```

### Deploy ke OPN Testnet (Chain ID 984)

1. Dapatkan OPN testnet dari faucet: https://faucet.iopn.tech
2. Isi `PRIVATE_KEY` di `packages/contracts/.env` (akun yang sudah punya OPN).
3. Jalankan:
   ```bash
   npm run deploy:testnet     # deploy WOPN, Factory, Router, token uji
   npm run seed:testnet       # buat pair + seed likuiditas awal
   ```
4. Address hasil deploy tersimpan di `packages/contracts/deployments/984.json`.

## Jaringan OPN

| Param | Testnet | Mainnet |
|---|---|---|
| Chain ID | 984 | 985 |
| RPC | https://testnet-rpc.iopn.tech | https://rpc.iopn.tech |
| Explorer | https://testnet.iopn.tech | TBD |
| Faucet | https://faucet.iopn.tech | — |
| Gas token | OPN (18 desimal), ~7 Gwei | OPN |
