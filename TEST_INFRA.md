# Test Infrastructure Specification: Foodlink Profile (/perfil/)

## 1. Philosophy & Approach
- Approach: Opaque-box, requirement-driven verification derived directly from ORIGINAL_REQUEST.md and PROJECT.md specifications.
- Integrity: Zero facade tests, zero synthetic stubs of business logic, zero hardcoded pass shortcuts. Tests execute actual backend routes (both MySQL database and in-memory fallback), actual QR bitstream generation, and a real headless Firefox browser instance interacting with the compiled web app.
- Zero Emojis: Strictly prohibited across all test files, test output, documentation, and configuration.

## 2. Test Architecture & Runner Stack
- Test Runner: Node.js v26 native test runner (`node:test` and `node:assert`).
- TypeScript Execution: Native type stripping via `--experimental-strip-types`. No external transpilers (babel, ts-node, esbuild) or heavy test harnesses (jest, vitest) required.
- Browser Automation: Native Mozilla Firefox 159.0.1 (`/home/pato/.local/bin/firefox`) running with `--headless` and communicating over standard W3C WebDriver BiDi via native WebSocket (`ws://127.0.0.1:<port>/session`). Zero external browser drivers (puppeteer, playwright, selenium) required.
- Isolation: Each test file manages its own server lifecycle or ephemeral data state, operating cleanly in parallel or standalone execution.

## 3. Test Suites Structure

### Tier 1: Core Feature Coverage
1. `tests/unit/qr.test.ts`
   - Lossless QR Code Engine verification.
   - Encodes and verifies 18+ byte alphanumeric pickup payloads (such as `FOODLINK:FL-XXXXXX`).
   - Verifies zero trailing-character truncation (e.g. 18th character is not dropped).
   - Verifies distinct payloads produce distinct SVG matrix outputs.
   - Matrix module analysis confirming quiet zones, finder patterns, and data density.

2. `tests/api/preferences.test.ts`
   - User profile preferences persistence parity.
   - Verifies persistence of `pickup_alias`, `role`, `zone_note`, `dietary_tags`, and `notify_favorites`.
   - Tests both SQL storage and in-memory fallback mode (`FOODLINK_DISABLE_PLACES_DB=1`).
   - Verifies account `name` is never overwritten or mutated when saving `pickup_alias`.

3. `tests/api/business-security.test.ts`
   - Strict business ownership isolation.
   - Verifies non-merchant or unrelated users receive `business: null` and empty `available_businesses` (no demo store leak).
   - Verifies merchant authorization for offer creation and closure.
   - Verifies QR redemption validation: returns 400 when an order does not belong to the redeeming merchant store.

4. `tests/api/favorites.test.ts`
   - Distance-independent favorites persistence.
   - Verifies establishments located beyond 10 km (>10,000 meters) remain present in user favorites and are returned by `/api/places/nearby`.
   - Verifies active rescue alerts are attached to favorited establishments regardless of distance.

5. `tests/api/auth-parity.test.ts`
   - Authentication endpoint parity across database and in-memory modes.
   - Verifies `/api/auth/me`, `/api/auth/verify`, and `/api/auth/resend-code` behave consistently in both MySQL connected mode and in-memory fallback mode.

### Tier 2: Boundary & Corner Cases
- Included in unit and API test suites:
  - Empty or partial preferences payload updates.
  - Zero-price offers and offers where `price > original_price` rejected with status 400.
  - QR payload lengths 17, 18, 19, and 32 characters.
  - Redemption attempts with invalid, missing, or mismatched `businessId`.

### Tier 3: Cross-Feature Integration Workflows
- Included in `tests/api/business-security.test.ts`:
  - Complete lifecycle:
    1. Register/Seed business for Merchant A and Merchant B.
    2. Merchant A publishes an active surplus offer.
    3. Customer reserves the surplus offer and receives a pickup code.
    4. Merchant B attempts to redeem Customer pickup code (rejected with 400).
    5. Merchant A redeems Customer pickup code (succeeds with 200, status updated to `picked_up`).

### Tier 4: Real-World Browser End-to-End Automation
- `tests/e2e/profile.e2e.ts`:
  - Starts local HTTP server hosting the built application and places API.
  - Spawns headless Firefox with ephemeral profile.
  - Connects to WebDriver BiDi session.
  - Subscribes to `network.beforeRequestSent` and `log.entryAdded`.
  - Verifies zero external Google Fonts requests (`fonts.googleapis.com` or `fonts.gstatic.com`).
  - Verifies zero browser console errors (unhandled exceptions, failed scripts).
  - Tests desktop viewport (1280x800) and mobile viewport (390x844).
  - Navigates through all 5 profile tabs (`cuenta`, `pedidos`, `impacto`, `favoritos`, `negocio`).
  - Validates sticky capsule navigation on mobile viewport.

## 4. Execution Commands
```bash
# Run all tests (unit, API, and e2e)
npm test

# Run unit tests only
npm run test:unit

# Run API integration tests only
npm run test:api

# Run browser end-to-end tests only
npm run test:e2e
```
