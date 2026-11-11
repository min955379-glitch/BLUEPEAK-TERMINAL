# BluePeak / Terminal — Project Plan

## Purpose

Provide a fast, responsive, read-only market-data terminal for monitoring public crypto market data. This site displays market information; it does not place orders, manage funds, predict prices, or provide trading advice.

## Current scope

- Single-page static frontend (`index.html`) with no application server or database.
- Responsive desktop, tablet, and mobile layouts.
- Public Binance market data: combined WebSocket ticker, candle, depth, and aggregate-trade feeds, plus public REST data for snapshots/history.
- Watchlist, candlestick chart, order book, market statistics, and technical overlays.
- Always-visible Large Trades strip with minimum-size, asset, and highlight filters; session-only details; existing read-only and already-executed-trades notices.
- Optional user-entered Ethereum address activity. No preloaded addresses, ownership assumptions, or exchange-wallet identity claims.
- Client-side alerts, market monitor, annotations, and paper-trading simulation; no real orders or money.

## Delivery and deployment plan

1. **Keep the scope safe and simple**
   - Keep the terminal client-side and read-only.
   - Do not add a database, account system, order execution, or hidden wallet tracking.
   - Preserve current market-data and on-chain disclaimers.
2. **Verify the release**
   - Check JavaScript syntax and the existing smoke tests.
   - Test the real rendered page at desktop, tablet landscape, tablet portrait, and mobile sizes.
   - Confirm the Binance combined WebSocket status and distinguish live entries from fixtures.
   - Check that charts, filters, touch targets, and mobile navigation remain usable.
3. **Publish**
   - Deploy the static files to the specifically approved Vercel project or repository.
   - Include the local fonts, favicon, and Open Graph image alongside the HTML.
   - Verify the production URL and key features after deployment.
4. **Maintain**
   - Recheck public API compatibility, browser console/network failures, and responsive behavior when the watchlist or layout changes.
   - Update documentation when features or data sources change.

## Release checks

- No horizontal overflow at supported viewport sizes.
- Large Trades displays only anonymous, already-executed public aggregate trades; `m: true` is taker SELL and `m: false` is taker BUY.
- The default minimum is $250K and the session buffer captures eligible trades from $50K for immediate re-filtering.
- No wallet addresses are preloaded; user labels do not imply verified ownership.
- No price forecasts, recommendations, or real-order functionality are introduced.
- Production HTML, fonts, SVG favicon, and social preview asset resolve successfully.

## Deployment status

The Vercel project `bluepeak-terminal` has been created and linked to the user-provided GitHub repository `min955379-glitch/BLUEPEAK-TERMINAL` (production branch `main`). No application files have been committed to GitHub or deployed to Vercel yet. The GitHub publishing connector is not available in this workspace, so the source files are prepared locally for upload/push; publishing must be verified after the repository receives them.
