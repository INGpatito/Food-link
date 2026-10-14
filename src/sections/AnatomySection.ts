import { SceneManager } from '../three/SceneManager';

export function initAnatomySection(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div class="container mx-auto px-6 md:px-8 w-full min-h-[120dvh] flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-center justify-start pointer-events-none pb-16 lg:pb-0 pt-28 lg:pt-0">
      
      <!-- Text & Traceability Details (Left) -->
      <div class="w-full lg:w-1/2 flex flex-col gap-4 md:gap-6 z-10 pointer-events-auto text-brand-1 mb-auto lg:mb-0">
        
        <div class="uppercase tracking-widest text-brand-2 text-sm font-bold border-b border-brand-2/30 pb-2 mb-2 flex items-center justify-between">
          <span>Capítulo VI &mdash; Trazabilidad Abierta</span>
          <span class="text-[0.68rem] font-medium text-brand-1/60 tracking-normal">Desglose físico por capas</span>
        </div>

        <h2 class="font-display font-bold text-4xl md:text-6xl leading-none uppercase text-brand-1">
          Anatomía<br>
          <span class="text-brand-2 font-light italic lowercase text-stroke">del plato</span>
        </h2>
        
        <p class="font-body text-brand-1/80 text-base md:text-lg leading-relaxed mt-2 md:mt-3">
          Al desplazar la página, cada elemento del plato se despieza en el espacio tridimensional para revelar el origen transparente de cada materia prima. En Foodlink cada ingrediente tiene rostro, procedencia y un propósito de residuo cero.
        </p>

        <!-- Dynamic Layer Breakdown List -->
        <ul id="anatomy-layers-list" class="flex flex-col gap-3 mt-3 md:mt-5 font-body text-sm text-brand-1">
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2 transition-colors duration-300 group" data-layer-idx="5">
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs text-brand-2/70">06</span>
              <span class="font-medium text-brand-1 text-base group-hover:text-brand-2 transition-colors">Pan Brioche Corona</span>
            </div>
            <span class="text-xs uppercase tracking-widest text-brand-2/80">Glaseado y sésamo tostado</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2 transition-colors duration-300 group" data-layer-idx="4">
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs text-brand-2/70">05</span>
              <span class="font-medium text-brand-1 text-base group-hover:text-brand-2 transition-colors">Hojas de Huerta</span>
            </div>
            <span class="text-xs uppercase tracking-widest text-brand-5/90">Brotes de recolección matutina</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2 transition-colors duration-300 group" data-layer-idx="3">
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs text-brand-2/70">04</span>
              <span class="font-medium text-brand-1 text-base group-hover:text-brand-2 transition-colors">Tomate de Huerta</span>
            </div>
            <span class="text-xs uppercase tracking-widest text-brand-4/90">Corte maduro sin cámara de frío</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2 transition-colors duration-300 group" data-layer-idx="2">
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs text-brand-2/70">03</span>
              <span class="font-medium text-brand-1 text-base group-hover:text-brand-2 transition-colors">Queso Fundido</span>
            </div>
            <span class="text-xs uppercase tracking-widest text-brand-3/90">Elaboración de ganadería local</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2 transition-colors duration-300 group" data-layer-idx="1">
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs text-brand-2/70">02</span>
              <span class="font-medium text-brand-1 text-base group-hover:text-brand-2 transition-colors">Medallón Angus</span>
            </div>
            <span class="text-xs uppercase tracking-widest text-brand-2/90">Vacuno de pasto y circuito corto</span>
          </li>
          <li class="flex justify-between items-center border-b border-brand-1/15 pb-2 transition-colors duration-300 group" data-layer-idx="0">
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs text-brand-2/70">01</span>
              <span class="font-medium text-brand-1 text-base group-hover:text-brand-2 transition-colors">Pan Brioche Base</span>
            </div>
            <span class="text-xs uppercase tracking-widest text-brand-2/80">Masa madre de fermentación lenta</span>
          </li>
        </ul>

        <!-- Controls & Scroll Indication -->
        <div class="flex flex-wrap items-center gap-4 mt-4 pt-2">
          <button
            id="anatomy-toggle-btn"
            type="button"
            class="minimal-btn border-brand-2 bg-brand-2/10 text-brand-1 font-semibold hover:bg-brand-2 hover:text-charcoal transition-all text-sm py-2.5 px-5"
          >
            Despiezar modelo &rarr;
          </button>
          
          <div class="flex items-center gap-2 text-xs font-mono text-brand-1/70 uppercase tracking-wider">
            <span class="inline-block w-2 h-2 rounded-full bg-brand-2/60 animate-pulse"></span>
            <span id="anatomy-status-label">0% separación</span>
          </div>
        </div>

        <div class="flex items-center gap-3 text-xs text-brand-1/50 uppercase tracking-widest mt-1">
          <span class="inline-block w-6 h-[1px] bg-brand-2/30"></span>
          <span>Desplaza el scroll para inspeccionar cada capa</span>
        </div>

      </div>

      <!-- 3D Stage Space (Right) -->
      <div class="menu-product-stage hidden lg:flex relative min-h-[520px] w-full lg:w-1/2 items-end justify-end pointer-events-none">
        <span class="product-orbit" aria-hidden="true"></span>
        <span class="absolute inset-0 flex flex-col items-center justify-center font-display font-black text-[clamp(3.5rem,10vw,8rem)] leading-[0.82] text-brand-1/[0.04] select-none pointer-events-none" aria-hidden="true">
          <span>ANAT</span>
          <span>OMÍA</span>
        </span>
      </div>

    </div>
  `;

  // Dynamic UI update from scroll explosion
  const statusLabel = container.querySelector<HTMLElement>('#anatomy-status-label');
  const toggleBtn = container.querySelector<HTMLButtonElement>('#anatomy-toggle-btn');
  const layerItems = container.querySelectorAll<HTMLElement>('#anatomy-layers-list li');

  let currentProgress = 0;
  let isToggledExploded = false;
  let activeAnimationId: number | null = null;

  const cancelActiveAnimation = () => {
    if (activeAnimationId !== null) {
      cancelAnimationFrame(activeAnimationId);
      activeAnimationId = null;
    }
  };

  const updateUIForProgress = (progress: number) => {
    currentProgress = progress;
    const pct = Math.round(progress * 100);
    if (statusLabel) {
      statusLabel.textContent = `${pct}% separación`;
    }

    if (toggleBtn) {
      toggleBtn.textContent = progress > 0.5 ? 'Unir capas \u2190' : 'Despiezar modelo \u2192';
    }

    // Highlight layers matching the progress threshold
    const activeIdx = Math.min(5, Math.floor(progress * 6));
    layerItems.forEach((li) => {
      const idx = parseInt(li.dataset.layerIdx || '0', 10);
      if (idx === activeIdx && progress > 0.05) {
        li.classList.add('border-brand-2', 'bg-brand-2/5');
        li.classList.remove('border-brand-1/15');
      } else {
        li.classList.remove('border-brand-2', 'bg-brand-2/5');
        li.classList.add('border-brand-1/15');
      }
    });
  };

  layerItems.forEach((li) => {
    li.classList.add('cursor-pointer');
    li.addEventListener('click', () => {
      const sceneManager = (window as any).sceneManager as SceneManager | undefined;
      if (!sceneManager) return;

      cancelActiveAnimation();
      const idx = parseInt(li.dataset.layerIdx || '0', 10);
      const targetProgress = Math.min(1, Math.max(0.1, (idx + 0.8) / 6));

      const startVal = currentProgress;
      const duration = 600;
      const startTime = performance.now();

      const animateStep = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = startVal + (targetProgress - startVal) * eased;
        sceneManager.setExplosionProgress(val);
        updateUIForProgress(val);

        if (t < 1) {
          activeAnimationId = requestAnimationFrame(animateStep);
        } else {
          activeAnimationId = null;
        }
      };

      activeAnimationId = requestAnimationFrame(animateStep);
    });
  });

  // Clean up any previously attached listener to avoid handler proliferation during HMR
  const prevHandler = (window as any).__anatomyExplosionHandler;
  if (prevHandler) {
    document.removeEventListener('foodlink:explosionupdate', prevHandler);
  }
  const onExplosionUpdate = ((event: CustomEvent<{ progress: number }>) => {
    cancelActiveAnimation();
    updateUIForProgress(event.detail.progress);
  }) as EventListener;
  (window as any).__anatomyExplosionHandler = onExplosionUpdate;
  document.addEventListener('foodlink:explosionupdate', onExplosionUpdate);

  toggleBtn?.addEventListener('click', () => {
    const sceneManager = (window as any).sceneManager as SceneManager | undefined;
    if (!sceneManager) return;

    cancelActiveAnimation();
    const target = currentProgress > 0.5 ? 0 : 1;
    isToggledExploded = target === 1;
    
    // Smooth transition
    const startVal = currentProgress;
    const duration = 800;
    const startTime = performance.now();

    const animateStep = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const val = startVal + (target - startVal) * eased;
      sceneManager.setExplosionProgress(val);
      updateUIForProgress(val);

      if (t < 1) {
        activeAnimationId = requestAnimationFrame(animateStep);
      } else {
        activeAnimationId = null;
      }
    };

    activeAnimationId = requestAnimationFrame(animateStep);
  });
}
