export interface DishContent {
    dishName: string;
    card0: {
        tag: string;
        title: string;
        desc: string;
    };
    card1: {
        tag: string;
        title: string;
        desc: string;
    };
    card2: {
        tag: string;
        title: string;
        desc: string;
    };
    card3: {
        metricLabel: string;
        metricValue: string;
        title: string;
        desc: string;
    };
}

export const DISH_CARD_DATA: DishContent[] = [
    // Etapa 0: Hamburguesa de Autor
    {
        dishName: 'Hamburguesa de Autor',
        card0: {
            tag: 'PROPUESTA GASTRONOMICA',
            title: 'HAMBURGUESA DE AUTOR',
            desc: 'Cocina de autor que entra por los ojos y rescata cada preparacion del dia conectando comensales con obradores locales.'
        },
        card1: {
            tag: 'FILOSOFIA ARTESANAL',
            title: 'OFICIO Y COMUNIDAD',
            desc: 'Precios justos y consumo consciente que reconocen la dedicacion de fondas y restaurantes de proximidad.'
        },
        card2: {
            tag: 'ORIGEN Y TECNICA',
            title: 'INGREDIENTES DE PROXIMIDAD',
            desc: 'Pan brioche horneado a diario, carne madurada seleccionada y hortalizas frescas de cultivo directo sin intermediarios.'
        },
        card3: {
            metricLabel: 'RESCATE DE LOTE',
            metricValue: '94% DIA',
            title: 'TRAZABILIDAD EN CADA PLATO',
            desc: 'Aprovechamiento integral del turno para garantizar cero merma antes del cierre de cocina.'
        }
    },
    // Etapa 1: Pizza Artesanal
    {
        dishName: 'Pizza Artesanal',
        card0: {
            tag: 'CAPITULO II - EL HORNO',
            title: 'PIZZA ARTESANAL DE MASA MADRE',
            desc: 'Masa madre viva con fermentacion lenta de 48 horas y coccion a fuego directo en horno de piedra volcanica.'
        },
        card1: {
            tag: 'EL VALOR DEL TIEMPO',
            title: 'CERO MERMA AL CIERRE',
            desc: 'Reservas de excedentes a precio preferencial al final de cada turno para evitar cualquier merma en obrador.'
        },
        card2: {
            tag: 'FERMENTACION NATURAL',
            title: 'HARINAS PURAS Y FUEGO DIRECTO',
            desc: 'Harinas sin aditivos quimicos, embutidos regionales y quesos de queseria artesanal preservando los aromas del trigo.'
        },
        card3: {
            metricLabel: 'HORNADA RESCATADA',
            metricValue: '100% LOTE',
            title: 'TRAZABILIDAD DE OBRADOR',
            desc: 'Cada porcion artesanal reservada representa comida de primera calidad aprovechada con retorno justo para el panadero.'
        }
    },
    // Etapa 2: Ensalada Italiana
    {
        dishName: 'Ensalada Italiana',
        card0: {
            tag: 'CAPITULO III - HUERTOS',
            title: 'ENSALADA ITALIANA DE HUERTA',
            desc: 'Conexion directa con agricultores y huertos regionales para servir la cosecha matutina mas fresca sin intermediarios.'
        },
        card1: {
            tag: 'COMPROMISO REGIONAL',
            title: 'COSECHA INTEGRAL EN CAMPO',
            desc: 'Aprovechamiento de cosechas completas y variedades estacionales para evitar el descarte en el campo agricola.'
        },
        card2: {
            tag: 'CULTIVO DIRECTO',
            title: 'COSECHA VIVA Y CIRCUITO CORTO',
            desc: 'Hortalizas crujientes cosechadas a menos de 12 horas del plato, aceites virgen extra prensados en frio y vinagres vivos.'
        },
        card3: {
            metricLabel: 'FRESCURA DE HUERTA',
            metricValue: '< 12H CAMPO',
            title: 'CIRCUITO CORTO VERIFICADO',
            desc: 'Trazabilidad 100% certificada desde el bancal de tierra hasta la mesa comensal con huella de carbono minima.'
        }
    },
    // Etapa 3: Postre & Pastel
    {
        dishName: 'Postre & Pastel',
        card0: {
            tag: 'CAPITULO IV - OBRADOR DULCE',
            title: 'POSTRE & PASTEL DE AUTOR',
            desc: 'Pasteleria y reposteria artesanal en lotes diarios limitados elaborada con cacao puro de origen y fruta fresca.'
        },
        card1: {
            tag: 'MANIFIESTO FOODLINK',
            title: 'NINGUN PLATILLO DEBE PERDERSE',
            desc: 'Creaciones reposteras de corta vida util publicadas en tiempo real para que la comunidad disfrute a precio justo.'
        },
        card2: {
            tag: 'REPOSTERIA VIVA',
            title: 'TECNICA DE ALTA PASTELERIA',
            desc: 'Cremas infusionadas, mantecas de granja y texturas horneadas del dia sin conservantes artificiales ni ultraprocesados.'
        },
        card3: {
            metricLabel: 'FIN DE JORNADA',
            metricValue: '0% RESIDUO',
            title: 'RED DE APROVECHAMIENTO',
            desc: 'Aprovechamiento solidario de fin de turno que respalda economicamente a los artesanos dulces y cuida el planeta.'
        }
    }
];

/**
 * Renders and synchronizes the 4 hybrid 3D-to-screen HUD cards.
 * Zero emojis strictly enforced.
 */
export class OrbitalMorphLayer {
    private container: HTMLElement;
    private cardElements: (HTMLElement | null)[] = [];

    private mc0Tag: HTMLElement | null = null;
    private mc0Title: HTMLElement | null = null;
    private mc0Desc: HTMLElement | null = null;

    private mc1Tag: HTMLElement | null = null;
    private mc1Title: HTMLElement | null = null;
    private mc1Desc: HTMLElement | null = null;

    private mc2Tag: HTMLElement | null = null;
    private mc2Title: HTMLElement | null = null;
    private mc2Desc: HTMLElement | null = null;

    private mc3MetricL: HTMLElement | null = null;
    private mc3MetricV: HTMLElement | null = null;
    private mc3Title: HTMLElement | null = null;
    private mc3Desc: HTMLElement | null = null;

    private lastStageIndex = -1;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    public render(): void {
        this.container.innerHTML = `
            <!-- Card 0: Superior Izquierda / Propuesta Gastronomica Central -->
            <article id="morph-card-0" class="orbital-morph-card is-card interactive-el" aria-label="Propuesta gastronomica central del platillo activo">
                <div class="morph-dot-beacon" aria-hidden="true"></div>
                <span class="mc-corner mc-corner--tl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--tr" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--bl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--br" aria-hidden="true"></span>
                <div class="orbital-card-inner">
                    <div class="mc-tag-row">
                        <span id="mc0-tag" class="mc-tag-label">PROPUESTA GASTRONOMICA</span>
                        <span class="mc-badge">ACTIVO</span>
                    </div>
                    <h3 id="mc0-title" class="mc-title">HAMBURGUESA DE AUTOR</h3>
                    <p id="mc0-desc" class="mc-desc">Cocina de autor que entra por los ojos y rescata cada preparacion del dia conectando comensales con obradores locales.</p>
                    <div class="mc-divider" aria-hidden="true">
                        <span class="mc-divider-line"></span>
                    </div>
                    <div class="mc-footer">
                        <span class="mc-footer-left">TRAZABILIDAD LOCAL</span>
                        <span class="mc-footer-right">CERO MERMA</span>
                    </div>
                </div>
            </article>

            <!-- Card 1: Inferior Izquierda / Filosofia Artesanal y Cero Desperdicio -->
            <article id="morph-card-1" class="orbital-morph-card is-card interactive-el" aria-label="Filosofia artesanal, oficio y compromiso cero desperdicio">
                <div class="morph-dot-beacon" aria-hidden="true"></div>
                <span class="mc-corner mc-corner--tl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--tr" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--bl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--br" aria-hidden="true"></span>
                <div class="orbital-card-inner">
                    <div class="mc-tag-row">
                        <span id="mc1-tag" class="mc-tag-label">FILOSOFIA ARTESANAL</span>
                        <span class="mc-alt-badge">RED CONSCIENTE</span>
                    </div>
                    <h4 id="mc1-title" class="mc-title">OFICIO Y COMUNIDAD</h4>
                    <p id="mc1-desc" class="mc-desc">Precios justos y consumo consciente que reconocen la dedicacion de fondas y restaurantes de proximidad.</p>
                    <div class="mc-divider" aria-hidden="true">
                        <span class="mc-divider-line"></span>
                    </div>
                    <div class="mc-footer">
                        <span class="mc-footer-left">ECONOMIA DE BARRIO</span>
                        <span class="mc-footer-right">VALOR COMPARTIDO</span>
                    </div>
                </div>
            </article>

            <!-- Card 2: Superior Derecha / Ingredientes de Proximidad, Tecnica y Origen -->
            <article id="morph-card-2" class="orbital-morph-card is-card interactive-el" aria-label="Ingredientes de proximidad, tecnica y origen">
                <div class="morph-dot-beacon" aria-hidden="true"></div>
                <span class="mc-corner mc-corner--tl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--tr" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--bl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--br" aria-hidden="true"></span>
                <div class="orbital-card-inner">
                    <div class="mc-tag-row">
                        <span id="mc2-tag" class="mc-tag-label">ORIGEN Y TECNICA</span>
                        <span class="mc-alt-badge">KM 0</span>
                    </div>
                    <h4 id="mc2-title" class="mc-title">INGREDIENTES DE PROXIMIDAD</h4>
                    <p id="mc2-desc" class="mc-desc">Pan brioche horneado a diario, carne madurada seleccionada y hortalizas frescas de cultivo directo sin intermediarios.</p>
                    <div class="mc-divider" aria-hidden="true">
                        <span class="mc-divider-line"></span>
                    </div>
                    <div class="mc-footer">
                        <span class="mc-footer-left">PRODUCCION LOCAL</span>
                        <span class="mc-footer-right">FRESCO DEL DIA</span>
                    </div>
                </div>
            </article>

            <!-- Card 3: Inferior Derecha / Metricas de Aprovechamiento, Lote del Dia y Trazabilidad -->
            <article id="morph-card-3" class="orbital-morph-card is-card interactive-el" aria-label="Metricas de aprovechamiento, lote del dia y trazabilidad">
                <div class="morph-dot-beacon" aria-hidden="true"></div>
                <span class="mc-corner mc-corner--tl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--tr" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--bl" aria-hidden="true"></span>
                <span class="mc-corner mc-corner--br" aria-hidden="true"></span>
                <div class="orbital-card-inner">
                    <div class="mc-metric-row">
                        <span id="mc3-metric-l" class="mc-metric-label">RESCATE DE LOTE</span>
                        <span id="mc3-metric-v" class="mc-metric-value">94% DIA</span>
                    </div>
                    <h4 id="mc3-title" class="mc-title">TRAZABILIDAD EN CADA PLATO</h4>
                    <p id="mc3-desc" class="mc-desc">Aprovechamiento integral del turno para garantizar cero merma antes del cierre de cocina.</p>
                    <div class="mc-divider" aria-hidden="true">
                        <span class="mc-divider-line"></span>
                    </div>
                    <div class="mc-footer">
                        <span class="mc-footer-left">LOTE VERIFICADO</span>
                        <span class="mc-footer-right">100% TRAZABLE</span>
                    </div>
                </div>
            </article>
        `;

        this.cardElements = [
            this.container.querySelector('#morph-card-0'),
            this.container.querySelector('#morph-card-1'),
            this.container.querySelector('#morph-card-2'),
            this.container.querySelector('#morph-card-3')
        ];

        this.mc0Tag = this.container.querySelector('#mc0-tag');
        this.mc0Title = this.container.querySelector('#mc0-title');
        this.mc0Desc = this.container.querySelector('#mc0-desc');

        this.mc1Tag = this.container.querySelector('#mc1-tag');
        this.mc1Title = this.container.querySelector('#mc1-title');
        this.mc1Desc = this.container.querySelector('#mc1-desc');

        this.mc2Tag = this.container.querySelector('#mc2-tag');
        this.mc2Title = this.container.querySelector('#mc2-title');
        this.mc2Desc = this.container.querySelector('#mc2-desc');

        this.mc3MetricL = this.container.querySelector('#mc3-metric-l');
        this.mc3MetricV = this.container.querySelector('#mc3-metric-v');
        this.mc3Title = this.container.querySelector('#mc3-title');
        this.mc3Desc = this.container.querySelector('#mc3-desc');

        this.container.style.opacity = '1';
    }

    public getCardElements(): (HTMLElement | null)[] {
        return this.cardElements;
    }

    public updateCardContent(stageIndex: number): void {
        if (stageIndex === this.lastStageIndex) return;
        this.lastStageIndex = stageIndex;

        const data = DISH_CARD_DATA[stageIndex];
        if (!data) return;

        if (this.mc0Tag) this.mc0Tag.textContent = data.card0.tag;
        if (this.mc0Title) this.mc0Title.textContent = data.card0.title;
        if (this.mc0Desc) this.mc0Desc.textContent = data.card0.desc;

        if (this.mc1Tag) this.mc1Tag.textContent = data.card1.tag;
        if (this.mc1Title) this.mc1Title.textContent = data.card1.title;
        if (this.mc1Desc) this.mc1Desc.textContent = data.card1.desc;

        if (this.mc2Tag) this.mc2Tag.textContent = data.card2.tag;
        if (this.mc2Title) this.mc2Title.textContent = data.card2.title;
        if (this.mc2Desc) this.mc2Desc.textContent = data.card2.desc;

        if (this.mc3MetricL) this.mc3MetricL.textContent = data.card3.metricLabel;
        if (this.mc3MetricV) this.mc3MetricV.textContent = data.card3.metricValue;
        if (this.mc3Title) this.mc3Title.textContent = data.card3.title;
        if (this.mc3Desc) this.mc3Desc.textContent = data.card3.desc;
    }

    public show(): void {
        this.container.style.opacity = '1';
    }

    public hide(): void {
        this.container.style.opacity = '0';
    }
}
