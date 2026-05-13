// Contact — copy-to-clipboard email chip with a 1.6s "✓ copied"
// confirmation. Right-click on the chip also copies.

const COPIED_MS = 1600;

export function initContact() {
  const chip = document.querySelector('.contact .email');
  const copyBadge = chip?.querySelector('.copy');
  if (!chip || !copyBadge) return () => {};

  const original = copyBadge.textContent;
  let timer = 0;
  const email = chip.getAttribute('data-email') || '';

  const copy = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard?.writeText(email);
    } catch {
      // ignore — clipboard may be blocked in some contexts
    }
    copyBadge.textContent = '✓ copied';
    clearTimeout(timer);
    timer = setTimeout(() => {
      copyBadge.textContent = original;
    }, COPIED_MS);
  };

  copyBadge.addEventListener('click', copy);
  chip.addEventListener('contextmenu', copy);

  return () => {
    clearTimeout(timer);
    copyBadge.removeEventListener('click', copy);
    chip.removeEventListener('contextmenu', copy);
  };
}
