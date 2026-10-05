export function initFooterSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto flex min-h-[72vh] w-full flex-col items-center justify-center px-8 py-20 text-brand-1">
      <p class="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-2">Un buen cierre</p>
      <h2 class="mb-8 text-center font-display text-3xl font-bold uppercase md:text-5xl">
        ¿Listo para probar?
      </h2>
      <a href="#menu-root" class="minimal-btn inline-flex items-center justify-center gap-3 bg-brand-3 px-8 py-4 text-lg text-white hover:bg-brand-4">
        Explora el menú <span aria-hidden="true">↗</span>
      </a>

      <p class="mt-20 select-none font-display text-[clamp(3rem,12vw,10rem)] font-black leading-none tracking-[-0.08em] text-brand-1/[0.045]" aria-hidden="true">
        BUEN PROVECHO
      </p>
    </div>
  `;
}
