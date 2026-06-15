# PRD — Poin DEX

**Aplikasi DeFi (DApp) Swap di jaringan OPN Chain**
Versi dokumen: 1.0 · Tanggal: 14 Juni 2026 · Status: Draft for build

---

## 1. Ringkasan Eksekutif

**Poin DEX** adalah Decentralized Exchange (DEX) berbasis web (DApp) yang berjalan di atas jaringan **OPN Chain**. Aplikasi terhubung ke wallet **MetaMask**, menggunakan token **OPN** sebagai gas, dan pada rilis pertama hanya menyediakan fitur **Swap** (tukar token on-chain via AMM). Fitur **Bridge, Liquidity Pool (UI), dan Farming** akan menyusul pada fase berikutnya.

Karena OPN Chain adalah jaringan EVM baru, **belum ada DEX/AMM yang ter-deploy di sana**. Maka Poin DEX harus **mendeploy mesin AMM-nya sendiri** (fork Uniswap V2 yang teruji) beserta `WOPN` (Wrapped OPN) dan token uji. Tanpa kontrak ini, tidak ada likuiditas untuk di-swap.

---

## 2. Parameter Jaringan OPN Chain (terverifikasi dari developer docs)

| Parameter | OPN Testnet | OPN Mainnet |
|---|---|---|
| Network Name | OPN Testnet | OPN Mainnet |
| Chain ID (dec) | **984** | **985** |
| Chain ID (hex) | 0x3d8 | 0x3d9 |
| RPC URL | https://testnet-rpc.iopn.tech | https://rpc.iopn.tech |
| Block Explorer | https://testnet.iopn.tech | (TBD) |
| Faucet | https://faucet.iopn.tech | — |
| Gas Token | OPN (18 desimal) | OPN (18 desimal) |
| Min Gas Price | 7 Gwei | 7 Gwei |
| Block Time | ~1 detik | ~1 detik |
| Finality | Instan setelah 1 konfirmasi | Instan setelah 1 konfirmasi |

**Karakteristik EVM (dari docs):**
- EVM version: **Pectra**; Solidity **0.8.30**.
- Full EVM compatibility: semua opcode, gas cost, dan semantik eksekusi identik dengan Ethereum.
- Semua precompile Ethereum tersedia (ecrecover, SHA256, dst).
- Standar yang didukung penuh: ERC-20, ERC-721, ERC-1155, ERC-165, ERC-2981, ERC-4626, ERC-4337.
- Tooling didukung penuh: Hardhat, Foundry, Truffle, Remix; library ethers.js, viem, web3.js tanpa modifikasi.
- ⚠️ **Verifikasi kontrak otomatis (Etherscan-style) belum tersedia** di testnet — verifikasi sementara manual (flatten + submit saat explorer mendukung).

**Implikasi desain:**
- Block time ~1s + instant finality → UX konfirmasi transaksi bisa sangat cepat; cukup tunggu 1 konfirmasi.
- Gas flat ~7 Gwei → tidak perlu UI EIP-1559 (priority fee) yang rumit; gunakan gas price tetap/legacy.

---

## 3. Tujuan & Sasaran

**Tujuan produk:** menyediakan pengalaman swap token yang cepat, aman, dan sederhana di OPN Chain, setara UX Uniswap, sebagai fondasi ekosistem DeFi Poin DEX.

**Sasaran rilis pertama (MVP):**
1. Connect/disconnect MetaMask + auto add/switch ke OPN Chain.
2. Swap token-ke-token dan OPN↔token dengan quote real-time, slippage, dan price impact.
3. AMM (Uniswap V2 fork) + WOPN ter-deploy & teruji di OPN Testnet.
4. Token list & balance, riwayat transaksi sederhana, link ke explorer.

**Non-tujuan (fase ini):** Bridge, tambah/tarik likuiditas via UI, farming/staking, limit order, multi-hop routing lanjutan (V1 cukup 1–2 hop), mobile native app.

**Metrik sukses (KPI):**
- Waktu connect→swap pertama < 60 detik.
- Tingkat keberhasilan transaksi swap > 98% (testnet).
- Quote latency < 500 ms.
- 0 temuan kritikal pada audit kontrak internal sebelum mainnet.

---

## 4. Persona & User Stories

**Persona:** Crypto user familiar MetaMask; ingin menukar token di OPN Chain dengan cepat.

User stories inti:
- Sebagai user, saya bisa menghubungkan MetaMask dan otomatis diarahkan ke jaringan OPN.
- Sebagai user, saya bisa memilih token sumber & tujuan, memasukkan jumlah, dan melihat estimasi keluaran + price impact + fee.
- Sebagai user, saya bisa mengatur slippage tolerance dan deadline.
- Sebagai user, saya melakukan `approve` lalu `swap`, dan melihat status + link explorer.
- Sebagai user, saya melihat saldo token dan dapat menambah token via alamat kontrak.

---

## 5. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend DApp (Next.js App Router · Vercel)                 │
│  - UI Swap (shadcn/ui + Tailwind)                            │
│  - wagmi + viem + ConnectKit  → MetaMask (EIP-1193)         │
│  - Quote engine (baca getAmountsOut dari Router)             │
└───────────────┬─────────────────────────────────────────────┘
                │ JSON-RPC (viem)            │ wallet (MetaMask)
                ▼                            ▼
┌─────────────────────────────┐   ┌──────────────────────────┐
│  OPN Chain RPC               │   │  MetaMask (sign tx)       │
│  testnet-rpc.iopn.tech (984) │   └──────────────────────────┘
└───────────────┬─────────────┘
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Smart Contracts on OPN Chain (Solidity 0.8.30)              │
│  - WOPN (Wrapped OPN, WETH9-style)                           │
│  - UniswapV2Factory                                         │
│  - UniswapV2Router02 (pakai WOPN sebagai WETH)              │
│  - UniswapV2Pair (per pasangan)                            │
│  - Token uji ERC-20 (USDC/USDT/DAI tiruan untuk testnet)   │
└─────────────────────────────────────────────────────────────┘
```

**Keputusan arsitektur kunci:**
- **AMM = fork Uniswap V2** (bukan V3). Alasan: lebih sederhana, audit-trail jelas, cukup untuk MVP swap, mudah deploy, tidak butuh tick/oracle kompleks. V3 dipertimbangkan saat Liquidity/Farming.
- **WOPN** dibutuhkan karena Router V2 men-swap lewat token ERC-20; OPN native dibungkus jadi WOPN (pola WETH9). UI menyembunyikan wrap/unwrap dari user (swap OPN langsung).
- **Frontend stateless** — tidak ada backend kustom wajib untuk MVP. Opsional: serverless route untuk token-list & analytics/caching. Indexing riwayat via query log on-chain (atau explorer API saat tersedia).
- **Tanpa private key di frontend.** Semua signing via MetaMask.

---

## 6. Spesifikasi Smart Contract

**Paket kontrak (deploy berurutan):**
1. `WOPN.sol` — wrapped native (deposit/withdraw, WETH9 standar).
2. `UniswapV2Factory.sol` — `feeToSetter` = deployer.
3. `UniswapV2Router02.sol` — argumen `(factory, WOPN)`.
4. Token uji: `MockERC20` (mUSDC, mUSDT, mDAI) — mintable untuk testnet.
5. Seed likuiditas: buat pair & `addLiquidity` awal agar swap punya harga.

**Catatan teknis:**
- `init code hash` pair **harus** disinkronkan antara `UniswapV2Library` (di Router) dan `Factory` setelah kompilasi 0.8.30 — ini sumber bug paling umum pada fork V2. Wajib dihitung ulang & di-hardcode.
- Fee swap default V2 = 0.30% ke LP. `feeTo` dibiarkan nol (tanpa protocol fee) untuk MVP.
- Gunakan `SafeERC20`/cek return pada token non-standar.
- Pakai gas price legacy 7 Gwei, gas limit deploy ~3.000.000 (sesuai docs).

**Pengujian kontrak (Hardhat/Foundry):**
- Unit: wrap/unwrap WOPN, createPair, addLiquidity, getAmountsOut, swapExactTokensForTokens, swapExactETHForTokens, swapExactTokensForETH, slippage revert, deadline revert.
- Property/fuzz (Foundry): invarian `x*y=k`, no value leak.
- Coverage target ≥ 90% untuk Router & Pair paths yang dipakai.

---

## 7. Spesifikasi Frontend (Fitur Swap)

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · wagmi v2 · viem · ConnectKit (atau RainbowKit) · TanStack Query.

**Komponen UI:**
- **Header:** logo, Connect Wallet, indikator jaringan (badge OPN; tombol "Switch to OPN" bila salah jaringan).
- **Swap Card:**
  - Input "From" (token selector + amount + balance + Max).
  - Tombol switch arah (↑↓).
  - Input "To" (token selector + estimasi amount, read-only).
  - Baris info: harga (1 A = x B), price impact, minimum received, LP fee, route.
  - Pengaturan: slippage (0.1/0.5/1.0/custom), deadline (menit).
  - Tombol aksi adaptif: `Connect Wallet` → `Switch Network` → `Approve <TOKEN>` → `Swap` / `Insufficient balance` / `Insufficient liquidity`.
- **Token Selector Modal:** search by nama/symbol/alamat, daftar token (token list JSON), import via alamat (baca symbol/decimals on-chain), tampil balance.
- **Settings Modal:** slippage & deadline, toggle expert mode (opsional).
- **Tx Status:** toast/modal: pending → success/failed, dengan link `https://testnet.iopn.tech/tx/<hash>`.
- **Recent Transactions:** simpan lokal (localStorage) + status.

**Logika quote:**
- Baca `getAmountsOut(amountIn, path)` dari Router via viem (read), debounce input ~300ms.
- Path: token→token langsung, atau token→WOPN→token bila pair langsung tidak ada (multi-hop ringan).
- Hitung price impact dari reserve pair; minimum received = `amountOut * (1 - slippage)`.
- Approval flow: cek `allowance`; jika kurang, `approve` ke Router (opsi infinite/exact).
- Swap: pilih fungsi Router sesuai sisi native (OPN) / ERC-20.

**Konfigurasi rantai (wagmi custom chain):**
```ts
export const opnTestnet = defineChain({
  id: 984,
  name: 'OPN Testnet',
  nativeCurrency: { name: 'OPN', symbol: 'OPN', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.iopn.tech'] } },
  blockExplorers: { default: { name: 'OPN Explorer', url: 'https://testnet.iopn.tech' } },
  testnet: true,
});
```

**Add network ke MetaMask:** gunakan `wallet_addEthereumChain` (otomatis via wagmi `addChain`/ConnectKit) dengan parameter di atas.

---

## 8. Keamanan & Audit

- Kontrak: pakai sumber Uniswap V2 yang sudah teraudit + OpenZeppelin; minimal perubahan; **verifikasi init code hash**.
- Internal review/audit checklist: reentrancy (Pair sudah ber-lock), integer overflow (0.8.x checked), slippage/deadline enforced, approval phishing mitigation (tampilkan jumlah & spender jelas).
- Frontend: tampilkan alamat kontrak resmi (anti-spoof), validasi chainId sebelum tx, jangan auto-approve infinite secara default tanpa info, sanitasi import token (warning token tak dikenal).
- Sebelum **mainnet (985)**: audit eksternal AMM + bug bounty kecil.
- Manajemen secret: `.env` tidak pernah di-commit; deploy key terpisah; gunakan multisig untuk `feeToSetter`/ownership saat mainnet.

---

## 9. DevOps & Deployment

- **Frontend:** Vercel (Next.js). Preview deploy per-PR; production = mainnet config. Env via Vercel Environment Variables.
- **Env vars frontend:** `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_ROUTER_ADDRESS`, `NEXT_PUBLIC_FACTORY_ADDRESS`, `NEXT_PUBLIC_WOPN_ADDRESS`, `NEXT_PUBLIC_EXPLORER_URL`.
- **Kontrak:** repo Hardhat terpisah (atau monorepo `packages/contracts`). Env: `OPN_TESTNET_RPC`, `OPN_MAINNET_RPC`, `PRIVATE_KEY`, `OPNSCAN_API_KEY`.
- **CI:** GitHub Actions — lint (solhint/eslint), test (hardhat/foundry + vitest), build Next. Gate merge pada test hijau.
- **Artefak deploy:** simpan address ke `deployments/<chainId>.json`; frontend baca dari file/env yang sama (single source of truth).

---

## 10. Struktur Repository (rencana)

```
PoinDEX/
├─ apps/web/                 # Next.js DApp (Swap UI)
│  ├─ app/                   # App Router
│  ├─ components/            # SwapCard, TokenSelector, ...
│  ├─ lib/                   # chains.ts, wagmi.ts, abis/, addresses.ts
│  └─ config/tokenlist.json
├─ packages/contracts/       # Hardhat workspace
│  ├─ contracts/             # WOPN, UniswapV2*, MockERC20
│  ├─ scripts/               # deploy.ts, seedLiquidity.ts
│  ├─ test/                  # unit + fuzz
│  ├─ deployments/           # 984.json, 985.json
│  └─ hardhat.config.ts
├─ PRD.md
└─ README.md
```

---

## 11. Roadmap Fase Lanjutan (ringkas)

| Fase | Fitur | Catatan |
|---|---|---|
| 2 | Liquidity Pool UI | add/remove liquidity, posisi LP, sudah didukung kontrak V2 |
| 3 | Farming/Staking | MasterChef-style, token reward Poin DEX |
| 4 | Bridge | OPN ↔ chain lain; evaluasi bridge provider (CCTP/lock-mint), butuh kajian keamanan terpisah |
| 5 | Analytics, multi-hop routing lanjutan, token list governance |

---

## 12. Langkah Proses Build (Eksekusi)

### Tahap 0 — Inisialisasi (½ hari)
1. Inisialisasi monorepo (`apps/web`, `packages/contracts`).
2. `git init`, setup `.gitignore` (node_modules, .env, artifacts, cache).
3. Buat `.env.example` untuk kedua workspace.

### Tahap 1 — Smart Contracts (2–3 hari)
1. Setup Hardhat + Solidity 0.8.30, EVM `pectra`, network `opnTestnet (984)` & `opnMainnet (985)`, gasPrice 7 Gwei.
2. Tambah kontrak: `WOPN`, `UniswapV2Factory`, `UniswapV2Router02`, `UniswapV2Pair/Library`, `MockERC20`.
3. **Hitung & sinkronkan `init code hash`** pair → update di Library.
4. Tulis unit test + fuzz; jalankan `npx hardhat test` & coverage.
5. Deploy ke OPN Testnet: WOPN → Factory → Router → MockERC20s.
6. Seed likuiditas (mUSDC/mUSDT/WOPN dll) agar swap punya harga.
7. Simpan address ke `deployments/984.json`.

### Tahap 2 — Frontend Swap (3–5 hari)
1. Scaffold Next.js + Tailwind + shadcn/ui.
2. Integrasi wagmi/viem/ConnectKit + custom chain OPN (984).
3. Connect wallet + add/switch network OPN otomatis.
4. SwapCard + TokenSelector + Settings + quote engine (`getAmountsOut`, debounce).
5. Approval + swap flow (native & ERC-20), price impact, min received.
6. Tx status + link explorer + recent tx (localStorage).
7. Token list JSON dari address Tahap 1.

### Tahap 3 — Integrasi & QA (2 hari)
1. End-to-end test di OPN Testnet (faucet OPN → swap nyata).
2. Edge cases: insufficient balance/liquidity, slippage revert, wrong network, reject signature.
3. Audit checklist internal kontrak + review approval UX.

### Tahap 4 — Deploy & Rilis (1 hari)
1. Deploy frontend ke Vercel (env testnet) → beta publik testnet.
2. Kumpulkan feedback, perbaikan.
3. Persiapan mainnet (985): audit eksternal, deploy kontrak mainnet, multisig ownership, update env production.

**Estimasi total MVP: ~2 minggu kerja.**

---

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `init code hash` mismatch pada fork V2 | Router gagal hitung pair → swap rusak | Hitung ulang pasca-compile, test createPair vs Library |
| Belum ada verifikasi kontrak otomatis di testnet | Transparansi/kepercayaan | Flatten + verifikasi manual saat explorer siap; publikasikan source di repo |
| Likuiditas tipis testnet | Price impact besar | Seed likuiditas memadai; tampilkan warning price impact |
| RPC publik rate-limit/downtime | Quote/tx gagal | Retry + fallback RPC; tampilkan status jaringan |
| Mainnet params (explorer) belum final | Konfig produksi | Abstraksi via env; update saat tersedia |
| Token import berbahaya | Phishing | Warning token tak dikenal, verifikasi decimals/symbol on-chain |

---

## 14. Definition of Done (MVP)
- [ ] Kontrak AMM + WOPN + token uji ter-deploy & terverifikasi (manual) di OPN Testnet, address tercatat.
- [ ] Test kontrak hijau, coverage ≥ 90% pada path swap.
- [ ] User dapat connect MetaMask, auto switch ke OPN, dan menyelesaikan swap nyata di testnet.
- [ ] Quote real-time, slippage, price impact, min received, tx status + link explorer berfungsi.
- [ ] Frontend live di Vercel (testnet), responsif, tanpa error konsol kritikal.
- [ ] README berisi cara setup, deploy, dan menjalankan.
