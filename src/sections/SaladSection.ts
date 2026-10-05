export function initSaladSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[90vh] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-20">
      
      <div class="order-2 lg:order-1 flex flex-col gap-4 md:gap-6 z-10 pointer-events-auto text-charcoal">
        
        <div class="self-start uppercase tracking-widest text-brand-5 text-sm font-bold border-b border-brand-5/30 pb-2 mb-4">
          Capítulo III &mdash; Lo Fresco
        </div>

        <h2 class="font-display font-bold text-4xl md:text-6xl leading-none uppercase text-charcoal">
          Ensalada<br>
          <span class="text-brand-5 font-light italic lowercase text-stroke">italiana</span>
        </h2>
        
        <p class="font-body text-charcoal/80 text-base md:text-lg leading-relaxed mt-2 md:mt-4">
          Hojas crujientes, aderezo artesanal y un balance perfecto de acidez y frescura para complementar tu comida.
        </p>

        <ul class="flex flex-col gap-3 md:gap-4 mt-5 md:mt-8 font-body text-sm text-charcoal">
          <li class="flex justify-between items-center border-b border-charcoal/20 pb-2">
            <span class="font-bold">Fresca Romana</span>
            <span class="text-brand-5 font-bold">$8.00</span>
          </li>
          <li class="flex justify-between items-center border-b border-charcoal/20 pb-2">
            <span class="font-bold">Caprese Especial</span>
            <span class="text-brand-5 font-bold">$10.50</span>
          </li>
        </ul>

      </div>

      <div class="menu-product-stage order-1 lg:order-2 relative flex min-h-[260px] items-end justify-end pointer-events-none lg:min-h-[520px]">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(4rem,12vw,10rem)] leading-none text-brand-5/[0.12] select-none" aria-hidden="true">SALAD</span>
      </div>

    </div>
  `;
}
