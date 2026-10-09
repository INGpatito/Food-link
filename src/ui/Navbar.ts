import { getStoredUser, onAuthChange } from '../utils/auth';

export function initNavbar(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <nav class="site-nav-shell fixed top-0 left-0 z-50 w-full px-4 pt-4" aria-label="Navegación principal">
      <div class="site-nav container mx-auto flex items-center justify-between gap-4 rounded-full border px-5 py-3 md:px-7">
        <a href="#hero-root" class="font-display font-extrabold text-xl tracking-tight uppercase md:text-2xl" aria-label="Foodlink, ir al inicio">
          Foodlink<span class="text-brand-3">.</span>
        </a>
      
        <div class="hidden md:flex items-center gap-8 font-body font-medium text-sm tracking-wide">
          <a href="#hero-root" class="nav-link" data-nav-section="hero" aria-current="page">Inicio</a>
          <a href="#features-root" class="nav-link" data-nav-section="features">Origen</a>
          <a href="#salad-root" class="nav-link" data-nav-section="salad">Ensalada</a>
          <a href="#menu-root" class="nav-link" data-nav-section="menu">Especiales</a>
          <a href="#extra-root" class="nav-link" data-nav-section="extra">Extra</a>
        </div>

        <div class="flex items-center gap-4">
          <button id="open-login-btn" class="nav-link hidden border-b border-transparent pb-1 text-sm font-bold uppercase tracking-wide md:block">
            Ingresar
          </button>
          <button
            id="mobile-menu-btn"
            class="md:hidden flex flex-col gap-1.5 rounded-full p-2"
            type="button"
            aria-label="Abrir menú de navegación"
            aria-expanded="false"
            aria-controls="mobile-navigation"
          >
            <span class="h-0.5 w-6 bg-current"></span>
            <span class="h-0.5 w-6 bg-current"></span>
            <span class="h-0.5 w-4 self-end bg-current"></span>
          </button>
        </div>
      </div>

      <div id="mobile-navigation" class="site-mobile-nav absolute right-4 top-full mt-3 hidden w-[calc(100%-2rem)] max-w-sm rounded-3xl border p-6 shadow-2xl md:hidden">
        <div class="flex flex-col gap-5 font-body font-medium text-sm">
          <a href="#hero-root" class="nav-link">Inicio</a>
          <a href="#features-root" class="nav-link">Origen</a>
          <a href="#salad-root" class="nav-link">Ensalada</a>
          <a href="#menu-root" class="nav-link">Especiales</a>
          <a href="#extra-root" class="nav-link">Extra</a>
          <button id="open-login-mobile-btn" class="nav-link text-left font-bold uppercase tracking-wide" type="button">
            Ingresar
          </button>
        </div>
      </div>
    </nav>
  `;

  const menuButton = container.querySelector<HTMLButtonElement>('#mobile-menu-btn');
  const mobileNavigation = container.querySelector<HTMLElement>('#mobile-navigation');
  const desktopLoginBtn = container.querySelector<HTMLButtonElement>('#open-login-btn');
  const mobileLoginBtn = container.querySelector<HTMLButtonElement>('#open-login-mobile-btn');

  const updateAuthUI = () => {
    const user = getStoredUser();
    const label = user ? `Mi Cuenta (${user.name.split(' ')[0]})` : 'Ingresar';
    if (desktopLoginBtn) desktopLoginBtn.textContent = label;
    if (mobileLoginBtn) mobileLoginBtn.textContent = label;
  };

  updateAuthUI();
  onAuthChange(() => updateAuthUI());

  document.addEventListener('foodlink:sectionchange', ((event: CustomEvent<{ section: string }>) => {
    const activeSection = event.detail.section;
    container.querySelectorAll<HTMLAnchorElement>('[data-nav-section]').forEach((link) => {
      const isActive = link.dataset.navSection === activeSection;
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }) as EventListener);

  if (menuButton && mobileNavigation) {
    const closeMenu = () => {
      mobileNavigation.classList.add('hidden');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menú de navegación');
    };

    menuButton.addEventListener('click', () => {
      const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
      mobileNavigation.classList.toggle('hidden', isExpanded);
      menuButton.setAttribute('aria-expanded', String(!isExpanded));
      menuButton.setAttribute('aria-label', isExpanded ? 'Abrir menú de navegación' : 'Cerrar menú de navegación');
    });

    mobileNavigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    mobileLoginBtn?.addEventListener('click', closeMenu);

    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !container.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }
}
