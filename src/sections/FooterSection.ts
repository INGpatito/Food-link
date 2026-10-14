export function initFooterSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto flex min-h-[72vh] w-full flex-col items-center justify-center px-8 py-20 text-brand-1 text-center">
      <span class="product-orbit product-orbit--footer" aria-hidden="true"></span>
      <p class="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-2">El Enfoque Foodlink</p>
      <h2 class="mb-4 font-display text-4xl font-bold uppercase md:text-6xl max-w-2xl leading-tight">
        Comida real.<br>
        <span class="text-brand-2 font-light italic lowercase text-stroke">cero desperdicio</span>
      </h2>
      <p class="mb-8 font-body text-base md:text-lg text-brand-1/75 max-w-xl font-light leading-relaxed">
        Una propuesta para transformar la relación entre comensales y obradores de proximidad: dar valor a la dedicación artesanal, visibilizar el origen de los alimentos y canalizar las preparaciones del día para evitar que terminen en el vertedero.
      </p>

      <div class="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl border-y border-white/10 py-6 text-left">
        <div>
          <span class="block text-sm font-display font-bold uppercase tracking-wider text-brand-2 mb-1">Trazabilidad</span>
          <p class="text-xs text-brand-1/70 font-light leading-relaxed">Conocer el origen de cada ingrediente y los métodos de elaboración artesanal.</p>
        </div>
        <div>
          <span class="block text-sm font-display font-bold uppercase tracking-wider text-brand-2 mb-1">Aprovechamiento</span>
          <p class="text-xs text-brand-1/70 font-light leading-relaxed">Canal para ofrecer excedentes del día a precio preferencial antes de que se descarten.</p>
        </div>
        <div>
          <span class="block text-sm font-display font-bold uppercase tracking-wider text-brand-2 mb-1">Comercio Cercano</span>
          <p class="text-xs text-brand-1/70 font-light leading-relaxed">Trato directo con pequeños obradores para asegurar su viabilidad económica.</p>
        </div>
      </div>

      <a href="#hero-root" class="minimal-btn bg-brand-3 text-white border-brand-3 hover:bg-brand-4 hover:border-brand-4 shadow-[0_4px_24px_rgba(232,106,51,0.35)]">
        Volver al inicio &uarr;
      </a>

      <p class="mt-8 text-[0.7rem] text-brand-1/40 tracking-wider">Foodlink es una propuesta conceptual en desarrollo. Las dinámicas mostradas son de carácter demostrativo.</p>

      <p class="mt-20 select-none font-display text-[clamp(2.5rem,10vw,8rem)] font-black leading-none tracking-[-0.05em] text-brand-1/[0.04]" aria-hidden="true">
        COCINA CON CARÁCTER
      </p>
    </div>
  `;
}
