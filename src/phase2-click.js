document.addEventListener('click', event => {
  const card = event.target.closest?.('.media-card');
  if (!card) return;
  card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
});

const updateLabels = () => document.querySelectorAll('.media-card small').forEach(label => {
  label.textContent = 'Click to add to timeline';
});
new MutationObserver(updateLabels).observe(document.documentElement, { childList: true, subtree: true });
updateLabels();
