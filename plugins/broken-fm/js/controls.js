export function snapToStep(rawValue, min, max, snapStep) {
  const clamped = Math.min(max, Math.max(min, rawValue));
  const snapped = Math.round(clamped / snapStep) * snapStep;
  const precision = Math.max(0, (String(snapStep).split('.')[1] || '').length);
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(precision));
}

export function enableCtrlDragSnapping(input) {
  const snapStep = Number(input.dataset.snapStep);
  if (!Number.isFinite(snapStep) || snapStep <= 0) return;

  input.addEventListener('pointerdown', (event) => {
    if (!event.ctrlKey || event.button !== 0) return;
    event.preventDefault();
    input.setPointerCapture(event.pointerId);

    const update = (pointerEvent) => {
      const rect = input.getBoundingClientRect();
      const normalized = Math.min(1, Math.max(0, (pointerEvent.clientX - rect.left) / rect.width));
      const min = Number(input.min);
      const max = Number(input.max);
      const rawValue = min + normalized * (max - min);
      input.value = String(snapToStep(rawValue, min, max, snapStep));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const finish = (pointerEvent) => {
      update(pointerEvent);
      input.releasePointerCapture(pointerEvent.pointerId);
      input.removeEventListener('pointermove', update);
      input.removeEventListener('pointerup', finish);
      input.removeEventListener('pointercancel', finish);
    };

    input.addEventListener('pointermove', update);
    input.addEventListener('pointerup', finish);
    input.addEventListener('pointercancel', finish);
    update(event);
  });
}
