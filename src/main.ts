import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { SceneManager } from './three/SceneManager.ts';
import { Navbar } from './ui/Navbar.ts';
import { OrbitalMorphLayer } from './ui/OrbitalMorphLayer.ts';
import { ScrollStory } from './ui/ScrollStory.ts';
import { StudioHUD } from './ui/StudioHUD.ts';
import { Modals } from './ui/Modals.ts';
import { initLoginModal } from './ui/LoginModal.ts';

gsap.registerPlugin(ScrollTrigger);

/**
 * Main application bootstrap wiring UI modules, 3D SceneManager,
 * smooth scrolling, and user interactions.
 * Zero emojis strictly enforced.
 */
function initApp(): void {
    const webglContainer = document.getElementById('webgl-container');
    const navbarRoot = document.getElementById('navbar-root');
    const orbitalMorphRoot = document.getElementById('orbital-morph-layer');
    const scrollRoot = document.getElementById('scroll-root');
    const hudRoot = document.getElementById('hud-root');
    const modalsRoot = document.getElementById('modals-root');
    const loginModalRoot = document.getElementById('login-modal-root');

    if (!webglContainer || !navbarRoot || !orbitalMorphRoot || !scrollRoot || !hudRoot || !modalsRoot) {
        console.error('Missing root mount points in index.html');
        return;
    }

    // 1. Initialize UI Modals (Kitchen registration & 3D Inspect)
    const modals = new Modals(modalsRoot);

    // 2. Initialize 3D Scene Manager
    const sceneManager = new SceneManager(webglContainer);

    // 3. Initialize Orbital Morph Layer
    const orbitalMorphLayer = new OrbitalMorphLayer(orbitalMorphRoot);
    sceneManager.morphController.setCardElements(orbitalMorphLayer.getCardElements());

    // 4. Scroll Helper & Global Actions
    const scrollToStage = (normalizedProgress: number): void => {
        if (sceneManager.inspectMode) {
            sceneManager.toggleInspect(false);
            studioHUD.setInspectModeUI(false);
        }
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: maxScroll * normalizedProgress, behavior: 'smooth' });
    };

    (window as any).scrollToStage = scrollToStage;
    (window as any).openJoinModal = (type = 'kitchen') => modals.open(type);
    (window as any).closeJoinModal = () => modals.close();
    (window as any).openLoginModal = () => {
        const btn = document.getElementById('open-login-btn');
        btn?.click();
    };

    // 5. Initialize Top Navbar
    const navbar = new Navbar(navbarRoot, {
        onStageSelect: (progress) => scrollToStage(progress),
        onOpenRegisterModal: () => modals.open('kitchen')
    });

    // 6. Initialize Authentication Login / Register / Account Modal
    if (loginModalRoot) {
        initLoginModal(loginModalRoot);
    }

    // 7. Initialize Scroll Story Sections
    new ScrollStory(scrollRoot, {
        onOpenRegisterModal: () => modals.open('kitchen'),
        onStageSelect: (progress) => scrollToStage(progress)
    });

    // 8. Initialize Studio HUD
    const studioHUD = new StudioHUD(hudRoot, {
        onRenderModeChange: (mode) => sceneManager.setRenderMode(mode),
        onLightingMoodChange: (mood) => sceneManager.setLightingMood(mood),
        onInspectToggle: () => sceneManager.toggleInspect(),
        onInspectDishSelect: (idx) => sceneManager.setInspectDish(idx),
        onExplodeChange: (val) => sceneManager.setManualExplode(val)
    });

    // Wire Telemetry from SceneManager to UI
    sceneManager.onTelemetryUpdate = (telemetry) => {
        studioHUD.updateHUD(telemetry);
        navbar.setActiveStage(telemetry.stageIndex);
        orbitalMorphLayer.updateCardContent(telemetry.stageIndex);
    };

    // 8. Smooth Scrolling with Lenis
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true
    });

    const updateScrollTarget = (): void => {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        sceneManager.targetScroll = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    };

    lenis.on('scroll', () => {
        updateScrollTarget();
    });

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    updateScrollTarget();

    function raf(time: number): void {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 9. Start Scene Render Loop
    sceneManager.start();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initApp();
} else {
    window.addEventListener('DOMContentLoaded', initApp, { once: true });
}
