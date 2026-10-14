export function initHeroSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto w-full min-h-[100dvh] px-5 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-start pointer-events-none pb-12 md:pb-0 pt-28 md:pt-0">
      <span class="product-orbit product-orbit--hero" aria-hidden="true"></span>
      <div class="w-full md:w-1/2 flex flex-col gap-4 md:gap-6 z-10 pointer-events-auto mb-auto md:mb-0">
        <div class="inline-flex items-center gap-2.5 rounded-full border border-brand-2/30 bg-brand-2/10 px-3.5 py-1.5 backdrop-blur-md self-start text-[0.68rem] sm:text-xs font-semibold uppercase tracking-[0.2em] text-brand-2 shadow-[0_0_20px_rgba(242,166,90,0.15)]">
          <span class="h-2 w-2 rounded-full bg-brand-2"></span>
          Foodlink &mdash; Propuesta Gastron&oacute;mica
        </div>

        <h1 class="font-display font-bold text-[3rem] sm:text-6xl md:text-7xl lg:text-8xl leading-[0.88] tracking-tight uppercase text-brand-1">
          Comida<br />
          <span class="text-transparent relative" style="-webkit-text-stroke: 1.5px #F2A65A;">
            Que Entra
          </span><br />
          Por Los Ojos
        </h1>
        
        <p class="font-body text-base md:text-lg text-brand-1/80 w-full max-w-sm md:max-w-md font-light leading-relaxed text-balance">
          Una plataforma pensada para conectar comensales con cocinas artesanales de barrio. Buscamos visibilizar el origen de cada plato, ofrecer precios claros y crear un canal directo para aprovechar excedentes del d&iacute;a antes de que se desperdicien.
        </p>

        <div class="flex flex-wrap items-center gap-3 md:gap-4 mt-2">
          <a href="#features-root" class="minimal-btn inline-flex items-center justify-center bg-brand-2 !text-[#181512] font-semibold border-brand-2 hover:bg-brand-1 hover:border-brand-1 shadow-[0_4px_24px_rgba(242,166,90,0.35)]">
            Explorar propuesta &rarr;
          </a>
          <a href="#footer-root" class="minimal-btn-outline inline-flex items-center justify-center text-brand-1 border-brand-1/40 hover:border-brand-1 hover:bg-brand-1/10">
            Pilares del modelo
          </a>
        </div>
      </div>
    </div>
  `;
}
