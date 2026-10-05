import { getStoredUser, setStoredUser, clearStoredUser, onAuthChange, type AuthUser } from '../utils/auth';
import { sendVerificationEmail } from '../services/emailService';

type ModalTab = 'login' | 'register' | 'verify' | 'account';

export function initLoginModal(container: HTMLElement | null) {
  if (!container) return;

  container.innerHTML = `
    <div
      id="login-modal"
      class="fixed inset-0 z-[100] hidden modal-overlay flex items-center justify-center p-4 sm:p-6 opacity-0 transition-opacity duration-300"
      role="presentation"
    >
      <!-- Modal Box -->
      <div
        id="login-dialog"
        class="relative w-full max-w-md overflow-hidden rounded-[2.25rem] border border-brand-1/15 bg-[#181512]/95 p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.65),0_0_50px_rgba(232,106,51,0.12)] backdrop-blur-2xl transition-all duration-300 scale-95 opacity-0 flex flex-col gap-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <!-- Ambient top glow inside card -->
        <div class="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-brand-3/20 blur-3xl"></div>

        <!-- Close Button (Top-Right) -->
        <button
          id="close-login-btn"
          type="button"
          aria-label="Cerrar ventana"
          class="absolute top-6 right-6 z-20 h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-brand-1/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Header: Title & Subtitle -->
        <div class="flex flex-col gap-1 z-10 pr-8">
          <h3 id="auth-modal-title" class="font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-white">
            Bienvenido<span class="text-brand-3">.</span>
          </h3>
          <p id="auth-modal-desc" class="font-body text-xs sm:text-sm text-brand-1/70 leading-relaxed">
            Accede a tu cuenta de Foodlink para disfrutar beneficios de comensal.
          </p>
        </div>

        <!-- Segmented Tabs (Dinámico segun estado de sesion) -->
        <div id="auth-tabs-bar" class="grid grid-cols-2 rounded-2xl bg-white/[0.05] p-1.5 border border-white/10 z-10" role="tablist" aria-label="Opciones de cuenta">
          <button
            id="tab-login"
            role="tab"
            aria-selected="true"
            aria-controls="panel-login"
            tabindex="0"
            class="auth-tab rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 bg-brand-4 text-white shadow-md shadow-brand-4/30"
          >
            Iniciar Sesión
          </button>
          <button
            id="tab-register"
            role="tab"
            aria-selected="false"
            aria-controls="panel-register"
            tabindex="-1"
            class="auth-tab rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 text-brand-1/60 hover:text-white"
          >
            Registrarse
          </button>
        </div>

        <!-- Feedback Alert Bar -->
        <div
          id="auth-feedback"
          class="hidden rounded-2xl border p-3 text-center font-body text-xs z-10 transition-all"
          role="status"
          aria-live="polite"
        ></div>

        <!-- Forms Container -->
        <div class="relative z-10">

          <!-- ─── Panel 1: Iniciar Sesión ─── -->
          <div id="panel-login" role="tabpanel" class="flex flex-col gap-4">
            <form id="form-login" class="flex flex-col gap-4 font-body">
              <!-- Email input -->
              <div class="flex flex-col gap-1.5">
                <label for="login-email" class="text-[0.7rem] uppercase text-brand-1/70 font-bold tracking-widest">
                  Correo electrónico
                </label>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-brand-1/40 pointer-events-none">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    placeholder="ejemplo@foodlink.com"
                    class="w-full rounded-2xl border border-brand-1/15 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-brand-1 placeholder:text-brand-1/30 outline-none transition-all focus:border-brand-3 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-3/20"
                  />
                </div>
              </div>

              <!-- Password input -->
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-[0.7rem] uppercase tracking-widest font-bold">
                  <label for="login-password" class="text-brand-1/70">Contraseña</label>
                </div>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-brand-1/40 pointer-events-none">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    placeholder="••••••••"
                    class="w-full rounded-2xl border border-brand-1/15 bg-white/[0.04] py-3.5 pl-11 pr-11 text-sm text-brand-1 placeholder:text-brand-1/30 outline-none transition-all focus:border-brand-3 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-3/20"
                  />
                  <button
                    type="button"
                    class="toggle-password-btn absolute right-3 p-1.5 text-brand-1/40 hover:text-brand-1 transition-colors"
                    data-target="login-password"
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    <svg class="w-4 h-4 eye-open" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg class="w-4 h-4 eye-closed hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Submit button -->
              <button
                id="btn-submit-login"
                type="submit"
                class="minimal-btn mt-2 w-full rounded-full border-brand-4 bg-brand-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-4/25 hover:border-brand-3 hover:bg-brand-3 flex items-center justify-center gap-2"
              >
                <span>Entrar a Foodlink</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>

            <!-- Switch to Register footer -->
            <p class="text-center font-body text-xs text-brand-1/60 mt-1">
              ¿No tienes una cuenta aún?
              <button type="button" id="switch-to-register" class="font-bold text-brand-2 hover:text-brand-3 underline underline-offset-4 ml-1 transition-colors">
                Regístrate gratis
              </button>
            </p>
          </div>

          <!-- ─── Panel 2: Registrarse ─── -->
          <div id="panel-register" role="tabpanel" class="hidden flex-col gap-4">
            <form id="form-register" class="flex flex-col gap-3.5 font-body">
              <!-- Name input -->
              <div class="flex flex-col gap-1.5">
                <label for="register-name" class="text-[0.7rem] uppercase text-brand-1/70 font-bold tracking-widest">
                  Nombre completo
                </label>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-brand-1/40 pointer-events-none">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    autocomplete="name"
                    required
                    placeholder="Nombre apellidos"
                    class="w-full rounded-2xl border border-brand-1/15 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-brand-1 placeholder:text-brand-1/30 outline-none transition-all focus:border-brand-3 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-3/20"
                  />
                </div>
              </div>

              <!-- Email input -->
              <div class="flex flex-col gap-1.5">
                <label for="register-email" class="text-[0.7rem] uppercase text-brand-1/70 font-bold tracking-widest">
                  Correo electrónico
                </label>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-brand-1/40 pointer-events-none">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    placeholder="tu@correo.com"
                    class="w-full rounded-2xl border border-brand-1/15 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-brand-1 placeholder:text-brand-1/30 outline-none transition-all focus:border-brand-3 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-3/20"
                  />
                </div>
              </div>

              <!-- Password input -->
              <div class="flex flex-col gap-1.5">
                <label for="register-password" class="text-[0.7rem] uppercase text-brand-1/70 font-bold tracking-widest">
                  Contraseña (mínimo 8 caracteres)
                </label>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-brand-1/40 pointer-events-none">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    required
                    minlength="8"
                    placeholder="Mínimo 8 caracteres"
                    class="w-full rounded-2xl border border-brand-1/15 bg-white/[0.04] py-3.5 pl-11 pr-11 text-sm text-brand-1 placeholder:text-brand-1/30 outline-none transition-all focus:border-brand-3 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-3/20"
                  />
                  <button
                    type="button"
                    class="toggle-password-btn absolute right-3 p-1.5 text-brand-1/40 hover:text-brand-1 transition-colors"
                    data-target="register-password"
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    <svg class="w-4 h-4 eye-open" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg class="w-4 h-4 eye-closed hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Submit button -->
              <button
                id="btn-submit-register"
                type="submit"
                class="minimal-btn mt-1 w-full rounded-full border-brand-4 bg-brand-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-4/25 hover:border-brand-3 hover:bg-brand-3 flex items-center justify-center gap-2"
              >
                <span>Crear mi cuenta</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>

            <!-- Switch to Login footer -->
            <p class="text-center font-body text-xs text-brand-1/60 mt-1">
              ¿Ya tienes una cuenta registrada?
              <button type="button" id="switch-to-login" class="font-bold text-brand-2 hover:text-brand-3 underline underline-offset-4 ml-1 transition-colors">
                Inicia sesión aquí
              </button>
            </p>
          </div>

          <!-- ─── Panel 3: Verificar Correo ─── -->
          <div id="panel-verify" role="tabpanel" class="hidden flex-col gap-4 font-body">
            <div class="rounded-2xl border border-brand-3/20 bg-brand-3/5 p-4 text-xs leading-relaxed text-brand-1/80 flex flex-col gap-2">
              <p>
                Hemos enviado un código de verificación de 6 dígitos al correo:
                <span id="verify-target-email" class="font-bold text-brand-2 block mt-0.5 break-all"></span>
            </div>

            <form id="form-verify" class="flex flex-col gap-3.5">
              <div class="flex flex-col gap-1.5">
                <label for="verify-code-input" class="text-[0.7rem] uppercase text-brand-1/70 font-bold tracking-widest text-center">
                  Código de 6 dígitos
                </label>
                <input
                  id="verify-code-input"
                  name="code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  required
                  placeholder="123456"
                  class="w-full text-center tracking-[0.4em] font-mono text-xl font-bold rounded-2xl border border-brand-1/15 bg-white/[0.04] py-3.5 px-4 text-brand-1 placeholder:text-brand-1/20 outline-none transition-all focus:border-brand-3 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-3/20"
                />
              </div>

              <button
                id="btn-submit-verify"
                type="submit"
                class="minimal-btn mt-1 w-full rounded-full border-brand-4 bg-brand-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-4/25 hover:border-brand-3 hover:bg-brand-3 flex items-center justify-center gap-2"
              >
                <span>Confirmar y acceder</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </form>

            <div class="flex items-center justify-between text-xs text-brand-1/60 pt-1">
              <button type="button" id="btn-resend-code" class="text-brand-2 hover:text-brand-3 transition-colors font-medium underline underline-offset-4">
                Reenviar nuevo código
              </button>
              <button type="button" id="btn-back-to-login" class="hover:text-brand-1 transition-colors">
                Volver a inicio
              </button>
            </div>
          </div>

          <!-- ─── Panel 4: Mi Cuenta / Estado Autenticado ("Siguiente pestaña") ─── -->
          <div id="panel-account" role="tabpanel" class="hidden flex-col gap-4 font-body">
            <!-- User Profile Summary Box -->
            <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full bg-brand-4/30 border border-brand-4/40 flex items-center justify-center font-display font-bold text-brand-2 text-sm">
                    <span id="account-avatar-initial">U</span>
                  </div>
                  <div class="flex flex-col">
                    <span id="account-user-name" class="font-bold text-sm text-white">Usuario</span>
                    <span id="account-user-email" class="text-xs text-brand-1/60">correo@ejemplo.com</span>
                  </div>
                </div>
                <div id="account-verified-badge" class="px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verificado
                </div>
              </div>

              <!-- Pending verification alert banner if not verified yet -->
              <div id="account-unverified-warning" class="hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex flex-col gap-2">
                <span>Tu correo aun no ha sido verificado.</span>
                <button
                  id="btn-goto-verify-from-account"
                  type="button"
                  class="self-start text-[0.72rem] font-bold text-amber-300 underline underline-offset-4 hover:text-white"
                >
                  Ingresar código de verificación ahora
                </button>
              </div>
            </div>

            <!-- Exclusive Member Services / Perks -->
            <div class="flex flex-col gap-2">
              <span class="text-[0.7rem] uppercase text-brand-1/60 font-bold tracking-widest">
                Beneficios de comensal activo
              </span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-1">
                  <span class="font-bold text-brand-2">Seguridad</span>
                  <span class="text-[0.72rem] text-brand-1/60">Tus datos están seguros en nuestro sitio.</span>
                </div>
                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-1">
                  <span class="font-bold text-brand-2">Favoritos 3D</span>
                  <span class="text-[0.72rem] text-brand-1/60">Guarda platillos y personaliza recetas.</span>
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col gap-2 pt-2">
              <button
                id="btn-close-account"
                type="button"
                class="minimal-btn w-full rounded-full border-brand-4 bg-brand-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-brand-4/25 hover:border-brand-3 hover:bg-brand-3 flex items-center justify-center gap-2"
              >
                <span>Continuar explorando Foodlink</span>
              </button>
              <button
                id="btn-logout"
                type="button"
                class="w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-1/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // DOM Elements
  const modal = document.getElementById('login-modal');
  const dialog = document.getElementById('login-dialog');
  const closeButton = document.getElementById('close-login-btn');
  const openButtons = [
    document.getElementById('open-login-btn'),
    document.getElementById('open-login-mobile-btn')
  ].filter((btn): btn is HTMLElement => btn !== null);

  const authTabsBar = document.getElementById('auth-tabs-bar');
  const tabLogin = document.getElementById('tab-login') as HTMLButtonElement | null;
  const tabRegister = document.getElementById('tab-register') as HTMLButtonElement | null;
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');
  const panelVerify = document.getElementById('panel-verify');
  const panelAccount = document.getElementById('panel-account');

  const authTitle = document.getElementById('auth-modal-title');
  const authDesc = document.getElementById('auth-modal-desc');
  const authFeedback = document.getElementById('auth-feedback');

  const formLogin = document.getElementById('form-login') as HTMLFormElement | null;
  const formRegister = document.getElementById('form-register') as HTMLFormElement | null;
  const formVerify = document.getElementById('form-verify') as HTMLFormElement | null;

  const btnSubmitLogin = document.getElementById('btn-submit-login') as HTMLButtonElement | null;
  const btnSubmitRegister = document.getElementById('btn-submit-register') as HTMLButtonElement | null;
  const btnSubmitVerify = document.getElementById('btn-submit-verify') as HTMLButtonElement | null;

  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const btnResendCode = document.getElementById('btn-resend-code');
  const btnBackToLogin = document.getElementById('btn-back-to-login');
  const btnCloseAccount = document.getElementById('btn-close-account');
  const btnLogout = document.getElementById('btn-logout');
  const btnGotoVerifyFromAccount = document.getElementById('btn-goto-verify-from-account');

  const verifyTargetEmail = document.getElementById('verify-target-email');
  const verifyCodeInput = document.getElementById('verify-code-input') as HTMLInputElement | null;

  const loginEmailInput = document.getElementById('login-email') as HTMLInputElement | null;
  const registerNameInput = document.getElementById('register-name') as HTMLInputElement | null;

  const accountAvatarInitial = document.getElementById('account-avatar-initial');
  const accountUserName = document.getElementById('account-user-name');
  const accountUserEmail = document.getElementById('account-user-email');
  const accountVerifiedBadge = document.getElementById('account-verified-badge');
  const accountUnverifiedWarning = document.getElementById('account-unverified-warning');

  let pendingEmail = '';
  let previouslyFocused: HTMLElement | null = null;
  let closeTimer = 0;

  if (!modal || !dialog) return;

  const showFeedback = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    if (!authFeedback) return;
    authFeedback.textContent = message;
    authFeedback.className = 'rounded-2xl border p-3 text-center font-body text-xs z-10 transition-all';

    if (type === 'error') {
      authFeedback.classList.add('border-red-500/40', 'bg-red-500/10', 'text-red-200');
    } else if (type === 'success') {
      authFeedback.classList.add('border-emerald-500/40', 'bg-emerald-500/10', 'text-emerald-200');
    } else {
      authFeedback.classList.add('border-brand-2/30', 'bg-brand-2/10', 'text-brand-1');
    }
    authFeedback.classList.remove('hidden');
  };

  const hideFeedback = () => {
    if (authFeedback) authFeedback.classList.add('hidden');
  };

  // Switch between tabs / panels
  const setTab = (activeTab: ModalTab) => {
    hideFeedback();

    // Hide all panels first
    panelLogin?.classList.add('hidden');
    panelRegister?.classList.add('hidden');
    panelVerify?.classList.add('hidden');
    panelAccount?.classList.add('hidden');
    authDesc?.classList.remove('hidden');

    if (activeTab === 'login') {
      authTabsBar?.classList.remove('hidden');
      tabLogin?.classList.add('bg-brand-4', 'text-white', 'shadow-md', 'shadow-brand-4/30');
      tabLogin?.classList.remove('text-brand-1/60');
      tabLogin?.setAttribute('aria-selected', 'true');

      tabRegister?.classList.remove('bg-brand-4', 'text-white', 'shadow-md', 'shadow-brand-4/30');
      tabRegister?.classList.add('text-brand-1/60');
      tabRegister?.setAttribute('aria-selected', 'false');

      if (authTitle) authTitle.innerHTML = 'Bienvenido<span class="text-brand-3">.</span>';
      if (authDesc) authDesc.textContent = 'Accede a tu cuenta de Foodlink para disfrutar beneficios de comensal.';

      panelLogin?.classList.remove('hidden');
      loginEmailInput?.focus();
    } else if (activeTab === 'register') {
      authTabsBar?.classList.remove('hidden');
      tabRegister?.classList.add('bg-brand-4', 'text-white', 'shadow-md', 'shadow-brand-4/30');
      tabRegister?.classList.remove('text-brand-1/60');
      tabRegister?.setAttribute('aria-selected', 'true');

      tabLogin?.classList.remove('bg-brand-4', 'text-white', 'shadow-md', 'shadow-brand-4/30');
      tabLogin?.classList.add('text-brand-1/60');
      tabLogin?.setAttribute('aria-selected', 'false');

      if (authTitle) authTitle.innerHTML = 'Registro<span class="text-brand-3">.</span>';
      if (authDesc) authDesc.textContent = 'Crea tu cuenta de comensal para guardar favoritos y pedidos.';

      panelRegister?.classList.remove('hidden');
      registerNameInput?.focus();
    } else if (activeTab === 'verify') {
      authTabsBar?.classList.add('hidden');
      if (authTitle) authTitle.innerHTML = 'Verificación<span class="text-brand-3">.</span>';
      if (authDesc) authDesc.textContent = 'Ingresa el código para confirmar tu cuenta y acceder.';

      if (verifyTargetEmail) verifyTargetEmail.textContent = pendingEmail;
      panelVerify?.classList.remove('hidden');
      verifyCodeInput?.focus();
    } else if (activeTab === 'account') {
      authTabsBar?.classList.add('hidden');
      const currentUser = getStoredUser();

      if (authTitle) authTitle.innerHTML = 'Mi Cuenta<span class="text-brand-3">.</span>';
      if (authDesc) {
        authDesc.textContent = '';
        authDesc.classList.add('hidden');
      }

      if (currentUser) {
        if (accountUserName) accountUserName.textContent = currentUser.name;
        if (accountUserEmail) accountUserEmail.textContent = currentUser.email;
        if (accountAvatarInitial) accountAvatarInitial.textContent = currentUser.name.charAt(0).toUpperCase();

        if (currentUser.is_verified) {
          accountVerifiedBadge?.classList.remove('hidden');
          accountUnverifiedWarning?.classList.add('hidden');
        } else {
          accountVerifiedBadge?.classList.add('hidden');
          accountUnverifiedWarning?.classList.remove('hidden');
        }
      }

      panelAccount?.classList.remove('hidden');
    }
  };

  tabLogin?.addEventListener('click', () => setTab('login'));
  tabRegister?.addEventListener('click', () => setTab('register'));
  switchToRegister?.addEventListener('click', () => setTab('register'));
  switchToLogin?.addEventListener('click', () => setTab('login'));
  btnBackToLogin?.addEventListener('click', () => setTab('login'));
  btnGotoVerifyFromAccount?.addEventListener('click', () => {
    const user = getStoredUser();
    if (user) {
      pendingEmail = user.email;
      setTab('verify');
    }
  });

  // Toggle password visibility
  dialog.querySelectorAll<HTMLButtonElement>('.toggle-password-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      const input = document.getElementById(targetId) as HTMLInputElement | null;
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      eyeOpen?.classList.toggle('hidden', isPassword);
      eyeClosed?.classList.toggle('hidden', !isPassword);
    });
  });

  // Open / Close modal
  const openModal = (trigger: HTMLElement) => {
    window.clearTimeout(closeTimer);
    previouslyFocused = trigger.id === 'open-login-mobile-btn'
      ? document.getElementById('mobile-menu-btn')
      : trigger;

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    const currentUser = getStoredUser();
    if (currentUser) {
      setTab('account');
    } else {
      setTab('login');
    }

    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      modal.classList.add('opacity-100');
      dialog.classList.remove('scale-95', 'opacity-0');
      dialog.classList.add('scale-100', 'opacity-100');
    });
  };

  const closeModal = () => {
    window.clearTimeout(closeTimer);
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    dialog.classList.remove('scale-100', 'opacity-100');
    dialog.classList.add('scale-95', 'opacity-0');

    closeTimer = window.setTimeout(() => {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      hideFeedback();
      previouslyFocused?.focus();
    }, 280);
  };

  openButtons.forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn));
  });

  closeButton?.addEventListener('click', closeModal);
  btnCloseAccount?.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Logout handler
  btnLogout?.addEventListener('click', () => {
    clearStoredUser();
    showFeedback('Has cerrado sesión correctamente.', 'info');
    setTimeout(() => {
      setTab('login');
    }, 600);
  });

  // Form: Registro
  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const formData = new FormData(formRegister);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');

    if (!name || !email || !password) {
      showFeedback('Por favor completa todos los campos requeridos.', 'error');
      return;
    }

    if (password.length < 8) {
      showFeedback('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    if (btnSubmitRegister) {
      btnSubmitRegister.disabled = true;
      btnSubmitRegister.classList.add('opacity-70');
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showFeedback(data.message || 'Error al registrar usuario en la base de datos.', 'error');
        return;
      }

      pendingEmail = email;
      const verificationCode = data.verificationCode;

      // Disparar envio de correo mediante EmailJS
      await sendVerificationEmail(email, name, verificationCode);

      formRegister.reset();
      setTab('verify');
      showFeedback('Usuario registrado exitosamente. Por favor verifica tu código.', 'success');
    } catch (err: any) {
      console.error(err);
      showFeedback('Error de comunicación con el servidor: ' + (err.message || 'Sin respuesta'), 'error');
    } finally {
      if (btnSubmitRegister) {
        btnSubmitRegister.disabled = false;
        btnSubmitRegister.classList.remove('opacity-70');
      }
    }
  });

  // Form: Iniciar Sesión
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const formData = new FormData(formLogin);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      showFeedback('Ingresa tu correo y contraseña.', 'error');
      return;
    }

    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = true;
      btnSubmitLogin.classList.add('opacity-70');
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showFeedback(data.message || 'Credenciales incorrectas.', 'error');
        return;
      }

      const user: AuthUser = data.user;
      setStoredUser(user);

      formLogin.reset();
      showFeedback('Inicio de sesión exitoso. Bienvenido a Foodlink.', 'success');

      setTimeout(() => {
        setTab('account');
      }, 500);
    } catch (err: any) {
      console.error(err);
      showFeedback('Error de comunicación con el servidor: ' + (err.message || 'Sin respuesta'), 'error');
    } finally {
      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.classList.remove('opacity-70');
      }
    }
  });

  // Form: Confirmar Código de Verificación
  formVerify?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const code = verifyCodeInput?.value.trim() || '';
    if (!code || code.length !== 6) {
      showFeedback('Ingresa el código numérico de 6 dígitos.', 'error');
      return;
    }

    if (btnSubmitVerify) {
      btnSubmitVerify.disabled = true;
      btnSubmitVerify.classList.add('opacity-70');
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showFeedback(data.message || 'Código incorrecto.', 'error');
        return;
      }

      const user: AuthUser = data.user;
      setStoredUser(user);

      formVerify.reset();
      showFeedback('Cuenta verificada exitosamente. Accediendo a tu perfil...', 'success');

      setTimeout(() => {
        setTab('account');
      }, 700);
    } catch (err: any) {
      console.error(err);
      showFeedback('Error de comunicación al verificar código: ' + (err.message || 'Sin respuesta'), 'error');
    } finally {
      if (btnSubmitVerify) {
        btnSubmitVerify.disabled = false;
        btnSubmitVerify.classList.remove('opacity-70');
      }
    }
  });

  // Reenviar Código
  btnResendCode?.addEventListener('click', async () => {
    if (!pendingEmail) {
      showFeedback('No hay un correo seleccionado para reenvío.', 'error');
      return;
    }

    try {
      btnResendCode.setAttribute('disabled', 'true');
      btnResendCode.classList.add('opacity-50');

      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showFeedback(data.message || 'No se pudo generar nuevo código.', 'error');
        return;
      }

      const newCode = data.verificationCode;
      await sendVerificationEmail(pendingEmail, 'Comensal', newCode);

      showFeedback('Nuevo código de verificación generado y enviado a tu correo.', 'success');
    } catch (err: any) {
      console.error(err);
      showFeedback('Error al solicitar reenvío de código.', 'error');
    } finally {
      btnResendCode.removeAttribute('disabled');
      btnResendCode.classList.remove('opacity-50');
    }
  });

  // Keep modal in sync with any external auth changes
  onAuthChange((user) => {
    if (!modal.classList.contains('hidden')) {
      if (user) {
        setTab('account');
      } else {
        setTab('login');
      }
    }
  });
}
