export function initSaladSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[100dvh] flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-center justify-start pointer-events-none pb-12 lg:pb-0 pt-28 lg:pt-0">
      
      <div class="w-full lg:w-1/2 flex flex-col gap-4 md:gap-6 z-10 pointer-events-auto text-charcoal mb-auto lg:mb-0">
        
        <div class="uppercase tracking-widest text-[#2A5716] text-sm font-bold border-b border-[#2A5716]/30 pb-2 mb-4 flex items-center justify-between">
          <span>Capítulo III &mdash; Huertos de Proximidad</span>
          <span class="text-[0.68rem] font-medium text-charcoal/60 tracking-normal">Cosecha estacional y circuito corto</span>
        </div>

        <h2 class="font-display font-bold text-4xl md:text-6xl leading-none uppercase text-charcoal">
          Ensalada<br>
          <span class="text-charcoal font-light italic lowercase text-stroke">italiana</span>
        </h2>
        
        <p class="font-body text-charcoal/80 text-base md:text-lg leading-relaxed mt-2 md:mt-4">
          La propuesta para cocina vegetal: vincular a los restaurantes directamente con huertos y agricultores regionales. Al aprovechar la cosecha de temporada completa y las producciones del día, se evita el desperdicio en campo y se garantiza producto fresco en la mesa.
        </p>

        <ul class="flex flex-col gap-3.5 md:gap-5 mt-5 md:mt-7 font-body text-sm text-charcoal">
          <li class="flex justify-between items-center border-b border-charcoal/15 pb-2.5">
            <span class="font-medium text-charcoal text-base">Hojas Mixtas y Brotes de Huerto</span>
            <span class="text-xs uppercase tracking-widest text-[#2A5716]">Cosecha viva · Cultivo directo</span>
          </li>
          <li class="flex justify-between items-center border-b border-charcoal/15 pb-2.5">
            <span class="font-medium text-charcoal text-base">Caprese de Proximidad</span>
            <span class="text-xs uppercase tracking-widest text-[#2A5716]">Lote de rescate · Queso local</span>
          </li>
        </ul>

      </div>

      <div class="menu-product-stage hidden lg:flex relative min-h-[520px] w-full lg:w-1/2 items-end justify-end pointer-events-none">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(4rem,12vw,10rem)] leading-none text-brand-5/[0.12] select-none" aria-hidden="true">SALAD</span>
      </div>

    </div>
  `;
}
