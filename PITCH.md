# PoinDEX

The first swap venue on OPN Chain. Connect MetaMask, trade tokens, pay gas in OPN. Done.

Live: **https://poin-dex.vercel.app** · Network: OPN Testnet (chain `984`)

---

## What is PoinDEX?

PoinDEX is a decentralized exchange built natively on OPN Chain. You bring a wallet, pick two tokens, and swap — the price comes straight from on-chain liquidity, the trade settles in about a second, and gas is paid in OPN.

Here's the part that matters: OPN Chain had no DEX. None. So we didn't wrap someone else's contracts behind a pretty UI — we deployed the whole exchange ourselves. The AMM engine, the wrapped-native token, the liquidity pools, and the trading app. All of it is ours, all of it is on-chain, all of it is live right now.

## Why PoinDEX?

A chain without a DEX is a chain without an economy. You can deploy tokens all day, but if nobody can trade them, nothing moves. OPN Chain is genuinely fast — roughly one-second blocks, finality after a single confirmation, flat 7 gwei gas — and that speed was sitting unused because there was no place to actually swap anything.

PoinDEX is the liquidity layer that turns those properties into something people can use. Every future primitive on OPN — lending, farming, a bridge, anything that needs a price — needs an AMM underneath it. We built that AMM first, and we built it to be the thing everything else plugs into.

Three reasons it stands up:

- **It's real, not a demo.** Six contracts deployed, three pools funded, swaps executing on the public testnet today.
- **We own the stack.** No third-party router, no external dependency that can rug us. The exchange logic is code we deployed and can extend.
- **It's correct.** We sidestepped the single most common bug in V2 forks (more on that below) and proved every swap path with live transactions, not just local mocks.

## How PoinDEX works

The engine is a Uniswap V2-style automated market maker, ported to Solidity 0.8.30 and compiled for OPN's Pectra EVM. Each pool holds two tokens and keeps their product constant (`x * y = k`); the ratio of reserves is the price, and a 0.30% fee on every trade goes to liquidity providers.

A few specifics worth calling out:

- **WOPN.** Native OPN can't be traded directly by the router, so we wrap it 1:1 into WOPN (the WETH9 pattern). The interface hides this — you swap "OPN" and the wrap/unwrap happens under the hood.
- **No init-code-hash trap.** Most V2 forks break because the router hardcodes a hash of the pair bytecode, and that hash changes the moment you recompile. We route every pair lookup through `factory.getPair()` instead. The most common fork bug simply can't happen here.
- **Smart routing.** If two tokens don't share a direct pool, the quoter hops through WOPN automatically (e.g. mUSDC → WOPN → mDAI) and shows you the route, price impact, and minimum received before you sign.
- **The frontend does the annoying parts for you.** Next.js + wagmi + viem. It reads quotes live off the chain, detects when your wallet is on the wrong network and switches you to OPN (adding it to MetaMask if needed), handles token approvals, and lets you set slippage and deadline.

The flow a user sees: connect → the app makes sure you're on OPN → type an amount → get a live quote → approve once → swap → watch it confirm with a link to the explorer.

## Roadmap — what's next

Swap is live. The rest is already scaffolded in the app, tagged **SOON**:

- **Liquidity Pool UI** — add and remove liquidity, track your LP position. The contracts already support this; it's a frontend on top of mint/burn.
- **Farming** — stake LP tokens, earn emissions. This is where a PoinDEX reward token enters the picture.
- **Bridge** — move assets between OPN and other chains. Separate security surface, so it gets its own design pass.

Before any of this touches mainnet (chain `985`): an external contract audit, deeper seeded liquidity so price impact stays low, and an exact-amount approval option for users who don't want infinite allowances.

## Smart contract / on-chain proof

Everything below is deployed and verifiable on OPN Testnet (chain `984`). Explorer: https://testnet.iopn.tech

| Contract | Address |
|---|---|
| UniswapV2Router02 | [`0x6BB54bBB50e21089063898C5d0D35Bc21eC79080`](https://testnet.iopn.tech/address/0x6BB54bBB50e21089063898C5d0D35Bc21eC79080) |
| UniswapV2Factory | [`0x26065cD50f5a69d15Cfee9553D6CA81313dbF11e`](https://testnet.iopn.tech/address/0x26065cD50f5a69d15Cfee9553D6CA81313dbF11e) |
| WOPN (Wrapped OPN) | [`0xE16ea3029A73F626F1F3888230E0fc82F9171C9f`](https://testnet.iopn.tech/address/0xE16ea3029A73F626F1F3888230E0fc82F9171C9f) |
| mUSDC (test token) | [`0x011358494C527D928510DC3c86Ee8c08e5b51395`](https://testnet.iopn.tech/address/0x011358494C527D928510DC3c86Ee8c08e5b51395) |
| mUSDT (test token) | [`0xd647E725FD9a628D238A0b15ADC500FE767F94Cc`](https://testnet.iopn.tech/address/0xd647E725FD9a628D238A0b15ADC500FE767F94Cc) |
| mDAI (test token) | [`0x034DD94c60e207ED88eA95381Fb2488BD61B9306`](https://testnet.iopn.tech/address/0x034DD94c60e207ED88eA95381Fb2488BD61B9306) |

**Live pools:** mUSDC/mUSDT · WOPN/mUSDC · WOPN/mDAI

**Tested, not hoped:**
- 9/9 unit and property tests (Hardhat) — pair creation, liquidity, fee math, slippage and deadline reverts.
- 5/5 live end-to-end checks — real transactions through the deployed router: a native OPN swap, a direct token swap, a multi-hop swap, plus confirmed reverts on bad slippage and expired deadlines.

Try it: grab OPN from https://faucet.iopn.tech, the test tokens expose an on-chain `faucet()`, then swap on https://poin-dex.vercel.app.
