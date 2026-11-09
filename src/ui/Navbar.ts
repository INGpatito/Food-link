import { getStoredUser, onAuthChange } from '../utils/auth.ts';

/**
 * Fixed top navigation header and brand identity component.
 * High-end culinary luxury aesthetic with glassmorphism.
 * Zero emojis strictly enforced.
 */
export interface NavbarOptions {
    onStageSelect: (progress: number) => void;
    onOpenRegisterModal?: () => void;
    onOpenLoginModal?: () => void;
}

export class Navbar {
    private container: HTMLElement;
    private options: NavbarOptions;
    private stageButtons: HTMLButtonElement[] = [];
    private mobileStageButtons: HTMLButtonElement[] = [];
    private isMobileMenuOpen: boolean = false;

    constructor(container: HTMLElement, options: NavbarOptions) {
        this.container = container;
        this.options = options;
        this.render();
    }

    public render(): void {
        this.container.className = 'nav-wrapper';
        this.container.innerHTML = `
            <div class="nav-container relative">
                <!-- Brand Identity Capsule -->
                <a href="#stage-1" id="nav-brand-link" class="nav-capsule nav-brand-capsule group" aria-label="Inicio Foodlink">
                    <div class="nav-brand-logo-ring">
                        <!-- Cloche Culinary Insignia SVG -->
                        <svg class="w-4 h-4 text-terracotta transition-transform duration-500 group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                            <path d="M12 4v2" stroke-linecap="round"/>
                            <path d="M4 18h16" stroke-linecap="round"/>
                            <path d="M5 18a7 7 0 0114 0" stroke-linecap="round"/>
                            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                            <circle cx="8" cy="9" r="0.8" fill="currentColor" opacity="0.6"/>
                            <circle cx="16" cy="9" r="0.8" fill="currentColor" opacity="0.6"/>
                        </svg>
                    </div>
                    <div class="flex flex-col">
                        <span class="nav-brand-title">FOODLINK<span class="nav-brand-dot">.</span></span>
                        <span class="nav-brand-tagline">COCINA DE PROXIMIDAD & CERO DESPERDICIO</span>
                    </div>
                </a>

                <!-- Center Stage Navigation Capsule (Desktop) -->
                <nav class="nav-capsule nav-stages-capsule hidden xl:flex" aria-label="Etapas de la experiencia">
                    <button type="button" data-nav-stage="0" class="nav-stage-item is-active">
                        <span class="nav-stage-num">01.</span>
                        <span class="nav-stage-name">PROPUESTA</span>
                    </button>
                    <button type="button" data-nav-stage="1" class="nav-stage-item">
                        <span class="nav-stage-num">02.</span>
                        <span class="nav-stage-name">OBRADORES & FONDAS</span>
                    </button>
                    <button type="button" data-nav-stage="2" class="nav-stage-item">
                        <span class="nav-stage-num">03.</span>
                        <span class="nav-stage-name">HUERTOS & CERCANIA</span>
                    </button>
                    <button type="button" data-nav-stage="3" class="nav-stage-item">
                        <span class="nav-stage-num">04.</span>
                        <span class="nav-stage-name">MANIFIESTO</span>
                    </button>
                </nav>

                <!-- Right Action Buttons -->
                <div class="nav-actions-group">
                    <!-- Explore Map Primary CTA (Solo visible con sesion iniciada) -->
                    <a href="/explorar/" id="nav-explore-btn" class="nav-btn-cta hidden" aria-label="Explorar mapa de comida cerca">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" />
                            <circle cx="12" cy="9.5" r="2.3" />
                        </svg>
                        <span>EXPLORAR MAPA</span>
                    </a>

                    <!-- Dedicated Profile / QR Orders Link (Solo visible con sesion iniciada) -->
                    <a href="/perfil/" id="nav-profile-btn" class="nav-btn-account hidden" aria-label="Mi Perfil, Pedidos QR e Impacto">
                        <svg class="w-3.5 h-3.5 text-[#F4A261]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2 2 0 0 0 0 3V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2 2 0 0 0 0-3V8Z" />
                        </svg>
                        <span>MI PERFIL</span>
                    </a>

                    <!-- Login / Account Button -->
                    <button type="button" id="open-login-btn" class="nav-btn-account" aria-label="Acceso de comensal">
                        <span id="nav-login-icon-container" class="flex items-center">
                            <svg class="w-3.5 h-3.5 text-[#E86A33]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </span>
                        <span id="nav-login-label">INGRESAR</span>
                    </button>
                    <!-- Mobile Menu Toggle Button (Visible on screens < 1280px) -->
                    <button type="button" id="nav-mobile-toggle-btn" class="nav-mobile-toggle" aria-label="Menu principal">
                        <svg id="nav-mobile-icon-bars" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <svg id="nav-mobile-icon-close" class="w-4 h-4 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Mobile Navigation Drawer -->
                <div id="nav-mobile-drawer" class="nav-mobile-drawer" aria-hidden="true">
                    <div class="flex flex-col gap-1.5 pb-2 border-b border-white/10">
                        <button type="button" data-nav-mobile-stage="0" class="nav-stage-item is-active justify-start w-full py-2.5">
                            <span class="nav-stage-num">01.</span>
                            <span class="nav-stage-name font-bold">PROPUESTA DE AUTOR</span>
                        </button>
                        <button type="button" data-nav-mobile-stage="1" class="nav-stage-item justify-start w-full py-2.5">
                            <span class="nav-stage-num">02.</span>
                            <span class="nav-stage-name font-bold">OBRADORES Y FONDAS</span>
                        </button>
                        <button type="button" data-nav-mobile-stage="2" class="nav-stage-item justify-start w-full py-2.5">
                            <span class="nav-stage-num">03.</span>
                            <span class="nav-stage-name font-bold">HUERTOS Y CERCANIA</span>
                        </button>
                        <button type="button" data-nav-mobile-stage="3" class="nav-stage-item justify-start w-full py-2.5">
                            <span class="nav-stage-num">04.</span>
                            <span class="nav-stage-name font-bold">MANIFIESTO Y OBJETIVOS</span>
                        </button>
                    </div>
                    <div class="flex flex-col gap-2 pt-2">
                        <a href="/explorar/" id="nav-mobile-explore-btn" class="nav-btn-cta justify-center w-full py-2.5 hidden">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" />
                                <circle cx="12" cy="9.5" r="2.3" />
                            </svg>
                            <span>EXPLORAR MAPA CERCA</span>
                        </a>
                        <a href="/perfil/" id="nav-mobile-profile-btn" class="nav-btn-account justify-center w-full py-2.5 hidden">
                            <span>MI PERFIL Y PEDIDOS QR</span>
                        </a>
                        <button type="button" id="nav-mobile-login-btn" class="nav-btn-account justify-center w-full py-2.5">
                            <span id="nav-mobile-login-label">INGRESAR A MI CUENTA</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind stage pill clicks
        const stageProgress = [0.0, 0.36, 0.68, 0.96];
        this.stageButtons = Array.from(this.container.querySelectorAll<HTMLButtonElement>('[data-nav-stage]'));
        this.stageButtons.forEach((btn) => {
            const idx = parseInt(btn.getAttribute('data-nav-stage') || '0', 10);
            btn.addEventListener('click', () => {
                this.options.onStageSelect(stageProgress[idx]);
            });
        });

        // Bind mobile stage pill clicks
        this.mobileStageButtons = Array.from(this.container.querySelectorAll<HTMLButtonElement>('[data-nav-mobile-stage]'));
        this.mobileStageButtons.forEach((btn) => {
            const idx = parseInt(btn.getAttribute('data-nav-mobile-stage') || '0', 10);
            btn.addEventListener('click', () => {
                this.options.onStageSelect(stageProgress[idx]);
                this.closeMobileMenu();
            });
        });

        // Brand link click
        const brandLink = this.container.querySelector<HTMLAnchorElement>('#nav-brand-link');
        brandLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.options.onStageSelect(0.0);
            this.closeMobileMenu();
        });

        // Login button click (Desktop)
        const loginBtn = this.container.querySelector<HTMLButtonElement>('#open-login-btn');
        loginBtn?.addEventListener('click', () => {
            if (this.options.onOpenLoginModal) {
                this.options.onOpenLoginModal();
            }
        });

        // Login button click (Mobile)
        const mobileLoginBtn = this.container.querySelector<HTMLButtonElement>('#nav-mobile-login-btn');
        mobileLoginBtn?.addEventListener('click', () => {
            this.closeMobileMenu();
            if (this.options.onOpenLoginModal) {
                this.options.onOpenLoginModal();
            } else {
                loginBtn?.click();
            }
        });

        // Mobile Menu Toggle
        const toggleBtn = this.container.querySelector<HTMLButtonElement>('#nav-mobile-toggle-btn');
        toggleBtn?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close mobile drawer when clicking outside
        document.addEventListener('click', (event) => {
            if (!this.isMobileMenuOpen) return;
            const target = event.target as Node | null;
            const drawer = this.container.querySelector('#nav-mobile-drawer');
            const toggle = this.container.querySelector('#nav-mobile-toggle-btn');
            if (drawer && toggle && !drawer.contains(target) && !toggle.contains(target)) {
                this.closeMobileMenu();
            }
        });

        // Dynamic Auth UI synchronization
        const updateAuthUI = (): void => {
            const user = getStoredUser();
            const loginLabel = this.container.querySelector<HTMLElement>('#nav-login-label');
            const mobileLoginLabel = this.container.querySelector<HTMLElement>('#nav-mobile-login-label');
            const iconContainer = this.container.querySelector<HTMLElement>('#nav-login-icon-container');
            const exploreBtn = this.container.querySelector<HTMLElement>('#nav-explore-btn');
            const profileBtn = this.container.querySelector<HTMLElement>('#nav-profile-btn');
            const mobileExploreBtn = this.container.querySelector<HTMLElement>('#nav-mobile-explore-btn');
            const mobileProfileBtn = this.container.querySelector<HTMLElement>('#nav-mobile-profile-btn');

            if (user) {
                const firstName = user.name.trim().split(' ')[0] || user.name;
                if (loginLabel) loginLabel.textContent = `MI CUENTA (${firstName})`;
                if (mobileLoginLabel) mobileLoginLabel.textContent = `MI CUENTA (${firstName})`;
                if (iconContainer) {
                    iconContainer.innerHTML = `<span class="nav-user-indicator mr-0.5"></span>`;
                }
                exploreBtn?.classList.remove('hidden');
                profileBtn?.classList.remove('hidden');
                mobileExploreBtn?.classList.remove('hidden');
                mobileProfileBtn?.classList.remove('hidden');
            } else {
                if (loginLabel) loginLabel.textContent = 'INGRESAR';
                if (mobileLoginLabel) mobileLoginLabel.textContent = 'INGRESAR A MI CUENTA';
                if (iconContainer) {
                    iconContainer.innerHTML = `
                        <svg class="w-3.5 h-3.5 text-[#E86A33]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    `;
                }
                exploreBtn?.classList.add('hidden');
                profileBtn?.classList.add('hidden');
                mobileExploreBtn?.classList.add('hidden');
                mobileProfileBtn?.classList.add('hidden');
            }
        };

        updateAuthUI();
        onAuthChange(() => updateAuthUI());
    }

    private toggleMobileMenu(): void {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    private openMobileMenu(): void {
        this.isMobileMenuOpen = true;
        const drawer = this.container.querySelector<HTMLElement>('#nav-mobile-drawer');
        const iconBars = this.container.querySelector<HTMLElement>('#nav-mobile-icon-bars');
        const iconClose = this.container.querySelector<HTMLElement>('#nav-mobile-icon-close');

        drawer?.classList.add('is-open');
        drawer?.setAttribute('aria-hidden', 'false');
        iconBars?.classList.add('hidden');
        iconClose?.classList.remove('hidden');
    }

    private closeMobileMenu(): void {
        this.isMobileMenuOpen = false;
        const drawer = this.container.querySelector<HTMLElement>('#nav-mobile-drawer');
        const iconBars = this.container.querySelector<HTMLElement>('#nav-mobile-icon-bars');
        const iconClose = this.container.querySelector<HTMLElement>('#nav-mobile-icon-close');

        drawer?.classList.remove('is-open');
        drawer?.setAttribute('aria-hidden', 'true');
        iconBars?.classList.remove('hidden');
        iconClose?.classList.add('hidden');
    }

    public setActiveStage(activeStage: number): void {
        this.stageButtons.forEach((btn, idx) => {
            if (idx === activeStage) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });
        this.mobileStageButtons.forEach((btn, idx) => {
            if (idx === activeStage) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });
    }
}
