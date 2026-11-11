# BluePeak Scalp Terminal

Original BluePeakDesign market-data dashboard. Independent, client-side and read-only for live data; all trade tickets below are simulation records only.

## Run locally

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Open `http://localhost:4173` (or the provided live preview). No package installation or API keys are required.

## Features

- Binance public WebSocket ticker, kline and partial-depth feeds; automatic reconnects and REST/demo fallbacks.
- Responsive watchlist, expanded desktop chart with volume, native/fallback fullscreen, Ctrl/Cmd + wheel zoom, mouse-drag and two-finger touch pan/zoom, 12px page-scroll safe zones, on-demand older candles and reset-view control.
- Session-only horizontal/trendline annotations, SMA/EMA/RSI/MACD overlays, and normalized comparison with another asset. RSI/MACD describe historical price action; they are not forecasts.
- Client-side threshold and rolling five-minute move alerts, with optional browser notifications.
- An always-visible Large Trades panel, aligned to the dashboard grid, plus a detailed session log. Binance public per-symbol `aggTrade` streams share one combined WebSocket with ticker, kline and depth data (currently 38 streams, or 39 with chart comparison, below the ~200-stream connection limit). The display defaults to $250K+, buffers recent executed trades from $50K+ so the minimum selector immediately re-filters session history, labels taker BUY/SELL side, and keeps up to 75 entries; higher-tier notices are optional. The tab must stay open. The combined socket reconnects and resubscribes after disconnects.
- Optional, manually populated Ethereum address activity using Blockscout’s public API. User-defined labels only; no wallet addresses are preloaded or ownership inferred. The view currently covers direct ETH value and verified PAXG token transfers only, not other watchlist assets/chains or exchange order flow.
- A client-side market monitor that scans all 18 watchlist assets every 5, 10 or 15 minutes, produces plain-English summaries, and notifies only on >2% moves within 15 minutes, RSI threshold crossings, or >2× volume spikes. Uses a Web Worker timer where available, foreground catch-up scans, explicit background status, optional browser notifications plus in-page notices; the tab must remain open.
- Monitor requests are batched at low concurrency and honor Binance `Retry-After`/429 responses with visible backoff.
- A paper-trading simulator that records hypothetical fills at observed prices and calculates simulated realized/unrealized P&L. It never sends orders or uses real funds.
- Mouse/keyboard OHLC crosshair, client-side PNG export, `?` shortcuts panel, relative data freshness, and settings for timeframe, precision, sound and system-matched theme.
- Individual inline SVG coin marks and BluePeak monogram; locally hosted Inter and JetBrains Mono variable fonts (with OFL license files), plus `favicon.svg` and the 1200 × 630 `og-preview.png`.
- Skeleton loading, update flashes, dismissible connection notices, focus states and reduced-motion support.

Theme/settings and indicator choices use local browser storage. Alerts, paper-trade logs, drawings, the Large Trades log, and manually added wallet labels/addresses are kept only for the current browser session. On-chain refreshes send a user-entered public address directly to Blockscout; no server-side state or account data is used.

## Verified watchlist pairs

On 2026-11-11, the nine added USDT spot symbols (SHIBUSDT, PEPEUSDT, LINKUSDT, SUIUSDT, TRXUSDT, DOTUSDT, NEARUSDT, APTUSDT, and ARBUSDT) were checked against Binance public Spot Exchange Information via `data-api.binance.vision`; each returned `TRADING`. TONUSDT returned `BREAK`, so it was not added. PAXGUSDT (PAXG (tokenized gold)) also returned `TRADING` in Binance public Spot Exchange Information; the expanded watchlist has 18 active pairs. The PAXG feed represents its own Binance spot market, not COMEX gold futures. No silver trade feed is included.

## Safety scope

No login/signup, accounts, backend, or personal-data collection by BluePeak. Manually entered public wallet addresses stay in the browser session and are sent directly to Blockscout when added or refreshed. No wallet connection, order execution, deposits or withdrawals. Live order-book, chart and large-trade panels are view-only. Large Trades displays real, already-executed public aggregate trades; it does not show predictions, insider information, or trade recommendations. Alerts are user-defined threshold notifications, not predictions or buy/sell recommendations.

## Deployment note

`index.html` references the Open Graph image as `/og-preview.png`. Once a production domain is selected, set `og:image` and `twitter:image` to the full absolute URL for reliable retrieval by social crawlers.
