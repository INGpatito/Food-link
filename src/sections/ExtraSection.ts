export function initExtraSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[100dvh] flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-center justify-start pointer-events-none pb-12 lg:pb-0 pt-28 lg:pt-0">
      <div class="menu-product-stage hidden lg:flex relative min-h-[520px] w-full lg:w-1/2 items-end justify-start pointer-events-none">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex flex-col items-center justify-center text-center font-display font-black text-[clamp(3.5rem,11vw,8.5rem)] leading-[0.82] tracking-tight text-brand-1/[0.08] select-none" aria-hidden="true">
          <span>CUP</span>
          <span>CAKE</span>
        </span>
      </div>

      <div class="w-full lg:w-1/2 flex flex-col gap-6 z-20 pointer-events-auto text-brand-1 mb-auto lg:mb-0">
        <div class="self-start rounded-full border border-brand-3/30 bg-brand-3/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-3 flex items-center gap-2">
          <span>Capítulo V &mdash; Proyectos de Autor</span>
          <span class="text-brand-1/40">·</span>
          <span class="text-brand-1/70 text-xs normal-case tracking-normal">Micro-obradores y especialidad</span>
        </div>

        <h2 class="font-display font-bold text-5xl md:text-7xl leading-none uppercase">
          Extra<br>
          <span class="text-brand-1 font-light italic lowercase text-stroke">chocolate</span>
        </h2>

        <p class="font-body text-brand-1/80 text-lg leading-relaxed max-w-md">
          Dar visibilidad a cafeterías de especialidad y obradores independientes que cuidan la procedencia de materias primas como el cacao. A través del consumo de proximidad, estos talleres pueden rentabilizar sus lotes del día sin incurrir en mermas.
        </p>

        <div class="mt-4">
          <button id="add-extra-btn" type="button" class="minimal-btn border-brand-3 bg-brand-3 text-white font-semibold hover:border-brand-4 hover:bg-brand-4 shadow-[0_4px_24px_rgba(232,106,51,0.3)]">
            Probar dinámica de apoyo &rarr;
          </button>
          <p id="extra-feedback" class="hidden mt-4 text-sm text-brand-1/90" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;

  const addButton = container.querySelector<HTMLButtonElement>('#add-extra-btn');
  const feedback = container.querySelector<HTMLElement>('#extra-feedback');
  let counter = 0;

  addButton?.addEventListener('click', () => {
    counter += 1;
    if (!feedback) return;

    feedback.textContent = `Demostración (${counter}): Con esta dinámica, el comensal accede a repostería artesanal a precio accesible y el pequeño taller recupera costes en su última franja horaria.`;
    feedback.classList.remove('hidden');
  });
}
