/**
 * GPU capability detector and hardware tier classifier.
 * Zero emojis strictly enforced.
 */

export type HardwareTier = 'raytracing' | 'standard' | 'performance';

export interface HardwareInfo {
    tier: HardwareTier;
    gpuName: string;
    isRTX: boolean;
    isLowEnd: boolean;
}

export function detectGPUCapabilities(): HardwareInfo {
    let tier: HardwareTier = 'standard';
    let gpuName = 'Acelerador Grafico';
    let isRTX = false;
    let isLowEnd = false;

    try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ||
            canvas.getContext('webgl')) as WebGLRenderingContext | null;

        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'GPU Generica';
            }
        }

        const nameLower = gpuName.toLowerCase();

        if (
            /rtx|geforce rtx|quadro rtx|titan rtx/i.test(nameLower) ||
            /radeon rx (6[6-9]|7[0-9]|8[0-9])/i.test(nameLower) ||
            /apple m[1-4] (pro|max|ultra)/i.test(nameLower)
        ) {
            isRTX = true;
            tier = 'raytracing';
        } else if (
            /uhd|hd graphics|swiftshader|llvmpipe|softpipe|microsoft basic/i.test(nameLower) ||
            (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
        ) { 
            isLowEnd = true;
            tier = 'performance';
        } else {
            tier = 'standard';
        }
    } catch (e) {
        console.warn('GPU detection fallback:', e);
        tier = 'standard';
    }

    return { tier, gpuName, isRTX, isLowEnd };
}
