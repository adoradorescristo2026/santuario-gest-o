(() => {
  'use strict';

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function parse(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').trim();
    if (!text) return 0;

    const negative = text.includes('-');
    text = text.replace(/[^0-9,.-]/g, '');

    let numeric;
    if (text.includes(',')) {
      numeric = Number(text.replace(/\./g, '').replace(',', '.'));
    } else {
      const dots = (text.match(/\./g) || []).length;
      numeric = Number(dots > 1 ? text.replace(/\./g, '') : text);
    }

    if (!Number.isFinite(numeric)) return 0;
    return negative ? -Math.abs(numeric) : numeric;
  }

  function format(value) {
    return formatter.format(parse(value));
  }

  function amountFromTypedDigits(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits ? Number(digits) / 100 : 0;
  }

  function moveCaretToEnd(input) {
    requestAnimationFrame(() => {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (_) {}
    });
  }

  function validate(input, amount) {
    if (!input?.setCustomValidity || input.disabled || input.readOnly) return;
    const minAttr = input.getAttribute('min');
    const maxAttr = input.getAttribute('max');
    const min = minAttr === null || minAttr === '' ? null : Number(minAttr);
    const max = maxAttr === null || maxAttr === '' ? null : Number(maxAttr);
    if (Number.isFinite(min) && amount < min) {
      input.setCustomValidity(`Informe um valor igual ou maior que ${format(min)}.`);
      return;
    }
    if (Number.isFinite(max) && amount > max) {
      input.setCustomValidity(`Informe um valor igual ou menor que ${format(max)}.`);
      return;
    }
    input.setCustomValidity('');
  }

  function setValue(input, value) {
    if (!input) return;
    const amount = parse(value);
    input.value = format(amount);
    input.dataset.currencyRaw = amount.toFixed(2);
    validate(input, amount);
  }

  function initializeInput(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.currencyReady === 'true') return;

    input.dataset.currencyReady = 'true';
    input.dataset.currency = 'brl';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.classList.add('currency-brl-input');
    setValue(input, input.value);
  }

  function install(root = document) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('input[data-currency], input[type="number"][step="0.01"]').forEach(initializeInput);
  }

  document.addEventListener('input', event => {
    const input = event.target.closest?.('input[data-currency="brl"]');
    if (!input) return;
    const amount = amountFromTypedDigits(input.value);
    setValue(input, amount);
    moveCaretToEnd(input);
  }, true);

  document.addEventListener('focusin', event => {
    const input = event.target.closest?.('input[data-currency="brl"]');
    if (input) moveCaretToEnd(input);
  });

  document.addEventListener('click', event => {
    const input = event.target.closest?.('input[data-currency="brl"]');
    if (input) moveCaretToEnd(input);
  });

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches?.('input[data-currency], input[type="number"][step="0.01"]')) initializeInput(node);
      install(node);
    }));
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      install(document);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }, { once: true });
  } else {
    install(document);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.CurrencyBRL = { parse, format, setValue, install };
})();
