export function checkIsHighEndGPU(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return false;
    
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    
    const highEndPatterns = [
      /rtx/i,               // NVIDIA RTX series
      /gtx 980/i,           // Máscara de privacidad de Firefox para GPUs de alta gama
      /gtx 10[7-9]0/i,      // NVIDIA GTX 1070+
      /gtx 16[6-9]0/i,      // NVIDIA GTX 1660+
      /rx 6[6-9]00/i,       // AMD RX 6600+
      /rx 7[6-9]00/i,       // AMD RX 7600+
      /m[1-4] (pro|max|ultra)/i, // Apple Silicon Pro/Max/Ultra
      /apple a1[5-7] pro/i  // High-end Apple Mobile
    ];
    
    const isHighEnd = highEndPatterns.some(pattern => pattern.test(renderer));
    
    // Log for debugging / showing off
    console.log(`[GPU Detector] Hardware Detectado: "${renderer}"`);
    if (isHighEnd) {
      console.log(`[GPU Detector] Perfil: ULTRA ("Web RTX" Activado) 🚀`);
    } else {
      console.log(`[GPU Detector] Perfil: RENDIMIENTO (Pipeline Estándar) ⚡`);
    }
    
    return isHighEnd;
  } catch (e) {
    console.warn('[GPU Detector] Falló la detección, usando perfil de rendimiento.');
    return false;
  }
}
