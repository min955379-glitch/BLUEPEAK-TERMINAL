# BluePeak / Terminal — Roadmap

This roadmap is a proposed sequence, not a promise of dates. Keep the product read-only and preserve the privacy and identity safeguards described in `README.md`.

## Completed

- Responsive terminal layout with market watchlist, chart, order book, and market statistics.
- Combined Binance public WebSocket feeds with reconnect/resubscription status.
- Always-visible, horizontally scrollable Large Trades panel with threshold, asset, and highlight controls, relative ages, and a session details log.
- Optional manually populated Ethereum address activity, with user-supplied labels and an explicit unverified-ownership disclaimer.
- Client-side alerts, monitoring summaries, chart indicators/annotations, and paper trading without real orders or funds.
- Four-viewport browser review: desktop, tablet landscape, tablet portrait, and mobile.
- Documentation for the public data sources and read-only scope.

## Next — publish safely

- Add the prepared site files to the linked GitHub repository `min955379-glitch/BLUEPEAK-TERMINAL` on `main` (the repository is currently empty).
- Deploy `index.html`, `README.md`, this roadmap and plan, local fonts, `favicon.svg`, and `og-preview.png` to the new Vercel project `bluepeak-terminal`.
- Confirm the production URL, chart/data loading, Large Trades status, mobile layout, and asset paths.

## Later — maintain and improve

- Recheck Binance REST and WebSocket behavior if browser restrictions, endpoint behavior, or symbol availability changes.
- Revalidate the watchlist against Binance public exchange information before adding or removing symbols.
- Review keyboard accessibility, touch usability, and reduced-motion behavior as interface changes are made.
- Add lightweight, privacy-conscious production monitoring only if it can be done without storing user wallet labels or adding unnecessary services.
- Keep user-requested features optional and session-only unless a future change explicitly requires persistent storage.

## Guardrails

- No trading recommendations, price predictions, real orders, or handling of user funds.
- Never assign names or wallet ownership to anonymous exchange trades.
- Do not preload tracked wallets; do not imply manually entered address ownership is verified.
- Keep BUY/SELL colors consistent with the terminal's existing green/red palette.
- Retain the existing disclaimers and identify PAXG as tokenized gold, not COMEX futures.
