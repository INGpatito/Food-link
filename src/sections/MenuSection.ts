export function initMenuSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[100dvh] flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-center justify-start pointer-events-none pb-12 lg:pb-0 pt-28 lg:pt-0">
      <div class="w-full lg:w-1/2 flex flex-col gap-6 z-20 pointer-events-auto text-white mb-auto lg:mb-0">
        <div class="self-start rounded-full border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-violet flex items-center gap-2">
          <span>Capítulo IV &mdash; Obrador Dulce</span>
          <span class="text-white/40">·</span>
          <span class="text-white/70 text-xs normal-case tracking-normal">Tiradas diarias de repostería</span>
        </div>

        <h2 class="font-display font-bold text-5xl md:text-7xl leading-none uppercase">
          Cake<br>
          <span class="text-brand-1 font-light italic lowercase text-stroke">festejo</span>
        </h2>

        <p class="font-body text-white/80 text-lg leading-relaxed max-w-md">
          La pastelería artesanal suele afrontar pérdidas elevadas por su corta vida útil. Foodlink permite a los obradores publicar sus elaboraciones no vendidas de la jornada para que los vecinos puedan reservarlas a precio justo antes del cierre.
        </p>

        <div class="mt-4">
          <button id="add-cake-btn" type="button" class="minimal-btn border-brand-1 bg-brand-1 !text-[#181512] font-semibold hover:border-brand-2 hover:bg-brand-2 shadow-[0_4px_24px_rgba(251,229,200,0.25)]">
            Probar dinámica de reserva &rarr;
          </button>
          <p id="order-feedback" class="hidden mt-4 text-sm text-brand-1/90" role="status" aria-live="polite"></p>
        </div>
      </div>

      <div class="menu-product-stage hidden lg:flex relative min-h-[520px] w-full lg:w-1/2 items-end justify-end pointer-events-none">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex items-center justify-center font-display font-black text-[clamp(5rem,15vw,13rem)] leading-none text-white/[0.08] select-none" aria-hidden="true">CAKE</span>
      </div>
    </div>
  `;

  const addButton = container.querySelector<HTMLButtonElement>('#add-cake-btn');
  const feedback = container.querySelector<HTMLElement>('#order-feedback');
  let counter = 0;

  addButton?.addEventListener('click', () => {
    counter += 1;
    if (!feedback) return;

    feedback.textContent = `Demostración (${counter}): En la aplicación, esta acción genera un pase de recogida en el obrador para aprovechar la porción restante del día, evitando que termine desechada.`;
    feedback.classList.remove('hidden');
  });
}
