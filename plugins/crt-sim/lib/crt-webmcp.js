import { presets, getBuiltInPreset } from './crt-params.js';
export function registerCRTTools(apply) {
    const context = document.modelContext;
    if (!context?.registerTool)
        return () => { };
    const lifecycle = new AbortController();
    try {
        void Promise.resolve(context.registerTool({
            name: 'apply_crt_preset', description: 'Apply one built-in CRT preset to the visible preview, including its mask type.',
            inputSchema: { type: 'object', properties: { name: { type: 'string', enum: Object.keys(presets) } }, required: ['name'], additionalProperties: false },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input) => { const value = input; if (typeof value?.name !== 'string' || !Object.hasOwn(presets, value.name))
                throw new Error('Unknown CRT preset'); apply(value.name); await new Promise(resolve => requestAnimationFrame(() => resolve())); return { preset: value.name, maskType: getBuiltInPreset(value.name).maskType }; },
        }, { signal: lifecycle.signal })).catch(() => { });
    }
    catch { /* Optional browser capability. */ }
    return () => lifecycle.abort();
}
