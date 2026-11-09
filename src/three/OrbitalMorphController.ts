import * as THREE from 'three';
import type { LeaderLineElements } from '../ui/OrbitalMorphLayer.ts';

export interface MorphCardState {
    x: number;
    y: number;
    progress: number;
    isCard: boolean;
}

export interface ScreenCoord {
    x: number;
    y: number;
}

const RING_QUADRANT_ANGLES = [
    Math.PI + 0.52, // Card 0: Upper-Left (Back-Left arc of golden ring)
    Math.PI - 0.48, // Card 1: Lower-Left (Front-Left arc of golden ring)
    -0.52,          // Card 2: Upper-Right (Back-Right arc of golden ring)
    0.48            // Card 3: Lower-Right (Front-Right arc of golden ring)
];

/**
 * Sequential Z-reading order stagger ranks:
 * Card 0 (Top-Left) -> Rank 0 (1st)
 * Card 2 (Top-Right) -> Rank 1 (2nd)
 * Card 1 (Bottom-Left) -> Rank 2 (3rd)
 * Card 3 (Bottom-Right) -> Rank 3 (4th)
 */
const STAGGER_RANKS = [0, 2, 1, 3];

/**
 * 3D-to-2D screen coordinate projection and orbital morph controller.
 * Bridges Three.js rotating ring nodes with DOM HUD cards and SVG leader lines.
 * Zero emojis strictly enforced.
 */
export class OrbitalMorphController {
    private camera: THREE.PerspectiveCamera;
    private orbitalRingGroup: THREE.Group;
    private orbitNodes: THREE.Mesh[];
    private cardElements: (HTMLElement | null)[] = [];
    private leaderElements: LeaderLineElements[] = [];
    private onSyncTexts?: (stageIndex: number) => void;

    private _ringProjVec = new THREE.Vector3();

    // Scroll-reactive drift state (cards stay readable; they only float slightly)
    private _lastScroll = 0;
    private _hasLastScroll = false;
    private _scrollDrift = 0;
    private _motionLevel = 0;
    private _reducedMotion = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    private _resizeObserver: ResizeObserver | null = null;

    public morphCardState: MorphCardState[] = [
        { x: 0, y: 0, progress: 1.0, isCard: true },
        { x: 0, y: 0, progress: 1.0, isCard: true },
        { x: 0, y: 0, progress: 1.0, isCard: true },
        { x: 0, y: 0, progress: 1.0, isCard: true }
    ];

    private _editorialAnchors: ScreenCoord[] = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
    ];

    private _ringAnchors2D: ScreenCoord[] = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
    ];

    private _currentCardWidth = 330;
    private _cardHeights = [206, 206, 206, 206];
    private _lastViewportW = 0;
    private _lastViewportH = 0;

    constructor(
        camera: THREE.PerspectiveCamera,
        orbitalRingGroup: THREE.Group,
        orbitNodes: THREE.Mesh[],
        cardElements: (HTMLElement | null)[],
        onSyncTexts?: (stageIndex: number) => void
    ) {
        this.camera = camera;
        this.orbitalRingGroup = orbitalRingGroup;
        this.orbitNodes = orbitNodes;
        this.cardElements = cardElements;
        this.onSyncTexts = onSyncTexts;

        this.initAnchors();
    }

    public setCardElements(
        elements: (HTMLElement | null)[],
        leaders?: LeaderLineElements[]
    ): void {
        this.cardElements = elements;
        if (leaders) {
            this.leaderElements = leaders;
        }
        this.initAnchors();
        this.measureCardHeights();
        this.observeCardHeights();
    }

    /**
     * Keeps leader-line anchors aligned when a card's height changes
     * (e.g. after an animated content swap) without forcing layout every frame.
     */
    private observeCardHeights(): void {
        this._resizeObserver?.disconnect();
        if (typeof ResizeObserver === 'undefined') return;
        this._resizeObserver = new ResizeObserver(() => this.measureCardHeights());
        for (const el of this.cardElements) {
            if (el) this._resizeObserver.observe(el);
        }
    }

    public measureCardHeights(): void {
        for (let i = 0; i < 4; i++) {
            const el = this.cardElements[i];
            if (el && this.morphCardState[i]?.isCard) {
                const h = el.offsetHeight;
                if (h > 40) {
                    this._cardHeights[i] = h;
                }
            }
        }
    }

    public updateEditorialAnchors(): ScreenCoord[] {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isMobile = w <= 640;
        const isTablet = w > 640 && w < 1024;
        const isShort = h < 550;

        if (isMobile) {
            const cardWidth = Math.min(220, Math.max(148, Math.floor(w * 0.5 - 16)));
            this._currentCardWidth = cardWidth;
            const leftX = 10;
            const rightX = Math.max(10, w - cardWidth - 10);
            const topY = isShort ? Math.max(48, Math.round(h * 0.08)) : Math.max(68, Math.round(h * 0.12));
            const minCardGap = isShort ? Math.max(115, Math.round((h - topY - 140) * 0.5 + 65)) : 195;
            const bottomY = isShort
                ? Math.max(topY + 115, Math.min(h - 135, topY + minCardGap))
                : Math.max(topY + minCardGap, Math.min(h - 180, Math.round(h * 0.56)));

            this._editorialAnchors[0].x = leftX;
            this._editorialAnchors[0].y = topY;

            this._editorialAnchors[1].x = leftX;
            this._editorialAnchors[1].y = bottomY;

            this._editorialAnchors[2].x = rightX;
            this._editorialAnchors[2].y = topY;

            this._editorialAnchors[3].x = rightX;
            this._editorialAnchors[3].y = bottomY;
        } else if (isTablet) {
            const cardWidth = 290;
            this._currentCardWidth = cardWidth;
            const sideMargin = Math.max(16, Math.round(w * 0.035));
            const topY = isShort ? Math.max(52, Math.round(h * 0.10)) : Math.max(78, Math.round(h * 0.14));
            const minCardGap = isShort ? Math.max(120, Math.round((h - topY - 140) * 0.5 + 70)) : 210;
            const bottomY = isShort
                ? Math.max(topY + 120, Math.min(h - 140, topY + minCardGap))
                : Math.max(topY + 210, Math.min(h - 190, Math.round(h * 0.58)));

            this._editorialAnchors[0].x = sideMargin;
            this._editorialAnchors[0].y = topY;

            this._editorialAnchors[1].x = sideMargin;
            this._editorialAnchors[1].y = bottomY;

            const rightX = Math.max(sideMargin, w - cardWidth - sideMargin);
            this._editorialAnchors[2].x = rightX;
            this._editorialAnchors[2].y = topY;

            this._editorialAnchors[3].x = rightX;
            this._editorialAnchors[3].y = bottomY;
        } else {
            const cardWidth = 330;
            this._currentCardWidth = cardWidth;
            const sideMargin = Math.max(32, Math.round(w * 0.045));
            const topY = isShort ? Math.max(56, Math.round(h * 0.10)) : Math.max(86, Math.round(h * 0.15));
            const minCardGap = isShort ? Math.max(125, Math.round((h - topY - 145) * 0.5 + 75)) : 225;
            const bottomY = isShort
                ? Math.max(topY + 125, Math.min(h - 145, topY + minCardGap))
                : Math.max(topY + 225, Math.min(h - 200, Math.round(h * 0.58)));

            this._editorialAnchors[0].x = sideMargin;
            this._editorialAnchors[0].y = topY;

            this._editorialAnchors[1].x = sideMargin;
            this._editorialAnchors[1].y = bottomY;

            const rightX = Math.max(sideMargin, w - cardWidth - sideMargin);
            this._editorialAnchors[2].x = rightX;
            this._editorialAnchors[2].y = topY;

            this._editorialAnchors[3].x = rightX;
            this._editorialAnchors[3].y = bottomY;
        }
        return this._editorialAnchors;
    }

    private initAnchors(): void {
        this.updateEditorialAnchors();
        for (let i = 0; i < 4; i++) {
            this.morphCardState[i].x = this._editorialAnchors[i].x;
            this.morphCardState[i].y = this._editorialAnchors[i].y;
            this.morphCardState[i].progress = 1.0;
            this.morphCardState[i].isCard = true;
            const cardEl = this.cardElements[i];
            if (cardEl) {
                cardEl.style.transform = `translate3d(${this._editorialAnchors[i].x.toFixed(1)}px, ${this._editorialAnchors[i].y.toFixed(1)}px, 0)`;
                cardEl.classList.remove('is-dot');
                cardEl.classList.add('is-card');
            }
        }
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    public update(
        s: number,
        scrollVelocity: number,
        isInspectMode: boolean,
        inspectDishIndex?: number
    ): void {
        if (!this.orbitNodes || this.orbitNodes.length < 4) return;

        // Ensure matrices are updated for projection
        this.camera.updateMatrixWorld();
        this.orbitalRingGroup.updateWorldMatrix(true, true);

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (w !== this._lastViewportW || h !== this._lastViewportH) {
            this._lastViewportW = w;
            this._lastViewportH = h;
            this.measureCardHeights();
        }

        // 1. Project 4 quadrant anchor points on the 3D golden ring
        const masterGroup = this.orbitalRingGroup.parent?.parent;
        const totalRotY = (masterGroup ? masterGroup.rotation.y : 0) + this.orbitalRingGroup.rotation.y;

        for (let i = 0; i < 4; i++) {
            const localAngle = RING_QUADRANT_ANGLES[i] + totalRotY;
            this._ringProjVec.set(
                Math.cos(localAngle) * 2.72,
                0.04,
                Math.sin(localAngle) * 2.72
            );
            this.orbitalRingGroup.localToWorld(this._ringProjVec);
            this._ringProjVec.project(this.camera);
            this._ringAnchors2D[i].x = (this._ringProjVec.x * 0.5 + 0.5) * w;
            this._ringAnchors2D[i].y = (-this._ringProjVec.y * 0.5 + 0.5) * h;
        }

        // 2. Editorial Anchors
        this.updateEditorialAnchors();

        // 3. Active Stage Detection
        let stageIndex = 0;
        if (s < 0.24) stageIndex = 0;
        else if (s < 0.54) stageIndex = 1;
        else if (s < 0.82) stageIndex = 2;
        else stageIndex = 3;

        if (isInspectMode && typeof inspectDishIndex === 'number') {
            stageIndex = inspectDishIndex;
        }

        // Synchronize texts (content swaps are animated in place by the layer,
        // so cards never need to collapse while the user scrolls)
        if (this.onSyncTexts) {
            this.onSyncTexts(stageIndex);
        }

        // 4. Scroll-reactive drift: cards stay fully readable at all times and
        //    only float a few pixels against the scroll direction for depth.
        const signedDelta = this._hasLastScroll ? (s - this._lastScroll) : 0;
        this._lastScroll = s;
        this._hasLastScroll = true;
        const maxDrift = w <= 640 ? 4 : 9;
        const targetDrift = this._reducedMotion
            ? 0
            : Math.max(-maxDrift, Math.min(maxDrift, -signedDelta * 1800));
        this._scrollDrift = this.lerp(this._scrollDrift, targetDrift, 0.12);
        if (Math.abs(this._scrollDrift) < 0.01) this._scrollDrift = 0;

        // Subtle velocity-driven emphasis (never hides content)
        const motion = Math.min(1, scrollVelocity / 0.02);
        this._motionLevel = this.lerp(this._motionLevel, motion, 0.1);

        const showLeaders = w > 640 && !isInspectMode;

        for (let i = 0; i < 4; i++) {
            const cardEl = this.cardElements[i];
            const cState = this.morphCardState[i];
            if (!cardEl) continue;

            cState.progress = 1.0;

            // Per-card drift with the Z-reading stagger so motion feels organic
            const rank = STAGGER_RANKS[i];
            const drift = this._scrollDrift * (1.0 - rank * 0.12);

            cState.x = this._editorialAnchors[i].x;
            cState.y = this._editorialAnchors[i].y + drift;

            cardEl.style.transform = `translate3d(${cState.x.toFixed(1)}px, ${cState.y.toFixed(1)}px, 0)`;
            cardEl.style.setProperty('--mc-motion', this._motionLevel.toFixed(3));

            // Orbit node meshes stay hidden: the card + leader line mark the anchor
            if (this.orbitNodes[i]) {
                this.orbitNodes[i].scale.setScalar(0.001);
            }

            if (!cState.isCard) {
                cState.isCard = true;
                cardEl.classList.remove('is-dot');
                cardEl.classList.add('is-card');
                this.measureCardHeights();
            }

            // 5. Update SVG Architectural Leader Line
            const leader = this.leaderElements[i];
            if (leader && leader.group && leader.path && leader.tick && leader.ring) {
                if (!showLeaders) {
                    leader.group.style.opacity = '0';
                } else {
                    const reveal = 1.0;

                    const isLeft = i < 2;
                    const dir = isLeft ? 1 : -1;
                    const startX = isLeft ? (cState.x + this._currentCardWidth) : cState.x;
                    const startY = cState.y + this._cardHeights[i] * 0.5;

                    const ringX = this._ringAnchors2D[i].x;
                    const ringY = this._ringAnchors2D[i].y;

                    const spanX = Math.abs(ringX - startX);
                    const stubLen = Math.min(44, Math.max(16, spanX * 0.25));
                    const elbowX = startX + dir * stubLen;
                    const elbowY = startY;

                    const vx = ringX - elbowX;
                    const vy = ringY - elbowY;
                    const diagLen = Math.hypot(vx, vy);

                    let d: string;
                    if (diagLen > 2) {
                        const ux = vx / diagLen;
                        const uy = vy / diagLen;
                        const cornerR = Math.min(14, stubLen * 0.45, diagLen * 0.25);
                        const p1x = elbowX - dir * cornerR;
                        const p1y = elbowY;
                        const p2x = elbowX + ux * cornerR;
                        const p2y = elbowY + uy * cornerR;
                        d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${elbowX.toFixed(1)} ${elbowY.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)} L ${ringX.toFixed(1)} ${ringY.toFixed(1)}`;
                    } else {
                        d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${ringX.toFixed(1)} ${ringY.toFixed(1)}`;
                    }

                    leader.path.setAttribute('d', d);
                    leader.path.style.strokeDashoffset = (1.0 - reveal).toFixed(3);

                    leader.tick.setAttribute('x1', startX.toFixed(1));
                    leader.tick.setAttribute('y1', (startY - 6).toFixed(1));
                    leader.tick.setAttribute('x2', startX.toFixed(1));
                    leader.tick.setAttribute('y2', (startY + 6).toFixed(1));

                    leader.ring.setAttribute('cx', ringX.toFixed(1));
                    leader.ring.setAttribute('cy', ringY.toFixed(1));

                    leader.group.style.opacity = (reveal * 0.92).toFixed(3);
                }
            }
        }
    }
}
