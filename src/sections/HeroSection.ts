export function initHeroSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto w-full h-full px-5 sm:px-8 flex items-center justify-start pointer-events-none">
      <div class="w-full md:w-1/2 flex flex-col gap-5 md:gap-8 z-10 pointer-events-auto">
        <div class="mb-[-1rem] flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-brand-4">
          <span class="h-2 w-2 rounded-full bg-brand-4 shadow-[0_0_14px_rgba(199,69,42,0.55)]"></span>
          Hamburguesas · pizza · postres
        </div>
        <h1 class="font-display font-bold text-[2.5rem] sm:text-5xl md:text-7xl leading-[0.9] tracking-tight uppercase text-charcoal">
          Comida<br />
          <span class="text-brand-4 text-stroke relative">
            Que Entra
          </span><br />
          Por Los Ojos
        </h1>
        
        <p class="font-body text-base md:text-xl text-charcoal/80 max-w-md font-medium leading-relaxed">
          Hamburguesas, pizza y postres hechos para antojarse antes del primer bocado. Ingredientes reales, fuego y pasión.
        </p>

        <div class="flex flex-wrap gap-3 md:gap-4 mt-1 md:mt-4">
          <a href="#menu-root" class="minimal-btn inline-flex items-center justify-center bg-brand-4 text-white border-brand-4 hover:bg-brand-3 hover:border-brand-3">
            Ver menú
          </a>
          <a href="#features-root" class="minimal-btn-outline inline-flex items-center justify-center text-charcoal border-charcoal hover:bg-charcoal hover:text-brand-1">
            Conoce la cocina
          </a>
        </div>
      </div>

      <!-- Floating floating data clusters -->
      <div class="absolute right-10 bottom-20 flex flex-col gap-2 pointer-events-auto text-charcoal font-body text-sm font-bold tracking-wider hidden md:flex">
        <div class="editorial-block border-brand-4">
          <span class="block text-brand-4 mb-1 uppercase text-xs">The Classic</span>
          <span class="text-xl">100% Angus</span>
        </div>
      </div>
      <div class="absolute right-32 top-32 flex flex-col gap-2 pointer-events-auto text-charcoal font-body text-sm font-bold tracking-wider hidden md:flex">
         <div class="editorial-block border-brand-2">
          <span class="block text-brand-3 mb-1 uppercase text-xs">Cocción</span>
          <span class="text-xl">Carbón & Leña</span>
        </div>
      </div>
    </div>
  `;
}
