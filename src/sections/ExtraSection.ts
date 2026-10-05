export function initExtraSection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[90vh] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-20">
      <div class="menu-product-stage order-1 lg:order-1 relative flex min-h-[260px] items-end justify-start pointer-events-none lg:min-h-[520px]">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex flex-col items-center justify-center text-center font-display font-black text-[clamp(3.5rem,11vw,8.5rem)] leading-[0.82] tracking-tight text-brand-1/[0.08] select-none" aria-hidden="true">
          <span>CUP</span>
          <span>CAKE</span>
        </span>
      </div>

      <div class="order-2 lg:order-2 flex flex-col gap-6 z-20 pointer-events-auto text-brand-1">
        <div class="self-start rounded-full border border-brand-3/30 bg-brand-3/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-3">
          Postre Especial
        </div>

        <h2 class="font-display font-bold text-5xl md:text-7xl leading-none uppercase">
          Extra<br>
          <span class="text-transparent text-stroke" style="-webkit-text-stroke-color: #FBE5C8;">Chocolate</span>
        </h2>

        <p class="font-body text-brand-1/80 text-lg leading-relaxed max-w-md">
          Magia pura en forma de cupcake. Chocolate extra oscuro y malvavisco tostado que se derrite en cada mordida.
        </p>

        <div class="mt-1 flex flex-wrap gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-1/70">
          <span class="rounded-full border border-brand-1/15 px-3 py-2">Doble Cacao</span>
          <span class="rounded-full border border-brand-1/15 px-3 py-2">Malvavisco tostado</span>
        </div>

        <div class="mt-2">
          <button id="add-extra-btn" type="button" class="minimal-btn border-brand-3 bg-brand-3 text-white hover:border-brand-4 hover:bg-brand-4">
            Añadir al pedido <span aria-hidden="true">·</span> $6.50
          </button>
          <p id="extra-feedback" class="hidden mt-4 text-sm text-brand-1/80" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;

  const addButton = container.querySelector<HTMLButtonElement>('#add-extra-btn');
  const feedback = container.querySelector<HTMLElement>('#extra-feedback');
  let quantity = 0;

  addButton?.addEventListener('click', () => {
    quantity += 1;
    if (!feedback) return;

    const total = (quantity * 6.5).toFixed(2);
    feedback.textContent = `${quantity} ${quantity === 1 ? 'cupcake añadido' : 'cupcakes añadidos'} · $${total}.`;
    feedback.classList.remove('hidden');
  });
}
