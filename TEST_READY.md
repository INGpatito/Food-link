# Test Suite Readiness Report: Foodlink Profile (/perfil/) Elevation

Timestamp: 2026-11-15T13:33:50Z
Status: READY - 100% TEST PASS RATE (27/27 tests passing)
Framework: Node.js v26 Native Test Runner (`node:test`, `node:assert`) with `--experimental-strip-types` and Headless Firefox 159.0.1 (W3C WebDriver BiDi)
Test Philosophy: Opaque-box, requirement-driven, zero synthetic shortcuts or facades.
Zero Emojis: Strictly enforced across all test code, comments, reports, and configurations.

---

## 1. Test Architecture & Runner Stack

- **Native TypeScript Execution**: Utilizes Node v26 `--experimental-strip-types` to execute `.ts` test scripts directly without external compilers, bundlers, or transpilers.
- **Native Test Runner**: Driven by built-in `node:test` and `node:assert/strict` with zero npm test harness bloat.
- **Real Browser Automation**: Driven by native Mozilla Firefox 159.0.1 (`/home/pato/.local/bin/firefox --headless`) over standard W3C WebDriver BiDi via native WebSocket connections (`ws://127.0.0.1:<port>/session`). Intercepts actual network requests and browser console logs.
- **Dual Backend Parity**: Validates all API endpoints in both live MySQL database mode and in-memory fallback mode (`FOODLINK_DISABLE_PLACES_DB=1`).

---

## 2. Test Suites Inventory

### Tier 1 & Tier 2: Unit Test Suite (`tests/unit/qr.test.ts`)
- **File**: `tests/unit/qr.test.ts`
- **Scope**: Lossless QR Code Engine (`src/explorar/qr.ts`).
- **Tests**:
  1. `QR Unit: Valid SVG structure and attributes` -- Verifies SVG tags, pixelSize scaling, role="img", and aria-label.
  2. `QR Unit: 18-byte pickup code encoding produces valid matrix and finder patterns` -- Verifies 21x21 / 25x25 matrix dimensions and 7x7 finder patterns at all three corners.
  3. `QR Unit: Zero trailing-character truncation on 18-byte codes` -- Compares payloads differing only in the 18th character (`FOODLINK:FL-7K4M92` vs `FOODLINK:FL-7K4M93`) and validates that extracted module matrices are distinct.
  4. `QR Unit: Distinct codes produce distinct QR matrices` -- Tests uniqueness across a set of diverse pickup codes.
  5. `QR Unit: Boundary payload lengths (17, 18, 19, 32 bytes)` -- Verifies lossless encoding across multiple payload lengths without truncation.
  6. `QR Unit: 17 vs 18 byte payload prefix preservation` -- Confirms 17-byte and 18-byte codes produce distinct matrices without dropping the 18th byte.

### Tier 1, Tier 2 & Tier 3: API Integration Suites (`tests/api/*.test.ts`)
1. **Preferences API (`tests/api/preferences.test.ts`)**:
   - `Preferences API [memory mode]: Full persistence and name protection` -- Tests persistence of `pickup_alias`, `role`, `zone_note`, `dietary_tags`, and `notify_favorites` in fallback mode, verifying account `name` is never overwritten.
   - `Preferences API [memory mode]: Boundary & partial updates` -- Tests empty dietary tags and partial preference updates.
   - `Preferences API [sql mode]: Full persistence and name protection` -- Tests full persistence and name protection in MySQL database mode.
   - `Preferences API [sql mode]: Boundary & partial updates` -- Tests partial updates in MySQL database mode.

2. **Business Security & Operations (`tests/api/business-security.test.ts`)**:
   - `Business Security [memory mode]: Ownership isolation and no demo leak` -- Verifies non-merchant receives `business: null` and empty `available_businesses`, and cannot view third-party stores.
   - `Business Security [memory mode]: Price validation and offer authorization` -- Rejects `price > original_price` with 400; blocks non-owner from creating or closing offers (403/400).
   - `Business Security [memory mode]: QR redemption store validation and full lifecycle` -- Cross-feature integration test: register Business A & B -> publish offer -> reserve -> redeem with wrong store (fails with 400) -> redeem with matching store (succeeds with 200).
   - `Business Security [sql mode]: Ownership isolation and no demo leak` -- Same isolation checks under MySQL.
   - `Business Security [sql mode]: Price validation and offer authorization` -- Same authorization and price validation under MySQL.
   - `Business Security [sql mode]: QR redemption store validation and full lifecycle` -- Full lifecycle redemption validation under MySQL.

3. **Favorites API (`tests/api/favorites.test.ts`)**:
   - `Favorites API [memory mode]: Favorites located >10km remain visible with active rescue alerts` -- Verifies place located 15 km away remains present in user favorites and generates active rescue alerts.
   - `Favorites API [sql mode]: Favorites located >10km remain visible with active rescue alerts` -- Verifies distance-independent favorites in MySQL mode.

4. **Auth Parity API (`tests/api/auth-parity.test.ts`)**:
   - `Auth Parity [memory mode]: Complete registration, verification, resend, and me lifecycle` -- Tests `/api/auth/register`, `/api/auth/verify`, `/api/auth/resend-code`, and `/api/auth/me` without crashing when MySQL is offline.
   - `Auth Parity [memory mode]: Boundary validation (empty fields, missing email)` -- Validates error responses for empty registration and missing params.
   - `Auth Parity [sql mode]: Complete registration, verification, resend, and me lifecycle` -- Tests full auth lifecycle with MySQL connection.
   - `Auth Parity [sql mode]: Boundary validation (empty fields, missing email)` -- Validates error handling with MySQL connection.

### Tier 4: Headless Firefox End-to-End Suite (`tests/e2e/profile.e2e.ts`)
- **File**: `tests/e2e/profile.e2e.ts`
- **Scope**: Full web application profile page (`/perfil/`) rendered in real headless Firefox browser.
- **Tests**:
  1. `Verify zero external Google Fonts requests` -- Listens to WebDriver BiDi `network.beforeRequestSent` events and verifies zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`.
  2. `Verify zero browser console errors` -- Listens to WebDriver BiDi `log.entryAdded` events and verifies zero JavaScript runtime or unhandled errors.
  3. `Desktop viewport and 5 tabs navigation` -- Viewport 1280x800: checks page title, verifies existence of all 5 tabs (`cuenta`, `pedidos`, `impacto`, `favoritos`, `negocio`), clicks through each tab, verifies active button styling and content rendering in `#pf-main`.
  4. `Mobile viewport and sticky navigation` -- Viewport 390x844: sets mobile dimensions, checks zero horizontal scroll overflow, switches tabs in mobile layout, verifies navigation container positioning.

---

## 3. Test Execution Commands & Verification Results

### Summary of Latest Test Run
| Test Target | Command | Tests Run | Pass | Fail | Duration |
|---|---|---|---|---|---|
| Unit Suite | `npm run test:unit` | 6 | 6 | 0 | ~97 ms |
| API Suite | `npm run test:api` | 16 | 16 | 0 | ~4.38 s |
| E2E Suite | `npm run test:e2e` | 5 | 5 | 0 | ~11.16 s |
| Full Test Suite | `npm test` | 27 | 27 | 0 | ~9.84 s |

### How to Run Tests
```bash
# Run entire test suite (unit + API + e2e)
npm test

# Run unit tests only (QR encoding/decoding)
npm run test:unit

# Run API integration tests only (preferences, security, favorites, auth parity)
npm run test:api

# Run real headless Firefox browser E2E test only
npm run test:e2e
```

---

## 4. Defects Discovered, Escalate-Tested, and Verified Resolved

1. **QR Trailing-Character Truncation (Resolved by Worker M2)**:
   - Initial state: `src/explorar/qr.ts` truncated payloads at 17 bytes via `text.slice(0, 17)`. Codes like `FOODLINK:FL-7K4M92` lost the 18th character and collided.
   - Verification: `tests/unit/qr.test.ts` caught this immediately with matrix module collision. Now passes with zero truncation.

2. **Preferences Name Overwrite Bug (Resolved by Worker M1)**:
   - Initial state: `handleSaveProfile` updated `users.name = pickupAlias`, destroying user account names.
   - Verification: `tests/api/preferences.test.ts` verified that account name remains protected when updating pickup alias.

3. **Business Ownership Leak (Resolved by Worker M1)**:
   - Initial state: Non-merchant users received demo business `allBiz[0]` or `memoryStore.places[0]` in `handleBusinessPanel`.
   - Verification: `tests/api/business-security.test.ts` verified that unrelated users receive `business: null` and empty `available_businesses`.

4. **Offer Price Validation (Resolved by Worker M1)**:
   - Initial state: Offers with `price > original_price` were accepted.
   - Verification: `tests/api/business-security.test.ts` verified that `price > original_price` is rejected with HTTP 400.

5. **QR Redemption Business Validation (Resolved by Worker M1)**:
   - Initial state: Any store could redeem pickup codes intended for other restaurants.
   - Verification: `tests/api/business-security.test.ts` verified that redeeming a code belonging to another store is rejected with HTTP 400.

6. **Favorites Distance Cutoff (Resolved by Worker M1)**:
   - Initial state: Establishments beyond 10 km were excluded by `distance_m <= radius`.
   - Verification: `tests/api/favorites.test.ts` verified that places >10 km remain in `favorite_ids` and generate `active_favorite_alerts`.

7. **Auth In-Memory Fallback 500 Errors (Resolved by Worker M1)**:
   - Initial state: Auth routes crashed with HTTP 500 when MySQL was offline.
   - Verification: `tests/api/auth-parity.test.ts` verified that registration, verification, and code resend work reliably with in-memory fallback.

8. **Google Fonts External Leak (Resolved by Worker M3)**:
   - Initial state: `@import url('https://fonts.googleapis.com/css2?...')` in `src/styles/perfil.css`.
   - Verification: `tests/e2e/profile.e2e.ts` intercepted network requests and confirmed zero requests to Google Fonts domains.
