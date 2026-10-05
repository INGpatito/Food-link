import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SceneManager } from '../three/SceneManager';
import { SECTION_THEMES } from '../utils/constants';

gsap.registerPlugin(ScrollTrigger);

export type PageSection = 'hero' | 'features' | 'salad' | 'menu' | 'extra' | 'footer';

export class ScrollAnimations {
  private lenis!: Lenis;
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  public init() {
    this.initLenis();
    this.initGSAP();
    this.initNavLinks();

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      this.syncSectionToViewport();
    });
  }

  public activateSection(section: PageSection, direction: -1 | 0 | 1 = 1) {
    this.sceneManager.setActiveModel(section, direction);
    document.body.setAttribute('data-section', section);
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

    this.lenis.on('scroll', () => {
      ScrollTrigger.update();
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
          gsap.to('body', {
            ...SECTION_THEMES[sectionKey],
            duration: 0.7,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }

        this.lenis.scrollTo(targetEl, {
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
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
