import { spawn } from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";
import { launchFirefoxBiDi } from "./helpers/firefoxHelper.ts";
import { getFreePort } from "./helpers/serverHelper.ts";

async function verifyMobileAboveFold() {
  console.log("Verifying mobile 390x844 sticky navigation and above-the-fold content...");
  const port = await getFreePort();
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const baseUrl = `http://127.0.0.1:${port}`;

  const proc = spawn("npx", ["vite", "--port", String(port), "--host", "127.0.0.1"], {
    cwd: projectRoot,
    stdio: "pipe",
    env: { ...process.env, VITE_PORT: String(port) }
  });

  const stop = () => new Promise(r => {
    proc.kill("SIGTERM");
    setTimeout(r, 600);
  });

  try {
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${baseUrl}/perfil/`);
        if (res.status === 200) break;
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    const browser = await launchFirefoxBiDi({ width: 390, height: 844 });
    try {
      await browser.navigate(`${baseUrl}/perfil/`);

      // Set user session in localStorage
      await browser.evaluate(`
        localStorage.setItem("foodlink_user", JSON.stringify({
          id: 555,
          name: "Mobile Comensal",
          email: "mobile@foodlink.local",
          is_verified: true
        }));
      `);

      await browser.navigate(`${baseUrl}/perfil/`);
      await new Promise(r => setTimeout(r, 1200));

      // Check inner width & height
      const jsonMetrics = await browser.evaluate(`
        JSON.stringify({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, scrollWidth: document.documentElement.scrollWidth })
      `);
      const { innerWidth, innerHeight, scrollWidth } = JSON.parse(jsonMetrics);
      console.log(`Mobile Viewport: ${innerWidth}x${innerHeight}, ScrollWidth: ${scrollWidth}`);
      assert.strictEqual(innerWidth, 390);
      assert.strictEqual(innerHeight, 844);
      assert.ok(scrollWidth <= 392, `Expected scrollWidth <= 392, got ${scrollWidth}`);

      // Check position and bounding rect of nav and main
      for (const tab of ["pedidos", "impacto", "favoritos", "negocio", "cuenta"]) {
        await browser.evaluate(`
          const btn = document.querySelector('button[data-tab="${tab}"]');
          if (btn) btn.click();
        `);
        await new Promise(r => setTimeout(r, 300));

        const mainRectJson = await browser.evaluate(`
          JSON.stringify((() => {
            const el = document.getElementById("pf-main");
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, height: r.height };
          })())
        `);
        const mainRect = JSON.parse(mainRectJson);
        console.log(`Tab ${tab} mainRect.top: ${mainRect?.top}px`);
        assert.ok(mainRect !== null, `Main rect exists for tab ${tab}`);
        assert.ok(mainRect.top < 250, `Main content for tab ${tab} must start above 250px (got ${mainRect.top}px)`);
      }

      console.log("Mobile above-the-fold verification PASSED!");
    } finally {
      await browser.close();
    }
  } finally {
    await stop();
  }
}

verifyMobileAboveFold().catch(err => {
  console.error("Mobile verification failed:", err);
  process.exit(1);
});
