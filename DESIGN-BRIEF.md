# BluePeak Terminal — Redesign Design Brief (Phase 2)

Owner: Muhammad Ibrahim (beginner, plain English).  
Branch: `arena/388c08b4-bluepeak-terminal` (current active branch; nothing pushed, nothing deployed).  
Status: **Awaiting your OK on the first screen before any site code changes.**

---

## 1. Chosen references (2–3)

| Reference | What I took | What I left out |
|-----------|-------------|-----------------|
| **Wise / Stripe-style finance sites** | Calm headers, clean financial tables, right-aligned numbers, hairlines instead of boxes, one clear focal point per screen. | Their brand, copy, assets, and any React/Tailwind code. |
| **useamoeba.com** | Restraint: simple wordmark nav, one big plain headline, one clear primary button, quiet footer, whitespace. | Its brand, text, assets, and no-code layout code. |
| **HTML5 UP (html5up.net)** | Clean mobile menu structure, responsive plain HTML/CSS skeleton. | jQuery (never imported), any template copied wholesale, attribution unless required. |

No more than one visual language is mixed. **Palette A decides color.**

---

## 2. Palette A — "Cream & Ink" (default)

**Light theme (default)**

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#F5F0E6` | page background (cream) |
| `--surface` | `#FFFFFF` | panels, tables, chart area |
| `--surface-2` | `#FBF8F1` | soft cream panels, table header |
| `--selected` | `#EFE8D8` | selected / hovered row |
| `--line` | `#DDD5C5` | 1px hairlines |
| `--text` | `#141412` | main text, headings, primary buttons |
| `--text-2` | `#45433E` | secondary text |
| `--muted` | `#6B6860` | helper text (~4.9:1 on cream — verify) |
| `--neutral` | `#8A877E` | neutral / flat market state |
| `--gold` | `#A8861A` | tiny decorative accents only (active-tab underline, logo mark) |
| `--up` / `--down` | `#089981` / `#F23645` | chart candles + breadth bar only (unchanged) |
| `--up-text` / `--down-text` | `#067A66` / `#C42030` | green / red numbers as text on light |
| `--warn-bg` / `--warn-text` | `#FBF1DC` / `#7A4F00` | warnings, data-delayed notices |

**Dark theme ("Ink")**

| Token | Hex |
|-------|-----|
| `--bg` | `#0F0F0E` |
| `--surface` | `#181816` |
| `--surface-2` | `#20201D` |
| `--selected` | `#26251F` |
| `--line` | `#2E2D29` |
| `--text` | `#F2EDE2` |
| `--text-2` | `#C9C4B8` |
| `--muted` | `#A09B90` |
| `--gold` | `#D4B04A` |
| `--up` / `--down` | `#089981` / `#F23645` |

**Strict color rules:**
- Primary button: `--text` background + `--bg` text (black on cream; cream on black in dark). Only ONE primary button per screen area.
- Secondary button: transparent, 1px `--line` border, `--text` label.
- Links: `--text`, underlined. No blue.
- Panels: `--surface` on `--bg`, hairlines (not shadows). Radius **6px** everywhere (one value).
- Chart area: `--surface` (pure white light / `#121210` dark) for cleanest candles.
- Tooltips / "What is this?" bubbles: `--text` background, `--bg` text.
- Up/down: always `▲ +2.4%` / `▼ −1.1%` (symbol + sign, never color alone).
- Scanner/signal chips: neutral outlined chips; only the direction mark uses up/down colors.
- Gold: max 2–3 tiny touches per screen.
- Focus ring: 2px solid `--text` with 2px offset, always visible on keyboard focus.

**Contrast:** every text/background pair ≥ 4.5:1 (text) or 3:1 (large text/graphics); added to `test-theme-contrast.js` in Phase 4.

---

## 3. Type scale & spacing

**Type scale:** 12 / 14 / 16 / 20 / 28 / 40  
Line-height 1.5 for text, 1.2 for headings. Left-aligned text.  
Body/UI: Inter (already local). Headings: Inter with weight 500–600 (system serif fallback if byte budget is tight — keep under ~80 KB total fonts).

**Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48  
**Radius:** 6px everywhere (one value)  
**Numbers:** `font-variant-numeric: tabular-nums` so prices don't jump.

---

## 4. Components (markup + style only; behavior unchanged)

- **Buttons:** primary (filled), secondary (outline hairline), icon buttons (48×48 dp touch target).
- **Tables:** right-aligned numbers, sticky header, subtle zebra/hairlines, compact desktop, stacked rows on mobile.
- **Watchlist rows:** name, symbol, price, 24h change with `▲`/`▼` + sign; search/filter box above.
- **Breadth panel:** plain-words "market mood" (e.g. "Market mood: 20 of 45 coins are rising"), donut + 3-segment bar, `Assets Analyzed: n / 45`, data source, live `HH:MM:SS`.
- **Chart container:** reserved space (no layout shift), touch-friendly, visible "reset zoom".
- **Dialogs / tooltips / "What is this?" bubbles:** `--text` background, `--bg` text, 1–2 sentence plain explanations.
- **Empty / loading / error states:** one plain sentence each, skeletons for loading.
- **Focus ring:** always visible.

---

## 5. Simple view (default, beginner-friendly) vs Advanced view

**Simple view (shown first):**
1. Market mood — breadth panel in plain words.
2. 45-coin watchlist — name, price, 24h change.
3. One clean chart.

**Advanced view (one click away, hidden until opened):**
Scanners, backtester, Zig Zag, Reference Levels, signal tracking, analytics.

**Plain words everywhere:** "24h change" → "Price change, last 24 hours". "Breadth" → "Market mood: how many coins are going up vs down". Glossary included. "What is this?" helper next to non-obvious panels. First-visit mini guide (3–4 steps, skippable, `localStorage`, never blocks).

---

## 6. Mobile layout

- Simple top menu or bottom navigation, big targets (≥ 48×48 dp).
- No horizontal scrolling.
- Tables become readable stacked rows or scroll inside their own container.
- Chart touch-friendly with visible "reset zoom".
- Lite Mode switch visible so you can test it by hand.

---

## 7. What stays untouched (guardrails)

- `api/gateway.js`, admin pages, all `supabase/`, login/MFA — not touched.
- `bluepeak-ui.js` dropdown/bottom-sheet code — not touched (ask owner first if a change is truly needed).
- Chart candle colors `#089981`/`#F23645`, Zig Zag logic, Reference Levels logic, order-book coloring — unchanged.
- Exactly the 45 USDT pairs in agreed order; BNB/DOGE/SHIB/PEPE/PAXG never re-added.
- Script-tag fix preserved: every `<script src="…">` empty body + closed; `window.BluePeakTerminal` once in its own plain `<script>` exposing `getMarketBreadth` + load warm-up.
- Read-only site; "market data only, not advice" note visible.
- No React/Next.js/Tailwind/jQuery/heavy libraries. Vanilla HTML/CSS/JS only.

---

## 8. Performance targets (to measure, not claim)

| Item | Target |
|------|--------|
| HTML+CSS+JS (gzipped) | ≤ ~250 KB (currently ≈110 KB) |
| Largest Contentful Paint | < 2.5 s (Slow 4G + 4× CPU slowdown) |
| DOM nodes on first screen | < 1,500 (currently ~803 static) |
| Main-thread long tasks while idle | none > 200 ms |
| Layout shift | ~0 (reserve space for chart, rows, images) |

**Potato-phone rules:** no `backdrop-filter`, no big blurs, no heavy shadows, no animated gradients, no looping animation, no parallax; canvas pixel ratio capped at 2; redraw chart only on data/size change (`requestAnimationFrame`, no constant loop); batch WebSocket updates (~250 ms throttle); pause updates when tab hidden (`visibilitychange`); `content-visibility: auto` + `contain-intrinsic-size` for off-screen sections; lazy-load below the fold; Lite Mode auto-on for `deviceMemory ≤ 2`, `hardwareConcurrency ≤ 4`, `prefers-reduced-motion`, or `Save-Data`.

---

## 9. First-screen preview

A static HTML preview of the Simple view (desktop + phone) is at `preview/simple-view.html`. It is **not connected to live data** and is **not part of the site yet** — it exists only so you can OK the look before I build.

**No changes to the live site have been made.** Nothing is pushed or deployed.

Please open `preview/simple-view.html` and tell me if the direction is OK. If yes, I proceed to Phase 3 (build) on the current branch, then Phase 4 (verify with all six suites), then Phase 5 (ZIP + ask before push/deploy).
