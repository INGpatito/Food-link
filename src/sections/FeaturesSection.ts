export function initFeaturesSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[100dvh] flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-center justify-start pointer-events-none pb-12 lg:pb-0 pt-28 lg:pt-0">
      
      <div class="menu-product-stage hidden lg:flex relative min-h-[520px] w-full lg:w-1/2 items-end justify-start pointer-events-none">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(4rem,12vw,10rem)] leading-none text-brand-1/[0.08] select-none" aria-hidden="true">PIZZA</span>
      </div>

      <div class="w-full lg:w-1/2 flex flex-col gap-4 md:gap-6 z-10 pointer-events-auto text-brand-1 mb-auto lg:mb-0">
        
        <div class="uppercase tracking-widest text-brand-2 text-sm font-bold border-b border-brand-2/30 pb-2 mb-4 flex items-center justify-between">
          <span>Capítulo II &mdash; El Horno y la Masa Madre</span>
          <span class="text-[0.68rem] font-normal text-brand-1/60 tracking-normal">Modelo para pizzerías de autor</span>
        </div>

        <h2 class="font-display font-bold text-4xl md:text-6xl leading-none uppercase">
          Masa Madre,<br>
          <span class="text-brand-2 font-light italic lowercase text-stroke">fuego directo</span>
        </h2>
        
        <p class="font-body text-brand-1/80 text-base md:text-lg leading-relaxed mt-2 md:mt-4">
          La idea para las pizzerías artesanales: dar a conocer sus fermentaciones lentas y el origen de sus harinas. Al final de cada turno, los locales podrán habilitar reservas de excedentes a precio preferencial para evitar mermas.
        </p>

        <ul class="flex flex-col gap-3.5 md:gap-5 mt-5 md:mt-7 font-body text-sm">
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2.5">
            <span class="font-medium text-brand-1 text-base">Margarita de Masa Madre</span>
            <span class="text-xs uppercase tracking-widest text-brand-2">Fermentación 48h · Lote de cierre</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2.5">
            <span class="font-medium text-brand-1 text-base">Doble Pepperoni Artesanal</span>
            <span class="text-xs uppercase tracking-widest text-brand-1/60">Productor local · Hornada diaria</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2.5">
            <span class="font-medium text-brand-1 text-base">Trufa &amp; Setas de Temporada</span>
            <span class="text-xs uppercase tracking-widest text-brand-1/60">Recolección estacional</span>
          </li>
        </ul>

      </div>

    </div>
  `;
}
