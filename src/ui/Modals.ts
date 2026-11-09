/**
 * System dialog modals component: kitchen & producer registration.
 * Zero emojis strictly enforced.
 */
export class Modals {
    private container: HTMLElement;
    private modalEl: HTMLElement | null = null;
    private modalContent: HTMLElement | null = null;
    private formEl: HTMLFormElement | null = null;
    private formFeedback: HTMLElement | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    public render(): void {
        this.container.innerHTML = `
            <!-- Registration Modal -->
            <div id="join-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300" aria-hidden="true">
                <div class="hud-glass max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-terracotta/40 space-y-6 transform scale-95 transition-transform duration-300" id="join-modal-card">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-terracotta">COMUNIDAD FOODLINK</span>
                            <h3 class="font-display text-2xl sm:text-3xl font-bold uppercase text-cream mt-1">REGISTRO DE COCINAS Y OBRADORES</h3>
                        </div>
                        <button type="button" id="modal-close-btn" class="p-2 rounded-full bg-white/[0.06] border border-white/10 text-cream/70 hover:text-cream hover:border-terracotta transition-colors" aria-label="Cerrar ventana">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>

                    <form id="foodlink-form" class="space-y-4">
                        <div>
                            <label class="block font-mono text-[10px] uppercase tracking-widest text-cream/70 mb-1.5">NOMBRE DEL ESTABLECIMIENTO</label>
                            <input type="text" name="name" required placeholder="Ej. Fonda Santa Clara / Obrador La Espiga" class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-cream text-sm focus:outline-none focus:border-terracotta transition-colors">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block font-mono text-[10px] uppercase tracking-widest text-cream/70 mb-1.5">CATEGORIA CULINARIA</label>
                                <select name="type" class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-cream text-sm focus:outline-none focus:border-terracotta transition-colors">
                                    <option value="fonda" class="bg-obsidian text-cream">Fonda Tradicional</option>
                                    <option value="restaurante" class="bg-obsidian text-cream">Restaurante</option>
                                    <option value="cafeteria" class="bg-obsidian text-cream">Cafeteria / Cocina de Autor</option>
                                    <option value="panaderia" class="bg-obsidian text-cream">Panaderia / Pasteleria</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-mono text-[10px] uppercase tracking-widest text-cream/70 mb-1.5">EXCEDENTE ESTIMADO DIARIO</label>
                                <select name="surplus" class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-cream text-sm focus:outline-none focus:border-terracotta transition-colors">
                                    <option value="5-15" class="bg-obsidian text-cream">5 a 15 porciones</option>
                                    <option value="15-40" class="bg-obsidian text-cream">15 a 40 porciones</option>
                                    <option value="40+" class="bg-obsidian text-cream">Mas de 40 porciones</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block font-mono text-[10px] uppercase tracking-widest text-cream/70 mb-1.5">CORREO O CONTACTO DIRECTO</label>
                            <input type="email" name="email" required placeholder="contacto@tucocina.mx" class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-cream text-sm focus:outline-none focus:border-terracotta transition-colors">
                        </div>

                        <div id="form-feedback" class="hidden p-3.5 rounded-xl bg-sage/20 border border-sage/40 text-sage font-mono text-xs">
                            ESTABLECIMIENTO LISTO. REDIRIGIENDO AL PANEL DE GESTION Y PUBLICACION DE OFERTAS...
                        </div>

                        <div class="pt-2 flex items-center justify-between gap-3">
                            <a href="/explorar/?tab=negocio" class="font-mono text-[11px] uppercase tracking-wider text-saffron hover:underline">
                                ABRIR PANEL DE NEGOCIO
                            </a>
                            <div class="flex items-center gap-3">
                                <button type="button" id="modal-cancel-btn" class="px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-cream/70 hover:text-cream">
                                    CANCELAR
                                </button>
                                <button type="submit" class="px-6 py-3 rounded-xl bg-terracotta hover:bg-saffron text-obsidian font-display font-bold text-xs uppercase tracking-wider transition-colors">
                                    REGISTRAR ESTABLECIMIENTO
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.modalEl = this.container.querySelector('#join-modal');
        this.modalContent = this.container.querySelector('#join-modal-card');
        this.formEl = this.container.querySelector('#foodlink-form');
        this.formFeedback = this.container.querySelector('#form-feedback');

        const closeBtn = this.container.querySelector('#modal-close-btn');
        closeBtn?.addEventListener('click', () => this.close());

        const cancelBtn = this.container.querySelector('#modal-cancel-btn');
        cancelBtn?.addEventListener('click', () => this.close());

        this.formEl?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Click outside card to close
        this.modalEl?.addEventListener('click', (e) => {
            if (e.target === this.modalEl) {
                this.close();
            }
        });
    }

    public open(_type = 'kitchen'): void {
        if (!this.modalEl || !this.modalContent) return;
        this.modalEl.classList.remove('opacity-0', 'pointer-events-none');
        this.modalEl.classList.add('opacity-100', 'pointer-events-auto');
        this.modalContent.classList.replace('scale-95', 'scale-100');
    }

    public close(): void {
        if (!this.modalEl || !this.modalContent) return;
        this.modalEl.classList.add('opacity-0', 'pointer-events-none');
        this.modalEl.classList.remove('opacity-100', 'pointer-events-auto');
        this.modalContent.classList.replace('scale-100', 'scale-95');
    }

    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (this.formFeedback) {
            this.formFeedback.classList.remove('hidden');
        }
        if (this.formEl) {
            const fd = new FormData(this.formEl);
            const name = String(fd.get('name') || '').trim();
            const type = String(fd.get('type') || 'fonda').trim();
            const surplus = String(fd.get('surplus') || '5-15').trim();
            const email = String(fd.get('email') || '').trim().toLowerCase();
            let lat = 19.4326;
            let lng = -99.1332;
            try {
                const rawCenter = localStorage.getItem('foodlink_last_center');
                if (rawCenter) {
                    const parsed = JSON.parse(rawCenter);
                    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
                        lat = parsed.lat;
                        lng = parsed.lng;
                    }
                }
            } catch {
                // usar centro por defecto
            }
            if (name) {
                try {
                    await fetch('/api/places/business', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email,
                            name,
                            type,
                            description: `Cocina aliada de rescate (${surplus} porciones diarias estimadas).`,
                            address: 'Centro de la ciudad',
                            phone: '',
                            opening_hours: 'Lun-Sab 9:00-21:00',
                            lat,
                            lng
                        })
                    });
                } catch {
                    // continuar a panel de negocio
                }
            }
        }
        setTimeout(() => {
            window.location.href = '/perfil/?tab=negocio';
        }, 900);
    }
}
