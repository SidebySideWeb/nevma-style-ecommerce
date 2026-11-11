/** Care side-nav + contact topic chips. */
for (const el of document.querySelectorAll<HTMLElement>('[data-block="care"] [data-href]')) {
  el.addEventListener('click', () => {
    const href = el.getAttribute('data-href');
    if (href) location.assign(href);
  });
}

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
if (form) {
  const input = form.querySelector<HTMLInputElement>('[data-topic-input]');
  const chips = form.querySelectorAll<HTMLButtonElement>('[data-topic]');
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const topic = chip.getAttribute('data-topic') || '';
      if (input) input.value = topic;
      for (const c of chips) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      }
    });
  }
}

export {};

