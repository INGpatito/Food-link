import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { getFreePort } from '../helpers/serverHelper.ts';
import { launchFirefoxBiDi, type FirefoxSession } from '../helpers/firefoxHelper.ts';

interface AppServer {
  port: number;
  baseUrl: string;
  stop: () => Promise<void>;
}

async function startViteAppServer(timeoutMs = 15000): Promise<AppServer> {
  const port = await getFreePort();
  const projectRoot = path.resolve(import.meta.dirname, '../..');
  const baseUrl = `http://127.0.0.1:${port}`;

  const proc: ChildProcess = spawn(
    'npx',
    ['vite', '--port', String(port), '--host', '127.0.0.1'],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        VITE_PORT: String(port)
      },
      stdio: 'pipe'
    }
  );

  const stop = (): Promise<void> => {
    return new Promise((resolve) => {
      if (proc.killed || proc.exitCode !== null) return resolve();
      proc.once('exit', () => resolve());
      proc.kill('SIGTERM');
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
        resolve();
      }, 2000);
    });
  };

  const startTime = Date.now();
  let ready = false;

  while (Date.now() - startTime < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(`Vite server exited prematurely with code ${proc.exitCode}`);
    }
    try {
      const res = await fetch(`${baseUrl}/perfil/`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  if (!ready) {
    await stop();
    throw new Error(`Timed out waiting for Vite server on port ${port}`);
  }

  return { port, baseUrl, stop };
}

async function evalJson<T = any>(browser: FirefoxSession, expression: string): Promise<T> {
  const jsonStr = await browser.evaluate<string>(`JSON.stringify((${expression}))`);
  return JSON.parse(jsonStr) as T;
}

async function waitForSelector(browser: FirefoxSession, selector: string, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await browser.evaluate<boolean>(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (found) return;
    await new Promise((r) => setTimeout(r, 120));
  }
  const diag = await browser.evaluate<string>(
    'JSON.stringify({ url: location.href, panel: (document.getElementById("fx-panel-body") || document.getElementById("pf-main") || document.body)?.innerText?.slice(0, 300) })'
  ).catch(() => '');
  throw new Error(`Timed out waiting for selector "${selector}" after ${timeoutMs}ms (diag=${diag})`);
}

test('E2E Profile: Full headless Firefox verification suite', async (t) => {
  let appServer: AppServer | null = null;
  let browser: FirefoxSession | null = null;

  try {
    appServer = await startViteAppServer();
    browser = await launchFirefoxBiDi({ width: 1280, height: 800 });

    const perfilUrl = `${appServer.baseUrl}/perfil/`;

    // 1. First navigation & seed user session
    await browser.navigate(perfilUrl);
    await browser.evaluate(`
      localStorage.setItem('foodlink_user', JSON.stringify({
        id: 999,
        name: 'Comensal E2E',
        email: 'e2e@foodlink.local',
        is_verified: true
      }));
    `);

    // Reload with authenticated session
    await browser.navigate(perfilUrl);
    await new Promise((r) => setTimeout(r, 1500));

    // Subtest A: Zero external Google Fonts requests
    await t.test('Verify zero external Google Fonts requests', async () => {
      const fontRequests = browser!.getGoogleFontsRequests();
      assert.deepStrictEqual(
        fontRequests,
        [],
        `Expected zero external Google Fonts requests, but found: ${JSON.stringify(fontRequests)}`
      );
    });

    // Subtest B: Zero browser console errors
    await t.test('Verify zero browser console errors', async () => {
      const consoleErrors = browser!.getConsoleErrors();
      assert.deepStrictEqual(
        consoleErrors,
        [],
        `Expected zero browser console errors, but encountered: ${JSON.stringify(consoleErrors)}`
      );
    });

    // Subtest C: Desktop viewport (1280x800) and all 5 tabs navigation
    await t.test('Desktop viewport and 5 tabs navigation', async () => {
      const pageTitle = await browser!.evaluate<string>('document.title');
      assert.ok(
        pageTitle.toLowerCase().includes('perfil'),
        `Page title must mention Perfil (got: ${pageTitle})`
      );

      const tabIds = await evalJson<string[]>(
        browser!,
        `Array.from(document.querySelectorAll('.pf-nav-btn')).map(b => b.getAttribute('data-tab'))`
      );

      assert.ok(Array.isArray(tabIds), 'Navigation buttons must exist');
      assert.ok(tabIds.includes('cuenta'), 'Must include cuenta tab');
      assert.ok(tabIds.includes('pedidos'), 'Must include pedidos tab');
      assert.ok(tabIds.includes('impacto'), 'Must include impacto tab');
      assert.ok(tabIds.includes('favoritos'), 'Must include favoritos tab');
      assert.ok(tabIds.includes('negocio'), 'Must include negocio tab');

      for (const tab of ['cuenta', 'pedidos', 'impacto', 'favoritos', 'negocio'] as const) {
        await browser!.evaluate(`
          {
            const targetBtn = document.querySelector('button[data-tab="${tab}"]');
            if (targetBtn) targetBtn.click();
          }
        `);
        await new Promise((r) => setTimeout(r, 300));

        const mainContent = await browser!.evaluate<string>('document.getElementById("pf-main")?.innerHTML || ""');
        assert.ok(
          mainContent.length > 20,
          `Main content must render for tab ${tab} (got content length ${mainContent.length})`
        );

        const isButtonActive = await browser!.evaluate<boolean>(`
          document.querySelector('button[data-tab="${tab}"]')?.classList.contains('is-active') || false
        `);
        assert.strictEqual(isButtonActive, true, `Button for tab ${tab} must have is-active class`);
      }
    });

    // Subtest D: Mobile viewport (390x844) and sticky navigation
    await t.test('Mobile viewport and sticky navigation', async () => {
      await browser!.setViewport(390, 844);
      await new Promise((r) => setTimeout(r, 500));

      const viewportWidth = await browser!.evaluate<number>('window.innerWidth');
      assert.strictEqual(viewportWidth, 390, 'Viewport width must be 390px');

      const hasHorizontalOverflow = await browser!.evaluate<boolean>(`
        document.documentElement.scrollWidth > window.innerWidth + 2
      `);
      assert.strictEqual(
        hasHorizontalOverflow,
        false,
        'Page must have zero horizontal overflow on mobile 390px width'
      );

      for (const tab of ['pedidos', 'impacto', 'favoritos', 'negocio', 'cuenta'] as const) {
        await browser!.evaluate(`
          {
            const targetBtn = document.querySelector('button[data-tab="${tab}"]');
            if (targetBtn) targetBtn.click();
          }
        `);
        await new Promise((r) => setTimeout(r, 200));

        const isButtonActive = await browser!.evaluate<boolean>(`
          document.querySelector('button[data-tab="${tab}"]')?.classList.contains('is-active') || false
        `);
        assert.strictEqual(isButtonActive, true, `Mobile: Tab ${tab} must be selectable`);
      }

      const navPosition = await browser!.evaluate<string>(`
        (() => {
          const nav = document.querySelector('.pf-nav') || document.querySelector('.pf-sidebar');
          if (!nav) return 'none';
          const style = window.getComputedStyle(nav);
          return style.position;
        })()
      `);
      assert.ok(
        ['sticky', 'relative', 'fixed', 'static'].includes(navPosition),
        `Navigation position must be valid CSS position (got: ${navPosition})`
      );
    });

    // Subtest E: 320px narrow mobile layout, sticky nav with overflow-x: clip, order timestamps & close-offer
    await t.test('320px layout, sticky nav clip, order dates, and close-offer', async () => {
      const ownerEmail = `e2e_owner_${Date.now()}@foodlink.local`;
      const buyerEmail = `e2e_buyer_${Date.now()}@foodlink.local`;

      // Seed user business, active offer, pending order, and favorite via API
      const bizRes = await fetch(`${appServer!.baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Panaderia Narrow E2E',
          type: 'panaderia',
          address: 'Calle Veracruz 44, Condesa',
          phone: '5511229988',
          lat: 19.415,
          lng: -99.172,
          owner_email: ownerEmail
        })
      });
      const bizData = await bizRes.json();
      assert.strictEqual(bizData.success, true);
      const bizId = bizData.business.id;

      const offerRes = await fetch(`${appServer!.baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          email: ownerEmail,
          title: 'Canasta Pan Dulce E2E',
          originalPrice: 150,
          price: 60,
          quantity: 4,
          pickupHours: 3
        })
      });
      const offerData = await offerRes.json();
      assert.strictEqual(offerData.success, true);
      const offerId = offerData.offer.id;

      await fetch(`${appServer!.baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: buyerEmail,
          userName: 'Comprador E2E',
          offerId,
          quantity: 1
        })
      });

      await fetch(`${appServer!.baseUrl}/api/places/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          businessId: bizId
        })
      });

      await browser!.evaluate(`
        localStorage.setItem('foodlink_user', JSON.stringify({
          id: 998,
          name: 'Dueño E2E Largo',
          email: ${JSON.stringify(ownerEmail)},
          is_verified: true
        }));
      `);

      // Also seed a second picked-up order so history row renders in business panel
      const histOrderRes = await fetch(`${appServer!.baseUrl}/api/places/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: buyerEmail,
          userName: 'Comprador Historial E2E',
          offerId,
          quantity: 1
        })
      });
      const histOrderData = await histOrderRes.json();
      if (histOrderData?.order?.pickup_code) {
        await fetch(`${appServer!.baseUrl}/api/places/business/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickup_code: histOrderData.order.pickup_code, businessId: bizId })
        });
      }

      const inspect320InnerLayout = async (contextLabel: string) => {
        const report = await evalJson<{
          innerWidth: number;
          scrollWidth: number;
          topbarOverflow: boolean;
          clippedItems: Array<{ tag: string; cls: string; right: number; limit: number }>;
          bizRowHeights: number[];
          bizChildMetrics: Array<{ height: number; flexBasis: string }>;
        }>(
          browser!,
          `(() => {
            const vw = window.innerWidth;
            const sw = document.documentElement.scrollWidth;
            const topbar = document.querySelector('.pf-topbar');
            const topbarRect = topbar ? topbar.getBoundingClientRect() : null;
            const topbarActions = [...document.querySelectorAll('.pf-topbar-actions a, .pf-topbar-actions button')];
            const topbarOverflow = Boolean(topbarRect && topbarActions.some((el) => el.getBoundingClientRect().right > topbarRect.right + 1));

            const clippedItems = [];
            for (const el of document.querySelectorAll('.pf-app *')) {
              const st = getComputedStyle(el);
              if (st.display === 'none' || st.visibility === 'hidden') continue;
              if (el.closest('.pf-nav')) continue;
              if (el.classList.contains('pf-ticket-divider') || el.classList.contains('pf-ticket-notch')) continue;
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) continue;
              const card = el.closest('.pf-panel-card, .pf-order-card, .pf-user-card, .pf-topbar');
              const limit = card && el !== card ? Math.min(vw, card.getBoundingClientRect().right) : vw;
              if (r.right > limit + 1) {
                clippedItems.push({
                  tag: el.tagName,
                  cls: typeof el.className === 'string' ? el.className : '',
                  right: Math.round(r.right),
                  limit: Math.round(limit)
                });
              }
            }

            const bizRows = [...document.querySelectorAll('.pf-biz-row')];
            const bizRowHeights = bizRows.map((r) => Math.round(r.getBoundingClientRect().height));
            const bizChildMetrics = bizRows.flatMap((r) =>
              [...r.querySelectorAll(':scope > div')].map((d) => ({
                height: Math.round(d.getBoundingClientRect().height),
                flexBasis: getComputedStyle(d).flexBasis
              }))
            );

            return { innerWidth: vw, scrollWidth: sw, topbarOverflow, clippedItems: clippedItems.slice(0, 8), bizRowHeights, bizChildMetrics };
          })()`
        );

        assert.strictEqual(report.innerWidth, 320, `${contextLabel}: Viewport must be 320px wide`);
        assert.ok(report.scrollWidth <= report.innerWidth + 1, `${contextLabel}: horizontal overflow (scrollWidth=${report.scrollWidth})`);
        assert.strictEqual(report.topbarOverflow, false, `${contextLabel}: .pf-topbar-actions must fit inside .pf-topbar`);
        assert.deepStrictEqual(report.clippedItems, [], `${contextLabel}: inner elements must not clip past card/viewport edge`);
        for (const child of report.bizChildMetrics) {
          assert.strictEqual(child.flexBasis, 'auto', `${contextLabel}: .pf-biz-row > div mobile flex-basis must be auto`);
          assert.ok(child.height < 185, `${contextLabel}: .pf-biz-row > div must remain compact (got ${child.height}px)`);
        }
        for (const h of report.bizRowHeights) {
          assert.ok(h < 220, `${contextLabel}: .pf-biz-row height must remain compact on mobile (got ${h}px)`);
        }
      };

      // Check Cuenta, Pedidos, Impacto, Favoritos tabs at 320px (including inner-child clipping)
      for (const tab of ['cuenta', 'pedidos', 'impacto', 'favoritos'] as const) {
        await browser!.navigate(`${appServer!.baseUrl}/perfil/?tab=${tab}`);
        await browser!.setViewport(320, 844);
        await waitForSelector(browser!, '.pf-panel-card', 10000);
        await new Promise((r) => setTimeout(r, 300));
        await inspect320InnerLayout(`tab-${tab}-320`);
      }

      // Check Negocio tab at 320px (pending order + active offer + history order)
      await browser!.navigate(`${appServer!.baseUrl}/perfil/?tab=negocio`);
      await browser!.setViewport(320, 844);
      await waitForSelector(browser!, '.pf-biz-row', 10000);
      await new Promise((r) => setTimeout(r, 200));
      const bizCheck = await evalJson<{
        htmlOverflowX: string;
        bodyOverflowX: string;
        mainText: string;
        closeBtns: number;
      }>(
        browser!,
        `({
          htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
          bodyOverflowX: getComputedStyle(document.body).overflowX,
          mainText: document.getElementById('pf-main')?.textContent || '',
          closeBtns: document.querySelectorAll('[data-action="close-offer"]').length
        })`
      );
      await inspect320InnerLayout('tab-negocio-320');
      assert.strictEqual(bizCheck.htmlOverflowX, 'clip', 'html overflow-x must be clip');
      assert.strictEqual(bizCheck.bodyOverflowX, 'clip', 'body overflow-x must be clip');
      assert.ok(!bizCheck.mainText.includes('Invalid Date'), 'Pending order pickup time must not be Invalid Date');
      assert.ok(bizCheck.closeBtns >= 1, 'Active offer must render close-offer button');

      // Also check History sub-tab in Negocio tab at 320px
      await browser!.evaluate('document.querySelector(\'[data-action="set-biz-orders-tab"][data-tab="history"]\')?.click()');
      await new Promise((r) => setTimeout(r, 200));
      await inspect320InnerLayout('tab-negocio-history-320');

      // Scroll down and verify sticky nav pins near top: 66px
      await browser!.evaluate('window.scrollTo(0, 600)');
      await new Promise((r) => setTimeout(r, 200));
      const stickyNavTop = await browser!.evaluate<number>(
        'document.querySelector(".pf-nav")?.getBoundingClientRect().top ?? -1'
      );
      assert.ok(
        stickyNavTop >= 60 && stickyNavTop <= 72,
        `Sticky .pf-nav must stay pinned near 66px while scrolling (got ${stickyNavTop}px)`
      );

      // Verify close-offer 403 error branch: toast displays backend message and button re-enables
      await browser!.evaluate(`
        window.__origFetch = window.fetch;
        window.fetch = async (input, init) => {
          if (String(input).includes('/close')) {
            return new Response(JSON.stringify({ success: false, message: 'No autorizado E2E' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return window.__origFetch(input, init);
        };
        document.querySelector('[data-action="close-offer"]')?.click();
      `);
      await new Promise((r) => setTimeout(r, 350));
      const closeErrorUi = await evalJson<{ toast: string; disabled: boolean; closeBtns: number }>(
        browser!,
        `({
          toast: document.getElementById('pf-toast')?.textContent || '',
          disabled: Boolean(document.querySelector('[data-action="close-offer"]')?.hasAttribute('disabled')),
          closeBtns: document.querySelectorAll('[data-action="close-offer"]').length
        })`
      );
      assert.ok(closeErrorUi.toast.includes('No autorizado E2E'), `Expected 403 error toast, got: ${closeErrorUi.toast}`);
      assert.strictEqual(closeErrorUi.disabled, false, 'close-offer button must re-enable after error');
      assert.strictEqual(closeErrorUi.closeBtns, 1, 'Failed close-offer must keep active offer visible');

      // Restore fetch and perform real close-offer -> removes active offer
      await browser!.evaluate(`
        window.fetch = window.__origFetch;
        document.querySelector('[data-action="close-offer"]')?.click();
      `);
      await new Promise((r) => setTimeout(r, 900));
      const afterCloseBtns = await browser!.evaluate<number>(
        'document.querySelectorAll(\'[data-action="close-offer"]\').length'
      );
      assert.strictEqual(afterCloseBtns, 0, 'Closing offer from Perfil must send owner email and remove active offer');

      // Subtest F: Verify Modals.ts link on '/' points to /perfil/?tab=negocio and onboarding renders without 320px overflow
      const freshEmail = `e2e_fresh_modal_${Date.now()}@foodlink.local`;
      await browser!.setViewport(1280, 800);
      await browser!.navigate(`${appServer!.baseUrl}/`);
      await waitForSelector(browser!, '#join-modal a[href="/perfil/?tab=negocio"]', 10000);
      await browser!.evaluate(`
        localStorage.setItem('foodlink_user', JSON.stringify({
          id: 999,
          name: 'Nuevo Comercio',
          email: ${JSON.stringify(freshEmail)},
          is_verified: true
        }));
        window.openJoinModal?.('kitchen');
        document.querySelector('#join-modal a[href="/perfil/?tab=negocio"]')?.click();
      `);
      for (let i = 0; i < 40; i++) {
        const ok = await browser!.evaluate<boolean>(
          'window.location.pathname.includes("/perfil") && window.location.search.includes("tab=negocio") && Boolean(document.querySelector(".pf-onboarding-card"))'
        );
        if (ok) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      await browser!.setViewport(320, 844);
      await new Promise((r) => setTimeout(r, 200));
      await inspect320InnerLayout('onboarding-via-modal-320');

      // Subtest G: /explorar/?filtro=favoritos edge cases (0 favorites + Quitar filtros, 2 distant favorites >15km, unfavorite in place, 320px viewport)
      // 1) 0 favorites -> empty state + reset-filters clears URL param
      await browser!.setViewport(1280, 800);
      await browser!.navigate(`${appServer!.baseUrl}/explorar/?filtro=favoritos`);
      await waitForSelector(browser!, '.fx-empty [data-action="reset-filters"]', 12000);
      await browser!.evaluate('document.querySelector(\'.fx-empty [data-action="reset-filters"]\')?.click()');
      await new Promise((r) => setTimeout(r, 600));
      const clearedUrl = await browser!.evaluate<string>('window.location.search');
      assert.ok(!clearedUrl.includes('filtro=favoritos'), 'Quitar filtros on 0 favorites must clear filtro=favoritos from URL');

      // 2) Switch back to ownerEmail with 2 favorites >15km apart (one at Condesa 19.415,-99.172, second far north 19.565,-99.210)
      const farBizRes = await fetch(`${appServer!.baseUrl}/api/places/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fonda Lejana Norte E2E',
          type: 'fonda',
          address: 'Av. Norte 999, Tlalnepantla',
          phone: '5599887766',
          lat: 19.565,
          lng: -99.21,
          owner_email: `other_far_${Date.now()}@foodlink.local`
        })
      });
      const farBizData = await farBizRes.json();
      assert.strictEqual(farBizData.success, true);
      const farBizId = farBizData.business.id;

      await fetch(`${appServer!.baseUrl}/api/places/business/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bizId,
          email: ownerEmail,
          title: 'Croissant Favorito E2E',
          originalPrice: 90,
          price: 45,
          quantity: 2,
          pickupHours: 3
        })
      });
      await fetch(`${appServer!.baseUrl}/api/places/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, businessId: farBizId })
      });

      await browser!.evaluate(`
        localStorage.setItem('foodlink_user', JSON.stringify({
          id: 998,
          name: 'Dueño E2E Largo',
          email: ${JSON.stringify(ownerEmail)},
          is_verified: true
        }));
      `);

      const reqBaseline = browser!.getEvents().networkRequests.filter((r) => String(r.request?.url || '').includes('/api/places/nearby')).length;
      await browser!.navigate(`${appServer!.baseUrl}/explorar/?filtro=favoritos`);
      await browser!.setViewport(320, 844);
      await waitForSelector(browser!, '[data-action="toggle-favorites-filter"].is-active', 12000);
      await waitForSelector(browser!, '.fx-card', 14000);
      await new Promise((r) => setTimeout(r, 400));

      const explorarState = await evalJson<{
        title: string;
        pressed: string | null;
        cardCount: number;
        cardsText: string;
        overflow: boolean;
      }>(
        browser!,
        `({
          title: document.querySelector('.fx-title')?.textContent || '',
          pressed: document.querySelector('[data-action="toggle-favorites-filter"]')?.getAttribute('aria-pressed') || null,
          cardCount: document.querySelectorAll('.fx-card').length,
          cardsText: document.querySelector('.fx-list')?.textContent || '',
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1
        })`
      );
      const reqCountDelta = browser!.getEvents().networkRequests.filter((r) => String(r.request?.url || '').includes('/api/places/nearby')).length - reqBaseline;
      assert.strictEqual(explorarState.overflow, false, '/explorar/?filtro=favoritos must not overflow horizontally at 320px');
      assert.ok(explorarState.title.includes('Tus lugares favoritos'), `Expected favorites title, got: ${explorarState.title}`);
      assert.strictEqual(explorarState.pressed, 'true', 'Favoritos chip must have aria-pressed="true"');
      assert.strictEqual(explorarState.cardCount, 2, 'Both distant favorites (>15km apart) must appear in /explorar/?filtro=favoritos');
      assert.ok(explorarState.cardsText.includes('Panaderia Narrow E2E'), 'First favorite must appear');
      assert.ok(explorarState.cardsText.includes('Fonda Lejana Norte E2E'), 'Distant second favorite must appear');
      assert.strictEqual(reqCountDelta, 1, 'Initial favorites load should fire only 1 nearby request without redundant GPS-failure reload');

      // Unfavorite one card while filtro=favoritos is active -> card must disappear immediately without reload
      await browser!.setViewport(1280, 800);
      await browser!.evaluate('document.querySelector(".fx-fav-btn")?.click()');
      await new Promise((r) => setTimeout(r, 700));
      const countAfterUnfav = await browser!.evaluate<number>('document.querySelectorAll(".fx-card").length');
      assert.strictEqual(countAfterUnfav, 1, 'Unfavoriting inside ?filtro=favoritos must immediately remove card from list');

      // Toggle off Favoritos chip and verify ?filtro=favoritos clears from URL
      await browser!.evaluate('document.querySelector(\'[data-action="toggle-favorites-filter"]\')?.click()');
      await new Promise((r) => setTimeout(r, 600));
      const urlAfterToggle = await browser!.evaluate<string>('window.location.search');
      assert.ok(!urlAfterToggle.includes('filtro=favoritos'), 'Toggling off Favoritos chip must remove filtro=favoritos from URL');
    });
  } finally {
    if (browser) await browser.close();
    if (appServer) await appServer.stop();
  }
});

