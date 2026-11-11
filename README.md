# Venga · Buy

Landing page for buying crypto, built from the Figma section "Buy" (node 42401:46626) in the "👨🏻‍💻 Website" file. The hero calculator works like variant D of the buy prototype (Jy-designs/buy, `?variant=d`): a crypto dropdown with search, live prices and a "what if the price changes" slider.

Plain HTML, CSS and a little JavaScript: no build step or dependencies.

## Files
- `index.html`: markup and copy (English)
- `styles.css`: all styles, the breakpoints and the motion states at the bottom
- `calculator.js`: the buy calculator (prices, amounts, dropdown with search, slider, future price)
- `main.js`: nav, scroll reveals, FAQ, banner parallax
- `assets/`: SVGs and images exported from Figma (photos compressed to JPEG); `assets/coins3d/` holds the 3D coins from the buy prototype used in the dropdown
- `fonts/`: Labil Grotesk (excluded from git, see below)

## Calculator
- **You invest:** type an amount, or press and hold − / + (steps of €10, €50 after 2 seconds). Arrow keys work too.
- **Crypto:** opens a list inside the card with a search field (name or ticker), each coin's price, keyboard navigation and Escape to close.
- **You receive:** amount ÷ live price. **What if the price changes?** drag the knob (−100% to +100%), use the arrow keys, type a future price, or press − / + (1% steps). The dot in the middle resets to 0%.
- **Prices:** Kraken's public Ticker API (EUR, no API key), refreshed every 30 seconds. If Kraken can't be reached, the page uses the reference prices in `COINS` and says so under the calculator.
- **Before production:** confirm the data source with Legal, and switch to Venga's own price feed if needed. Only `fetchPrices()` in `calculator.js` needs to change.

## Before going live
- `DOWNLOAD_URL` in `main.js` sets every Download / Get the App button. It currently scrolls to the QR code section.
- Nav, chip, footer and "See all our available coins" links are `#` placeholders. The language selector only shows EN.
- FAQ answers are drafts (Figma only has the questions).

## Breakpoints
| Range | Figma frame |
|---|---|
| 1280px and up | Desktop 1440 |
| 1025–1279px | Desktop 1025 (hero stacks, calculator under the copy) |
| 768–1024px | Tablet (step cards scroll sideways) |
| below 768px | Mobile (calculator fields stack) |

## Run locally

    python3 -m http.server 3600

then open http://localhost:3600.

## Fonts
Labil Grotesk is a licensed typeface, so `fonts/` is ignored by git. Without it the page falls back to the system font. Copy the four `.otf` files into `fonts/` locally (they are in the other Venga projects).
