import type { HardwareTier, HardwareInfo } from '../three/GPUDetector.ts';
import type { TelemetryData } from '../three/SceneManager.ts';

export interface StudioHUDOptions {
    onRenderModeChange: (mode: HardwareTier) => void;
    onLightingMoodChange: (mood: string) => void;
    onInspectToggle: () => boolean;
    onInspectDishSelect: (index: number) => void;
    onExplodeChange: (value: number) => void;
}

/**
 * Studio telemetry HUD and real-time graphics controls.
 * Zero emojis strictly enforced.
 */
export class StudioHUD {
    private container: HTMLElement;
    private options: StudioHUDOptions;

    private hudStageIndex: HTMLElement | null = null;
    private hudDishName: HTMLElement | null = null;
    private hudAtmosphere: HTMLElement | null = null;
    private hudRotY: HTMLElement | null = null;
    private hudLift: HTMLElement | null = null;
    private hudScrollBar: HTMLElement | null = null;
    private hudLightingBadge: HTMLElement | null = null;

    private modeBtnPerf: HTMLButtonElement | null = null;
    private modeBtnStd: HTMLButtonElement | null = null;
    private modeBtnRTX: HTMLButtonElement | null = null;
    private gpuStatusDot: HTMLElement | null = null;
    private gpuDetectedName: HTMLElement | null = null;

    private moodBtnTerracotta: HTMLButtonElement | null = null;
    private moodBtnEmerald: HTMLButtonElement | null = null;
    private moodBtnStudio: HTMLButtonElement | null = null;

    private inspectBtn: HTMLButtonElement | null = null;
    private inspectBtnLabel: HTMLElement | null = null;
    private inspectStatusDot: HTMLElement | null = null;
    private inspectHudPanel: HTMLElement | null = null;
    private inspectDishButtons: HTMLButtonElement[] = [];
    private explodeSlider: HTMLInputElement | null = null;
    private explodeValLabel: HTMLElement | null = null;

    private lastStageIdx = -1;
    private lastDishName = '';
    private lastAtmosphere = '';
    private lastRotY = -999;
    private lastLift = -999;
    private lastScrollPct = '';

    constructor(container: HTMLElement, options: StudioHUDOptions) {
        this.container = container;
        this.options = options;
        this.render();
    }

    public render(): void {
        this.container.className = 'fixed bottom-0 left-0 right-0 z-30 pointer-events-none';
        this.container.innerHTML = `
            <!-- Top Floating Inspect Panel (visible in inspect mode) -->
            <div id="inspect-hud-panel" class="max-w-xl mx-auto m-4 sm:m-6 p-3.5 sm:p-4 rounded-2xl hud-glass border border-terracotta/40 flex flex-col gap-3 opacity-0 pointer-events-none translate-y-[-12px] transition-all duration-300">
                <div class="flex items-center justify-between text-xs font-mono">
                    <span class="text-terracotta font-semibold tracking-wider uppercase">MODO INSPECCION LIBRE 3D</span>
                    <span class="text-cream/60">ARRASTRA PARA ROTAR EN 360&deg;</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[10px] font-mono text-muted uppercase">PLATILLO:</span>
                    <button type="button" data-dish="0" class="inspect-dish-btn interactive-el keep-interactive cursor-pointer px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider bg-terracotta text-obsidian font-bold shadow-md shadow-terracotta/20 transition-all">01 HAMBURGUESA</button>
                    <button type="button" data-dish="1" class="inspect-dish-btn interactive-el keep-interactive cursor-pointer px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider bg-charcoal text-cream/70 hover:text-cream border border-cream/10 transition-all">02 PIZZA</button>
                    <button type="button" data-dish="2" class="inspect-dish-btn interactive-el keep-interactive cursor-pointer px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider bg-charcoal text-cream/70 hover:text-cream border border-cream/10 transition-all">03 ENSALADA</button>
                    <button type="button" data-dish="3" class="inspect-dish-btn interactive-el keep-interactive cursor-pointer px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider bg-charcoal text-cream/70 hover:text-cream border border-cream/10 transition-all">04 POSTRE</button>
                </div>
                <div class="flex items-center gap-3 pt-1">
                    <span class="text-[10px] font-mono text-muted uppercase whitespace-nowrap">APERTURA CAMPANA:</span>
                    <input type="range" id="manual-explode-slider" min="0" max="1" step="0.01" value="0.60" class="hud-slider interactive-el keep-interactive flex-1 cursor-pointer">
                    <span id="explode-val-label" class="font-mono text-xs text-saffron min-w-[38px] text-right">60%</span>
                </div>
            </div>
        `;

        this.bindDOMElements();
        this.bindEvents();
    }

    private bindDOMElements(): void {
        this.hudStageIndex = this.container.querySelector('#hud-stage-index');
        this.hudDishName = this.container.querySelector('#hud-dish-name');
        this.hudAtmosphere = this.container.querySelector('#hud-atmosphere');
        this.hudRotY = this.container.querySelector('#hud-roty');
        this.hudLift = this.container.querySelector('#hud-lift');
        this.hudScrollBar = this.container.querySelector('#hud-scroll-bar');
        this.hudLightingBadge = this.container.querySelector('#hud-lighting-badge');

        this.modeBtnPerf = this.container.querySelector('#mode-btn-performance');
        this.modeBtnStd = this.container.querySelector('#mode-btn-standard');
        this.modeBtnRTX = this.container.querySelector('#mode-btn-raytracing');
        this.gpuStatusDot = this.container.querySelector('#gpu-status-dot');
        this.gpuDetectedName = this.container.querySelector('#gpu-detected-name');

        this.moodBtnTerracotta = this.container.querySelector('#mood-terracotta');
        this.moodBtnEmerald = this.container.querySelector('#mood-emerald');
        this.moodBtnStudio = this.container.querySelector('#mood-studio');

        this.inspectBtn = this.container.querySelector('#inspect-mode-btn');
        this.inspectBtnLabel = this.container.querySelector('#inspect-btn-label');
        this.inspectStatusDot = this.container.querySelector('#inspect-status-dot');
        this.inspectHudPanel = this.container.querySelector('#inspect-hud-panel');
        this.inspectDishButtons = Array.from(this.container.querySelectorAll<HTMLButtonElement>('.inspect-dish-btn'));
        this.explodeSlider = this.container.querySelector('#manual-explode-slider');
        this.explodeValLabel = this.container.querySelector('#explode-val-label');
    }

    private bindEvents(): void {
        // GPU Tier Mode buttons
        this.modeBtnPerf?.addEventListener('click', () => {
            this.options.onRenderModeChange('performance');
            this.setRenderModeButtonState('performance');
        });
        this.modeBtnStd?.addEventListener('click', () => {
            this.options.onRenderModeChange('standard');
            this.setRenderModeButtonState('standard');
        });
        this.modeBtnRTX?.addEventListener('click', () => {
            this.options.onRenderModeChange('raytracing');
            this.setRenderModeButtonState('raytracing');
        });

        // Mood buttons
        this.moodBtnTerracotta?.addEventListener('click', () => {
            this.options.onLightingMoodChange('terracotta');
            this.setMoodButtonState('terracotta');
        });
        this.moodBtnEmerald?.addEventListener('click', () => {
            this.options.onLightingMoodChange('emerald');
            this.setMoodButtonState('emerald');
        });
        this.moodBtnStudio?.addEventListener('click', () => {
            this.options.onLightingMoodChange('studio');
            this.setMoodButtonState('studio');
        });

        // Inspect toggle button
        this.inspectBtn?.addEventListener('click', () => {
            const isInspect = this.options.onInspectToggle();
            this.setInspectModeUI(isInspect);
        });

        // Inspect dish selection buttons
        this.inspectDishButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const dishIdx = parseInt(btn.getAttribute('data-dish') || '0', 10);
                this.options.onInspectDishSelect(dishIdx);
                this.setInspectDishButtonState(dishIdx);
            });
        });

        // Explode slider
        this.explodeSlider?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const val = parseFloat(target.value);
            this.options.onExplodeChange(val);
            if (this.explodeValLabel) {
                this.explodeValLabel.textContent = `${Math.round(val * 100)}%`;
            }
        });
    }

    public updateHUD(data: TelemetryData): void {
        const pct = (data.scrollProgress * 100).toFixed(1);
        if (pct !== this.lastScrollPct) {
            this.lastScrollPct = pct;
            if (this.hudScrollBar) this.hudScrollBar.style.width = `${pct}%`;
        }

        if (data.stageIndex !== this.lastStageIdx) {
            this.lastStageIdx = data.stageIndex;
            if (this.hudStageIndex) this.hudStageIndex.textContent = `0${data.stageIndex + 1} / 04`;
        }

        if (data.dishName !== this.lastDishName) {
            this.lastDishName = data.dishName;
            if (this.hudDishName) this.hudDishName.textContent = data.dishName;
        }

        if (data.atmosphere !== this.lastAtmosphere) {
            this.lastAtmosphere = data.atmosphere;
            if (this.hudAtmosphere) this.hudAtmosphere.textContent = data.atmosphere;
        }

        if (data.rotY !== this.lastRotY) {
            this.lastRotY = data.rotY;
            if (this.hudRotY) this.hudRotY.textContent = data.rotY.toFixed(2);
        }

        if (data.lift !== this.lastLift) {
            this.lastLift = data.lift;
            if (this.hudLift) this.hudLift.textContent = data.lift.toFixed(2);
        }
    }

    public setRenderModeButtonState(mode: HardwareTier): void {
        const activeClass = 'bg-terracotta text-obsidian font-bold shadow-md shadow-terracotta/25';
        const rtxActiveClass = 'bg-amber-500 text-obsidian font-bold shadow-md shadow-amber-500/25';
        const inactiveClass = 'text-cream/70 hover:text-cream hover:bg-white/[0.06]';

        if (this.modeBtnPerf) this.modeBtnPerf.className = `mode-select-btn px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${mode === 'performance' ? activeClass : inactiveClass}`;
        if (this.modeBtnStd) this.modeBtnStd.className = `mode-select-btn px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${mode === 'standard' ? activeClass : inactiveClass}`;
        if (this.modeBtnRTX) this.modeBtnRTX.className = `mode-select-btn px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${mode === 'raytracing' ? rtxActiveClass : inactiveClass}`;
    }

    public setMoodButtonState(mood: string): void {
        const activeClass = 'mood-btn px-3 py-1 rounded-full font-mono text-[10px] tracking-widest uppercase transition-all bg-terracotta/25 text-saffron border border-terracotta/40';
        const inactiveClass = 'mood-btn px-3 py-1 rounded-full font-mono text-[10px] tracking-widest uppercase text-cream/60 hover:text-cream transition-all border border-transparent';

        if (this.moodBtnTerracotta) this.moodBtnTerracotta.className = mood === 'terracotta' ? activeClass : inactiveClass;
        if (this.moodBtnEmerald) this.moodBtnEmerald.className = mood === 'emerald' ? activeClass : inactiveClass;
        if (this.moodBtnStudio) this.moodBtnStudio.className = mood === 'studio' ? activeClass : inactiveClass;
    }

    public setInspectModeUI(isInspect: boolean): void {
        const body = document.body;
        const docEl = document.documentElement;

        if (isInspect) {
            body.classList.add('inspect-mode');
            body.style.overflow = 'hidden';
            docEl.style.overflow = 'hidden';
            if (this.inspectHudPanel) {
                this.inspectHudPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-[-12px]');
                this.inspectHudPanel.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
            }
            if (this.inspectBtnLabel) this.inspectBtnLabel.textContent = 'VISTA EDITORIAL';
            if (this.inspectStatusDot) {
                this.inspectStatusDot.classList.remove('bg-sage');
                this.inspectStatusDot.classList.add('bg-terracotta');
            }
        } else {
            body.classList.remove('inspect-mode');
            body.style.overflow = '';
            docEl.style.overflow = '';
            if (this.inspectHudPanel) {
                this.inspectHudPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-y-[-12px]');
                this.inspectHudPanel.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
            }
            if (this.inspectBtnLabel) this.inspectBtnLabel.textContent = 'INSPECCION 3D';
            if (this.inspectStatusDot) {
                this.inspectStatusDot.classList.remove('bg-terracotta');
                this.inspectStatusDot.classList.add('bg-sage');
            }
        }
    }

    public setInspectDishButtonState(selectedIdx: number): void {
        this.inspectDishButtons.forEach((btn, idx) => {
            if (idx === selectedIdx) {
                btn.className = 'inspect-dish-btn interactive-el keep-interactive cursor-pointer px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider bg-terracotta text-obsidian font-bold shadow-md shadow-terracotta/20 transition-all';
            } else {
                btn.className = 'inspect-dish-btn interactive-el keep-interactive cursor-pointer px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider bg-charcoal text-cream/70 hover:text-cream border border-cream/10 transition-all';
            }
        });
    }
}
