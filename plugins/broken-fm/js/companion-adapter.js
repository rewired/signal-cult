const COMPANION_RUNTIME_SELECTOR = 'meta[name="broken-fm-runtime"][content="companion"]';

export function isCompanionRuntime(root = document) {
  return Boolean(root.querySelector(COMPANION_RUNTIME_SELECTOR));
}

export async function initializeCompanion(callbacks) {
  // The Tauri bridge alone is not a reliable mode signal: browser wrappers and
  // development tooling can expose compatible globals. Only the Tauri-staged
  // frontend carries the explicit runtime marker.
  if (!isCompanionRuntime()) return;
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) return;
  const context = await invoke('host_exchange_context');
  if (!context?.active) return;
  callbacks.applyPresetText(context.preset);
  if (context.preview_data_url) {
    const preview = new Image();
    preview.src = context.preview_data_url;
    await preview.decode();
    callbacks.applyPreview(preview);
  }
  const bar = document.querySelector('#host-session');
  bar.hidden = false;
  for (const selector of ['#carrier-shape option[value="audio"]', '#wavetable option[value="custom"]']) {
    const option = document.querySelector(selector);
    if (option) option.disabled = true;
  }
  document.querySelectorAll('[id^="audio-source-"] option').forEach((option) => {
    if (['level', 'low', 'mid', 'high', 'transient'].includes(option.value)) option.disabled = true;
  });
  const unavailableDestinations = new Set(['feedback', 'feedback-displacement', 'feedback-displacement-angle', 'phosphor-persistence', 'feedback-phase']);
  document.querySelectorAll('[id^="audio-destination-"] option').forEach((option) => {
    if (unavailableDestinations.has(option.value)) option.disabled = true;
  });
  for (const id of ['audio-attack', 'audio-release', 'feedback-amount', 'feedback-decay', 'feedback-displacement',
    'feedback-displacement-angle', 'feedback-phase', 'feedback-window', 'feedback-injection', 'feedback-model', 'phosphor-persistence']) {
    const control = document.querySelector(`#${id}`);
    if (control) { control.disabled = true; control.closest('label')?.classList.add('inactive'); }
  }
  document.querySelector('#host-apply').addEventListener('click', async () => {
    await invoke('host_exchange_apply', { preset: callbacks.currentPresetText() });
  });
  document.querySelector('#host-cancel').addEventListener('click', async () => {
    await invoke('host_exchange_cancel');
  });
}
