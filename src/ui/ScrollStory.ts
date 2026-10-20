/**
 * Scroll storytelling narrative container driving scroll height and sections.
 * Zero emojis strictly enforced.
 */
export interface ScrollStoryOptions {
    onOpenRegisterModal?: () => void;
    onStageSelect?: (progress: number) => void;
}

export class ScrollStory {
    private container: HTMLElement;
    private options: ScrollStoryOptions;

    constructor(container: HTMLElement, options: ScrollStoryOptions) {
        this.container = container;
        this.options = options;
        this.render();
    }

    public render(): void {
        this.container.innerHTML = `
            <div id="scroll-content" class="relative w-full">
                <!-- STAGE 1: HERO / PROPUESTA -->
                <section id="stage-1" class="relative min-h-[120vh] w-full max-w-[98vw] 2xl:max-w-[1900px] mx-auto pointer-events-none"></section>

                <!-- STAGE 2: OBRADORES Y FONDAS -->
                <section id="stage-2" class="relative min-h-[125vh] w-full max-w-[98vw] 2xl:max-w-[1900px] mx-auto pointer-events-none"></section>

                <!-- STAGE 3: HUERTOS Y CERCANIA -->
                <section id="stage-3" class="relative min-h-[125vh] w-full max-w-[98vw] 2xl:max-w-[1900px] mx-auto pointer-events-none"></section>

                <!-- STAGE 4: OBRADOR DULCE Y MANIFIESTO -->
                <section id="stage-4" class="relative min-h-[125vh] w-full max-w-[98vw] 2xl:max-w-[1900px] mx-auto pointer-events-none"></section>
            </div>
        `;
    }
}
