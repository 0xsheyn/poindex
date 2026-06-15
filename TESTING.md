# Poin DEX — Laporan QA (Tahap 3: Integrasi & QA)

Tanggal: 15 Juni 2026 · Jaringan: OPN Testnet (Chain ID 984)

## 1. Unit / property tests (lokal, Hardhat)

`npm --prefix packages/contracts test` → **9/9 PASS**

Mencakup: createPair (+ registry dua arah), revert token identik, pairCodeHash,
addLiquidity + mint LP, quote + swapExactTokensForTokens (fee 0.30% terbukti),
swap OPN native via WOPN, revert slippage, revert deadline, removeLiquidity.

## 2. End-to-end LIVE di testnet 984

`npx hardhat run scripts/e2eTestnet.ts --network opnTestnet` → **5/5 PASS**
(eksekusi transaksi nyata melalui Router yang ter-deploy)

| # | Skenario | Hasil |
|---|---|---|
| T1 | OPN → mUSDC (`swapExactETHForTokens`) | output = quote ✓ |
| T2 | mUSDC → mUSDT (direct pair) | output = quote ✓ |
| T3 | mUSDC → WOPN → mDAI (multi-hop) | output = quote ✓ |
| T4 | Proteksi slippage (minOut mustahil) | revert ✓ |
| T5 | Deadline lampau | revert ✓ |

**Catatan RPC:** endpoint publik `testnet-rpc.iopn.tech` load-balanced; pembacaan
tepat setelah write kadang mengenai replika yang lag (read-after-write). Script E2E
dibuat tahan ini dengan polling sampai saldo settle. Frontend memitigasi via refetch
(TanStack Query) saat tx sukses. **Rekomendasi produksi:** RPC yang lebih andal /
node sendiri / websocket.

## 3. QA Frontend di browser (tanpa MetaMask, quote read-only live)

Diverifikasi terhadap kontrak live via `publicClient`:

| Skenario | Hasil |
|---|---|
| Quote single-hop `1 OPN → mUSDC` | To terisi, price impact, min diterima, LP fee 0.30%, rute `OPN → mUSDC` ✓ |
| Multi-hop `mUSDC → mDAI` | rute `mUSDC → WOPN → mDAI`, price impact `—`, LP fee **0.60%** (2 hop) ✓ |
| No-route `mUSDT → mDAI` | estimasi kosong, panel info disembunyikan (graceful) ✓ |
| CTA precedence (disconnected) | tampil `Connect Wallet` ✓ |
| Console errors | 0 error (hanya warning opsional `@metamask/sdk` async-storage — benign) ✓ |

## 4. Checklist audit internal smart contract

- [x] **Reentrancy** — `UniswapV2Pair` memakai modifier `lock` pada mint/burn/swap/skim/sync.
- [x] **Overflow/underflow** — Solidity 0.8 checked; `unchecked` HANYA di akumulator harga (overflow disengaja).
- [x] **Invarian K** — diverifikasi di `swap` (`balanceAdjusted` ≥ k·1000²).
- [x] **Slippage & deadline** — dipaksa di Router (`amountOutMin`, `ensure(deadline)`).
- [x] **Risiko init-code-hash (#1 fork V2)** — DIHILANGKAN: `UniswapV2Library.pairFor` pakai `factory.getPair`, bukan hash hardcoded.
- [x] **Protocol fee** — `feeTo` unset (0 fee ke protokol); `feeToSetter` = deployer.
- [x] **Router immutable** — `factory` & `WETH(WOPN)` immutable, tanpa fungsi admin/backdoor.
- [x] **WOPN** — wrap/unwrap 1:1; `withdraw` cek saldo; `transferFrom` hormati allowance.
- [x] **MockERC20 testnet-only** — punya `faucet()`/`mint`; script deploy MELEWATI mint token di chainId 985 (mainnet).
- [ ] **Audit eksternal** — BELUM (wajib sebelum mainnet, sesuai PRD §8).

## 5. Temuan & rekomendasi

| Tingkat | Temuan | Rekomendasi |
|---|---|---|
| Info | Approval default = max (infinite) | Tambah opsi approve exact-amount untuk user hati-hati |
| Info | Price impact hanya single-hop | Estimasi multi-hop bila diperlukan |
| Low | Pool seed kecil → price impact tinggi (mis. 3%+ utk 1 OPN) | Tambah likuiditas seed untuk UX lebih halus |
| Low | RPC publik read-after-write lag | RPC produksi lebih andal + refetch (sudah ada di FE) |
| — | Belum diaudit eksternal | Audit + bug bounty sebelum mainnet 985 |

## 6. Checklist manual via MetaMask (perlu dijalankan user)

Buka http://localhost:3000 (dev) lalu:

- [ ] Connect MetaMask → muncul prompt; setelah connect tampil alamat ter-singkat.
- [ ] Jika di jaringan lain → tombol **Switch to OPN**; klik → MetaMask menambah/pindah ke OPN 984.
- [ ] Saldo OPN & token tampil benar di kartu.
- [ ] Input jumlah → estimasi, price impact, min diterima, rute muncul (<0.5s).
- [ ] Swap token ERC-20 pertama kali → tombol **Approve mUSDC** → setujui → berubah jadi **Swap**.
- [ ] Klik **Swap** → MetaMask minta tanda tangan → konfirmasi → status "Menunggu konfirmasi" → "sukses ✓" + link explorer.
- [ ] Tolak tanda tangan → UI kembali normal tanpa error fatal.
- [ ] Jumlah > saldo → tombol **Saldo <TOKEN> tidak cukup** (disabled).
- [ ] Pasangan tanpa rute (mUSDT→mDAI) saat connected → **Tidak ada rute / likuiditas**.
- [ ] Coba wrap: OPN → WOPN (1:1) dan unwrap WOPN → OPN.

## Cara menjalankan ulang

```bash
# unit tests
npm --prefix packages/contracts test
# E2E live (butuh PRIVATE_KEY berisi OPN di packages/contracts/.env)
cd packages/contracts && npx hardhat run scripts/e2eTestnet.ts --network opnTestnet
# frontend dev
npm run dev --prefix apps/web   # http://localhost:3000
```
