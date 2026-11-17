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

test('Challenger 2: Adversarial Front-End Stress Testing Suite', async (t) => {
  let appServer: AppServer | null = null;
  let browser: FirefoxSession | null = null;

  try {
    appServer = await startViteAppServer();
    browser = await launchFirefoxBiDi({ width: 1280, height: 800 });

    const perfilUrl = `${appServer.baseUrl}/perfil/`;

    // Seed base authenticated session
    await browser.navigate(perfilUrl);
    await browser.evaluate(`
      localStorage.setItem('foodlink_user', JSON.stringify({
        id: 101,
        name: 'Challenger Verifier',
        email: 'challenger2@foodlink.local',
        is_verified: true
      }));
    `);
    await browser.navigate(perfilUrl);
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Multiple viewport dimensions: 1280x800, 390x844, 320x568 small mobile
    await t.test('Adversarial Viewports: Zero horizontal scroll overflow across tabs', async () => {
      const viewports = [
        { label: 'Desktop 1280x800', width: 1280, height: 800 },
        { label: 'Mobile Standard 390x844', width: 390, height: 844 },
        { label: 'Small Mobile 320x568', width: 320, height: 568 }
      ];

      const tabs = ['cuenta', 'pedidos', 'impacto', 'favoritos', 'negocio'] as const;

      for (const vp of viewports) {
        await browser!.setViewport(vp.width, vp.height);
        await new Promise((r) => setTimeout(r, 300));

        const actualWidth = await browser!.evaluate<number>('window.innerWidth');
        assert.strictEqual(actualWidth, vp.width, `${vp.label}: Viewport width must match expected`);

        for (const tab of tabs) {
          await browser!.evaluate(`
            {
              const targetBtn = document.querySelector('button[data-tab="${tab}"]');
              if (targetBtn) targetBtn.click();
            }
          `);
          await new Promise((r) => setTimeout(r, 200));

          const overflowInfo = await evalJson<{
            scrollWidth: number;
            innerWidth: number;
            bodyScrollWidth: number;
            hasOverflow: boolean;
            overflowingTags: string[];
          }>(
            browser!,
            `(() => {
              const sw = document.documentElement.scrollWidth;
              const iw = window.innerWidth;
              const bsw = document.body.scrollWidth;
              const tags = Array.from(document.querySelectorAll('*'))
                .filter(el => {
                  const rect = el.getBoundingClientRect();
                  return rect.right > iw + 2;
                })
                .map(el => {
                  const cls = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
                  return el.tagName + (cls ? '.' + cls.trim().split(/\\s+/).join('.') : '');
                })
                .slice(0, 5);

              return {
                scrollWidth: sw,
                innerWidth: iw,
                bodyScrollWidth: bsw,
                hasOverflow: sw > iw + 1 || bsw > iw + 1,
                overflowingTags: tags
              };
            })()`
          );

          assert.strictEqual(
            overflowInfo.hasOverflow,
            false,
            `${vp.label} on tab "${tab}": Found horizontal overflow (scrollWidth=${overflowInfo.scrollWidth}, innerWidth=${overflowInfo.innerWidth}, overflowing elements: ${JSON.stringify(overflowInfo.overflowingTags)})`
          );
        }
      }
    });

    // 2. Sticky navigation capsule sticks at top: 66px and active tab content remains visible above the fold on mobile
    await t.test('Adversarial Sticky Navigation: Sticks at top 66px and content visible above fold', async () => {
      // Set to mobile viewport
      await browser!.setViewport(390, 844);
      await new Promise((r) => setTimeout(r, 300));

      const navInfo = await evalJson<{
        position: string;
        top: string;
        zIndex: string;
        navRectTop: number;
        mainRectTop: number;
        isAboveFold: boolean;
      }>(
        browser!,
        `(() => {
          const nav = document.getElementById('pf-nav') || document.querySelector('.pf-nav');
          if (!nav) return { position: 'none', top: '', zIndex: '', navRectTop: 0, mainRectTop: 0, isAboveFold: false };
          const style = window.getComputedStyle(nav);
          const navRect = nav.getBoundingClientRect();
          const main = document.getElementById('pf-main');
          const mainRect = main ? main.getBoundingClientRect() : { top: 9999, bottom: 9999 };

          return {
            position: style.position,
            top: style.top,
            zIndex: style.zIndex,
            navRectTop: navRect.top,
            mainRectTop: mainRect.top,
            isAboveFold: mainRect.top < window.innerHeight && mainRect.bottom > 0
          };
        })()`
      );

      assert.strictEqual(navInfo.position, 'sticky', 'Mobile navigation must have position: sticky');
      assert.strictEqual(navInfo.top, '66px', 'Mobile navigation must stick at top: 66px');
      assert.strictEqual(navInfo.isAboveFold, true, 'Active tab content in #pf-main must be visible above the fold');
      assert.ok(
        navInfo.mainRectTop < 250,
        `Active tab content top (${navInfo.mainRectTop}px) must start immediately below sticky navigation without scrolling past user card`
      );

      // Verify on small mobile 320x568 as well
      await browser!.setViewport(320, 568);
      await new Promise((r) => setTimeout(r, 300));

      const smallMobileNavInfo = await evalJson<{
        position: string;
        top: string;
        mainRectTop: number;
        isAboveFold: boolean;
      }>(
        browser!,
        `(() => {
          const nav = document.getElementById('pf-nav') || document.querySelector('.pf-nav');
          if (!nav) return { position: 'none', top: '', mainRectTop: 0, isAboveFold: false };
          const style = window.getComputedStyle(nav);
          const main = document.getElementById('pf-main');
          const mainRect = main ? main.getBoundingClientRect() : { top: 9999, bottom: 9999 };
          return {
            position: style.position,
            top: style.top,
            mainRectTop: mainRect.top,
            isAboveFold: mainRect.top < window.innerHeight && mainRect.bottom > 0
          };
        })()`
      );

      assert.strictEqual(smallMobileNavInfo.position, 'sticky', 'Small mobile nav must have position: sticky');
      assert.strictEqual(smallMobileNavInfo.top, '66px', 'Small mobile nav must stick at top: 66px');
      assert.strictEqual(smallMobileNavInfo.isAboveFold, true, 'Small mobile active tab content must be visible above the fold');
      assert.ok(smallMobileNavInfo.mainRectTop < 250, 'Small mobile active content must start near top');
    });

    // 3. Network interception: verify zero external calls to fonts.googleapis.com or fonts.gstatic.com
    await t.test('Adversarial Font Request Interception: Zero external Google Fonts calls', async () => {
      const googleFontRequests = browser!.getGoogleFontsRequests();
      assert.deepStrictEqual(
        googleFontRequests,
        [],
        `Detected external Google Fonts requests: ${JSON.stringify(googleFontRequests)}`
      );

      // DOM check: inspect document for any external font stylesheet links
      const externalFontLinks = await evalJson<string[]>(
        browser!,
        `Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]'))
          .map(el => el.getAttribute('href') || '')
          .filter(href => href.includes('fonts.googleapis') || href.includes('fonts.gstatic'))`
      );
      assert.deepStrictEqual(
        externalFontLinks,
        [],
        `Document contains external font links: ${JSON.stringify(externalFontLinks)}`
      );
    });

    // 4. Dirty form protection: Simulate active typing in form fields during 12s polling interval and verify unsubmitted values are never clobbered
    await t.test('Adversarial Dirty Form Protection: Unsubmitted edits protected against polling clobbering', async () => {
      // Switch back to desktop viewport and cuenta tab
      await browser!.setViewport(1280, 800);
      await browser!.evaluate(`
        {
          const btn = document.querySelector('button[data-tab="cuenta"]');
          if (btn) btn.click();
        }
      `);
      await new Promise((r) => setTimeout(r, 500));

      const draftAlias = 'Adversarial Unsubmitted Alias 2026';

      // Type draft alias into pickup_alias input
      const inputFound = await browser!.evaluate<boolean>(`
        (() => {
          const input = document.querySelector('input[name="pickup_alias"]');
          if (!input) return false;
          input.focus();
          input.value = "${draftAlias}";
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()
      `);
      assert.strictEqual(inputFound, true, 'input[name="pickup_alias"] must exist on cuenta tab');

      // Verify the value was set
      const valueBeforePoll = await browser!.evaluate<string>(`
        document.querySelector('input[name="pickup_alias"]')?.value || ''
      `);
      assert.strictEqual(valueBeforePoll, draftAlias, 'Draft alias must be set in the DOM');

      // Trigger focus and visibility events (which trigger loadAllProfileData if not protected)
      await browser!.evaluate(`
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
      `);

      // Wait 12.5 seconds to cross the 12s polling interval
      await new Promise((r) => setTimeout(r, 12500));

      // Verify the value was NOT clobbered or reset by the background poll
      const valueAfterPoll = await browser!.evaluate<string>(`
        document.querySelector('input[name="pickup_alias"]')?.value || ''
      `);
      assert.strictEqual(
        valueAfterPoll,
        draftAlias,
        'Active unsubmitted form value must NOT be clobbered by background polling'
      );
    });

    // 5. Email verification state rendering and code resend actions
    await t.test('Adversarial Email Verification: State rendering and code resend action', async () => {
      // Step A: Register an unverified user in the backend
      const unverifiedEmail = `challenger_unverified_${Date.now()}@foodlink.local`;
      const regRes = await fetch(`${appServer!.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unverified Challenger',
          email: unverifiedEmail,
          password: 'securePassword123'
        })
      });
      assert.strictEqual(regRes.status, 201, 'Registration of unverified user must return 201');

      // Seed localStorage with unverified user session
      await browser!.evaluate(`
        localStorage.setItem('foodlink_user', JSON.stringify({
          id: 9999,
          name: 'Unverified Challenger',
          email: '${unverifiedEmail}',
          is_verified: false
        }));
      `);

      // Reload profile page on cuenta tab
      await browser!.navigate(`${appServer!.baseUrl}/perfil/?tab=cuenta`);
      await new Promise((r) => setTimeout(r, 1200));

      // Verify unverified UI banner is rendered
      const unverifiedUI = await evalJson<{
        hasVerifyBanner: boolean;
        hasCodeInput: boolean;
        hasVerifyButton: boolean;
        hasResendButton: boolean;
        bannerText: string;
      }>(
        browser!,
        `(() => {
          const banner = document.querySelector('.pf-verify-banner');
          const codeInput = document.getElementById('pf-verify-code-input');
          const verifyBtn = document.querySelector('button[data-action="verify-code"]');
          const resendBtn = document.querySelector('button[data-action="resend-code"]');

          return {
            hasVerifyBanner: Boolean(banner),
            hasCodeInput: Boolean(codeInput),
            hasVerifyButton: Boolean(verifyBtn),
            hasResendButton: Boolean(resendBtn),
            bannerText: banner ? banner.textContent || '' : ''
          };
        })()`
      );

      assert.strictEqual(unverifiedUI.hasVerifyBanner, true, 'Unverified banner must be rendered');
      assert.strictEqual(unverifiedUI.hasCodeInput, true, 'Code input field must be present');
      assert.strictEqual(unverifiedUI.hasVerifyButton, true, 'Verify code button must be present');
      assert.strictEqual(unverifiedUI.hasResendButton, true, 'Resend code button must be present');
      assert.ok(
        unverifiedUI.bannerText.includes('Verificacion pendiente') || unverifiedUI.bannerText.includes('Confirma tu correo'),
        'Banner text must indicate pending verification'
      );

      // Step B: Trigger code resend action via UI button
      await browser!.evaluate(`
        {
          const resendBtn = document.querySelector('button[data-action="resend-code"]');
          if (resendBtn) resendBtn.click();
        }
      `);
      await new Promise((r) => setTimeout(r, 1200));

      // Verify toast message feedback confirms resend
      const toastText = await browser!.evaluate<string>(`
        document.getElementById('pf-toast')?.textContent || ''
      `);
      assert.ok(
        toastText.includes('codigo') || toastText.includes('correo'),
        `Toast feedback must confirm code resend (got: "${toastText}")`
      );

      // Step C: Request active verification code and submit it via UI form to verify account
      const resendApiRes = await fetch(`${appServer!.baseUrl}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail })
      });
      const resendApiData = await resendApiRes.json();
      assert.strictEqual(resendApiRes.status, 200, 'API resend code must return 200');
      const validCode = String(resendApiData.verificationCode);
      assert.ok(validCode && validCode.length === 6, 'Verification code must be 6 digits');

      // Enter the code into #pf-verify-code-input and click data-action="verify-code"
      await browser!.evaluate(`
        (() => {
          const input = document.getElementById('pf-verify-code-input');
          if (input) {
            input.value = '${validCode}';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const verifyBtn = document.querySelector('button[data-action="verify-code"]');
          if (verifyBtn) verifyBtn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1500));

      // Verify UI automatically transitioned to verified state
      const verifiedUI = await evalJson<{
        hasCodeInput: boolean;
        hasResendButton: boolean;
        bannerText: string;
      }>(
        browser!,
        `(() => {
          const banner = document.querySelector('.pf-verify-banner');
          const codeInput = document.getElementById('pf-verify-code-input');
          const resendBtn = document.querySelector('button[data-action="resend-code"]');

          return {
            hasCodeInput: Boolean(codeInput),
            hasResendButton: Boolean(resendBtn),
            bannerText: banner ? banner.textContent || '' : ''
          };
        })()`
      );

      assert.strictEqual(verifiedUI.hasCodeInput, false, 'Verified user must NOT see verification code input');
      assert.strictEqual(verifiedUI.hasResendButton, false, 'Verified user must NOT see resend code button');
      assert.ok(
        verifiedUI.bannerText.includes('Correo verificado'),
        `Verified user banner must display Correo verificado (got: "${verifiedUI.bannerText}")`
      );
    });

  } finally {
    if (browser) await browser.close();
    if (appServer) await appServer.stop();
  }
});
