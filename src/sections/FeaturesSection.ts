export function initFeaturesSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[90vh] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-20">
      
      <div class="menu-product-stage order-1 lg:order-1 relative flex min-h-[260px] items-end justify-start pointer-events-none lg:min-h-[520px]">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(4rem,12vw,10rem)] leading-none text-brand-1/[0.08] select-none" aria-hidden="true">PIZZA</span>
      </div>

      <div class="order-2 lg:order-2 flex flex-col gap-4 md:gap-6 z-10 pointer-events-auto text-brand-1">
        
        <div class="uppercase tracking-widest text-brand-2 text-sm font-bold border-b border-brand-2/30 pb-2 mb-4">
          Capítulo II &mdash; El Horno
        </div>

        <h2 class="font-display font-bold text-4xl md:text-6xl leading-none uppercase">
          Masa Madre,<br>
          <span class="text-brand-2 font-light italic lowercase text-stroke">Fuego Directo</span>
        </h2>
        
        <p class="font-body text-brand-1/80 text-base md:text-lg leading-relaxed mt-2 md:mt-4">
          Fermentación lenta de 72 horas. Queso fior di latte fresco y tomates San Marzano. 
          No es solo pizza, es arquitectura en cada rebanada.
        </p>

        <ul class="flex flex-col gap-3 md:gap-4 mt-5 md:mt-8 font-body text-sm">
          <li class="flex justify-between items-center border-b border-brand-1/20 pb-2">
            <span class="font-bold">Margarita Clásica</span>
            <span class="text-brand-2">$12.00</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/20 pb-2">
            <span class="font-bold">Doble Pepperoni Picante</span>
            <span class="text-brand-2">$14.50</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/20 pb-2">
            <span class="font-bold">Trufa & Champiñones</span>
            <span class="text-brand-2">$16.00</span>
          </li>
        </ul>

      </div>

    </div>
  `;
}
