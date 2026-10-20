import * as THREE from 'three';

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

/**
 * 3D-to-2D screen coordinate projection and orbital morph controller.
 * Bridges Three.js rotating ring nodes with DOM HUD cards.
 * Zero emojis strictly enforced.
 */
export class OrbitalMorphController {
    private camera: THREE.PerspectiveCamera;
    private orbitalRingGroup: THREE.Group;
    private orbitNodes: THREE.Mesh[];
    private cardElements: (HTMLElement | null)[] = [];
    private onSyncTexts?: (stageIndex: number) => void;

    private _morphProjVec = new THREE.Vector3();
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

    private _orbPositions: ScreenCoord[] = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
    ];

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

    public setCardElements(elements: (HTMLElement | null)[]): void {
        this.cardElements = elements;
        this.initAnchors();
    }

    public updateEditorialAnchors(): ScreenCoord[] {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isMobile = w <= 640;
        const isTablet = w > 640 && w < 1024;
        const isShort = h < 550;

        if (isMobile) {
            const cardWidth = Math.min(215, Math.max(140, Math.floor(w * 0.5 - 16)));
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
            const cardWidth = 275;
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
            const cardWidth = 310;
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

        // 1. Project 4 orbitNodes from 3D to 2D Screen Space
        for (let i = 0; i < 4; i++) {
            this.orbitNodes[i].getWorldPosition(this._morphProjVec);
            this._morphProjVec.project(this.camera);
            this._orbPositions[i].x = (this._morphProjVec.x * 0.5 + 0.5) * w - 8;
            this._orbPositions[i].y = (-this._morphProjVec.y * 0.5 + 0.5) * h - 8;
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

        // Crossfade intervals
        const inDishTransition = (
            (s >= 0.18 && s <= 0.28) ||
            (s >= 0.48 && s <= 0.58) ||
            (s >= 0.78 && s <= 0.88)
        );

        const VELOCITY_THRESHOLD = 0.0035;
        const isScrolling = inDishTransition ? (scrollVelocity > 0.0006) : (scrollVelocity >= VELOCITY_THRESHOLD);
        const isSettled = isInspectMode || !isScrolling;

        // Synchronize texts safely
        if (this.onSyncTexts && (!this.morphCardState[0].isCard || isSettled)) {
            this.onSyncTexts(stageIndex);
        }

        // 4. Smooth Interpolation
        const targetProgress = isSettled ? 1.0 : 0.0;
        const pSpeed = isSettled ? 0.08 : 0.14;

        for (let i = 0; i < 4; i++) {
            const cardEl = this.cardElements[i];
            const cState = this.morphCardState[i];
            if (!cardEl) continue;

            cState.progress = this.lerp(cState.progress, targetProgress, pSpeed);
            if (Math.abs(cState.progress - targetProgress) < 0.001) {
                cState.progress = targetProgress;
            }

            // S-curve easing
            const ease = cState.progress * cState.progress * (3 - 2 * cState.progress);
            cState.x = this.lerp(this._orbPositions[i].x, this._editorialAnchors[i].x, ease);
            cState.y = this.lerp(this._orbPositions[i].y, this._editorialAnchors[i].y, ease);

            cardEl.style.transform = `translate3d(${cState.x.toFixed(1)}px, ${cState.y.toFixed(1)}px, 0)`;

            // Harmonize 3D orbit node mesh scale on golden ring
            if (this.orbitNodes[i]) {
                const nodeScale = Math.max(0.001, 1.0 - cState.progress);
                this.orbitNodes[i].scale.setScalar(nodeScale);
            }

            if (cState.progress >= 0.5) {
                if (!cState.isCard) {
                    cState.isCard = true;
                    cardEl.classList.remove('is-dot');
                    cardEl.classList.add('is-card');
                }
            } else {
                if (cState.isCard) {
                    cState.isCard = false;
                    cardEl.classList.remove('is-card');
                    cardEl.classList.add('is-dot');
                }
            }
        }
    }
}
