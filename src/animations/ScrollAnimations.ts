import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SceneManager } from '../three/SceneManager';
import { SECTION_THEMES } from '../utils/constants';

gsap.registerPlugin(ScrollTrigger);

export type PageSection = 'hero' | 'features' | 'salad' | 'menu' | 'extra' | 'footer';

// ── DNA Helix config por sección ──
const HELIX_SECTIONS: { id: string; side: 1 | -1 }[] = [
  { id: '#hero-root',     side: -1 },
  { id: '#features-root', side:  1 },
  { id: '#salad-root',    side: -1 },
  { id: '#menu-root',     side:  1 },
  { id: '#extra-root',    side: -1 },
  { id: '#footer-root',   side:  1 },
];

export class ScrollAnimations {
  private lenis!: Lenis;
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  public init() {
    this.initLenis();
    this.initGSAP();
    this.initHelixScroll();
    this.initNavLinks();

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      this.syncSectionToViewport();
    });
  }

  public activateSection(section: PageSection, direction: -1 | 0 | 1 = 1) {
    this.sceneManager.setActiveModel(section, direction);
    document.body.setAttribute('data-section', section);

    // Cinematic Text Reveal (Staggered)
    const el = document.getElementById(`${section}-root`);
    if (el) {
      const animatables = el.querySelectorAll('h1, h2, h3, p, ul, .minimal-btn');
      if (animatables.length > 0) {
        gsap.fromTo(animatables,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, stagger: 0.08, ease: 'power3.out', overwrite: 'auto' }
        );
      }
    }

    document.dispatchEvent(new CustomEvent('foodlink:sectionchange', { detail: { section } }));
  }

  private syncSectionToViewport() {
    const referencePoint = window.innerHeight * 0.5;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
    const visibleSection = sections.find((section) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= referencePoint && bounds.bottom > referencePoint;
    });

    const sectionId = visibleSection?.id.replace('-root', '') as PageSection | undefined;
    if (!sectionId || !['hero', 'features', 'salad', 'menu', 'extra', 'footer'].includes(sectionId)) return;

    this.activateSection(sectionId, 0);
  }

  private initLenis() {
    this.lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      infinite: false,
      syncTouch: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
    });

    this.lenis.on('scroll', (lenis) => {
      ScrollTrigger.update();

      // The navigation remains fixed to the viewport, with a tiny inertial drift
      // that makes it feel connected to Lenis rather than detached from the page.
      const navDrift = Math.max(-3, Math.min(3, lenis.velocity * -0.28));
      document.querySelector<HTMLElement>('.site-nav-shell')?.style.setProperty('--nav-drift', `${navDrift.toFixed(2)}px`);
    });

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  private initNavLinks() {
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const targetEl = document.querySelector<HTMLElement>(href);
        if (!targetEl) return;
        
        e.preventDefault();

        const sectionKey = href.replace('#', '').replace('-root', '') as PageSection;
        if (['hero', 'features', 'salad', 'menu', 'extra', 'footer'].includes(sectionKey)) {
          this.activateSection(sectionKey, 1);
        }

        this.lenis.scrollTo(targetEl, {
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      });
    });
  }

  // ────────────────────────────────────────────────────────
  //  DNA Helix Scroll
  //
  //  Cada sección describe media vuelta completa mientras atraviesa el viewport.
  //  Las secciones consecutivas invierten el giro, como las dos hebras de ADN.
  // ────────────────────────────────────────────────────────
  private initHelixScroll() {
    // Contenedor con perspectiva 3D para las rotaciones
    const main = document.querySelector<HTMLElement>('#app');
    if (main) {
      main.style.perspective = '1600px';
      main.style.perspectiveOrigin = '50% 50%';
    }

    HELIX_SECTIONS.forEach(({ id, side }) => {
      const el = document.querySelector<HTMLElement>(id);
      if (!el) return;

      el.style.transformStyle = 'preserve-3d';
      el.style.willChange = 'transform, opacity';

      // The hero starts centred. It just needs to sweep away as we scroll down.
      if (id === '#hero-root') {
        gsap.to(el, {
          x: -side * 300,
          scale: 0.7,
          opacity: 0,
          ease: 'sine.in',
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          }
        });
        return;
      }

      // Dinámica de doble hélice (Torsión de ADN)
      // En vez de un simple "entrar y salir", el texto orbita en 3D 
      // desde atrás hacia el frente y luego hacia atrás por el lado contrario.
      const helixTurn = gsap.timeline({
        defaults: { ease: 'sine.inOut' },
        scrollTrigger: {
          trigger: el,
          start: 'top bottom', // empieza cuando asoma por abajo
          end: 'bottom top',   // termina cuando sale por arriba
          scrub: true,
        }
      });

      helixTurn.fromTo(el,
        {
          x: side * 300,
          scale: 0.7,
          opacity: 0,
        },
        {
          x: 0,
          scale: 1,
          opacity: 1,
          duration: 0.45,
        }
      )
      .to(el, { duration: 0.1 }) // pausa en el centro para que sea legible
      .to(el, {
          x: -side * 300,
          scale: 0.7,
          opacity: 0,
          duration: 0.45,
      });
    });
  }

  private initGSAP() {
    // Initial state: Hero
    gsap.set('body', {
      ...SECTION_THEMES.hero
    });

    // ── Section Activation Triggers (50% midpoint threshold) ──
    ScrollTrigger.create({
      trigger: '#hero-root',
      start: 'top top',
      end: 'bottom 50%',
      onEnter: () => this.activateSection('hero', -1),
      onEnterBack: () => this.activateSection('hero', -1),
    });

    ScrollTrigger.create({
      trigger: '#features-root',
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => this.activateSection('features', 1),
      onEnterBack: () => this.activateSection('features', -1),
    });

    ScrollTrigger.create({
      trigger: '#salad-root',
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => this.activateSection('salad', 1),
      onEnterBack: () => this.activateSection('salad', -1),
    });

    ScrollTrigger.create({
      trigger: '#menu-root',
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => this.activateSection('menu', 1),
      onEnterBack: () => this.activateSection('menu', -1),
    });

    ScrollTrigger.create({
      trigger: '#extra-root',
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => this.activateSection('extra', 1),
      onEnterBack: () => this.activateSection('extra', -1),
    });

    ScrollTrigger.create({
      trigger: '#footer-root',
      start: 'top 50%',
      end: 'bottom bottom',
      onEnter: () => this.activateSection('footer', 1),
      onEnterBack: () => this.activateSection('footer', -1),
    });

    // ── Continuous Background & Ambient Glow Color Transitions on Scroll ──
    // 1. Hero -> Features (Pizza: dark stone oven)
    gsap.to('body', {
      ...SECTION_THEMES.features,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#features-root',
        start: 'top bottom',
        end: 'top 50%',
        scrub: 0.5,
      }
    });

    // 2. Features -> Salad (Italian Salad: fresh botanical green)
    gsap.to('body', {
      ...SECTION_THEMES.salad,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#salad-root',
        start: 'top bottom',
        end: 'top 50%',
        scrub: 0.5,
      }
    });

    // 3. Salad -> Menu (Cake: midnight plum & berry violet)
    gsap.to('body', {
      ...SECTION_THEMES.menu,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#menu-root',
        start: 'top bottom',
        end: 'top 50%',
        scrub: 0.5,
      }
    });

    // 4. Menu -> Extra (Cupcake: warm dark chocolate & caramel)
    gsap.to('body', {
      ...SECTION_THEMES.extra,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#extra-root',
        start: 'top bottom',
        end: 'top 50%',
        scrub: 0.5,
      }
    });

    // 5. Extra -> Footer (Dark charcoal brand)
    gsap.to('body', {
      ...SECTION_THEMES.footer,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#footer-root',
        start: 'top bottom',
        end: 'top 50%',
        scrub: 0.5,
      }
    });

    // Parallax elements
    gsap.utils.toArray('.editorial-block').forEach((el: any) => {
      gsap.to(el, {
        y: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }
}
