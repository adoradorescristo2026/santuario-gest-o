(() => {
  'use strict';

  const onlyDigits = value => String(value || '').replace(/\D/g, '');

  function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (digits.length <= 6) return `(${ddd}) ${rest}`;
    if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }

  function formatCep(value) {
    const digits = onlyDigits(value).slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  }

  function isValidDateParts(day, month, year) {
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function isoToBr(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
  }

  function brToIso(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
    return isValidDateParts(day, month, year) ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }

  function formatDate(value) {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function enhancePhone(input) {
    if (input.dataset.fieldFormatEnhanced) return;
    input.dataset.fieldFormatEnhanced = 'phone';
    input.type = 'tel';
    input.inputMode = 'numeric';
    input.autocomplete = /whatsapp|celular/i.test(input.name) ? 'tel' : (input.autocomplete || 'tel');
    input.maxLength = 15;
    input.placeholder = input.placeholder || '(00) 00000-0000';
    input.classList.add('formatted-field', 'phone-br-input');
    input.value = formatPhone(input.value);
    const validate = (strict = false) => {
      const count = onlyDigits(input.value).length;
      input.setCustomValidity(!count ? '' : (count === 10 || count === 11 ? '' : (strict ? 'Informe um telefone com DDD.' : '')));
    };
    input.addEventListener('input', () => { input.value = formatPhone(input.value); validate(false); });
    input.addEventListener('blur', () => validate(true));
  }

  function enhanceCep(input) {
    if (input.dataset.fieldFormatEnhanced) return;
    input.dataset.fieldFormatEnhanced = 'cep';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'postal-code';
    input.maxLength = 9;
    input.placeholder = input.placeholder || '00000-000';
    input.classList.add('formatted-field', 'cep-br-input');
    input.value = formatCep(input.value);
    const validate = (strict = false) => {
      const count = onlyDigits(input.value).length;
      input.setCustomValidity(!count ? '' : (count === 8 ? '' : (strict ? 'Informe um CEP com 8 números.' : '')));
    };
    input.addEventListener('input', () => { input.value = formatCep(input.value); validate(false); });
    input.addEventListener('blur', () => validate(true));
  }

  function enhanceEmail(input) {
    if (input.dataset.fieldFormatEnhanced) return;
    input.dataset.fieldFormatEnhanced = 'email';
    input.type = 'email';
    input.inputMode = 'email';
    input.autocomplete = input.autocomplete || 'email';
    input.spellcheck = false;
    input.autocapitalize = 'none';
    input.placeholder = input.placeholder || 'nome@exemplo.com';
    input.classList.add('formatted-field', 'email-br-input');
    const normalize = () => { input.value = String(input.value || '').replace(/\s+/g, '').toLowerCase(); };
    input.addEventListener('input', normalize);
    input.addEventListener('blur', normalize);
  }

  function enhanceDate(input) {
    if (input.dataset.fieldFormatEnhanced) return;
    const originalName = input.name;
    if (!originalName) return;
    input.dataset.fieldFormatEnhanced = 'date';
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = originalName;
    hidden.value = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : brToIso(input.value);
    input.removeAttribute('name');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = /birth|nascimento/i.test(originalName) ? 'bday' : 'off';
    input.maxLength = 10;
    input.placeholder = 'DD/MM/AAAA';
    input.classList.add('formatted-field', 'date-br-input');
    input.value = isoToBr(hidden.value);
    input.insertAdjacentElement('afterend', hidden);
    const sync = (strict = false) => {
      input.value = formatDate(input.value);
      const iso = brToIso(input.value);
      hidden.value = iso;
      const incomplete = input.value && input.value.length !== 10;
      input.setCustomValidity(!input.value ? '' : (iso ? '' : ((strict || !incomplete) ? 'Informe uma data válida no formato DD/MM/AAAA.' : '')));
    };
    input.addEventListener('input', () => sync(false));
    input.addEventListener('blur', () => sync(true));
    sync(false);
  }

  function enhanceNativeDateTime(input) {
    if (input.dataset.fieldFormatEnhanced) return;
    input.dataset.fieldFormatEnhanced = 'datetime';
    input.lang = 'pt-BR';
    input.classList.add('formatted-field', 'datetime-br-input');
    input.title = input.type === 'datetime-local' ? 'Data e hora no formato brasileiro' : 'Horário';
  }

  function classify(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.fieldFormatEnhanced) return '';
    const name = String(input.name || '').toLowerCase();
    const type = String(input.type || '').toLowerCase();
    if (type === 'date') return 'date';
    if (type === 'datetime-local' || type === 'time') return 'datetime';
    if (type === 'email' || name === 'email' || /(^|_)(email|e_mail)$/.test(name)) return 'email';
    if (/cep|postal/.test(name)) return 'cep';
    if (type === 'tel' || /(^|_)(phone|telefone|celular|whatsapp|contact|contato)$/.test(name)) return 'phone';
    return '';
  }

  function enhance(root = document) {
    const inputs = root.matches?.('input') ? [root] : [...root.querySelectorAll?.('input') || []];
    inputs.forEach(input => {
      const kind = classify(input);
      if (kind === 'phone') enhancePhone(input);
      else if (kind === 'cep') enhanceCep(input);
      else if (kind === 'email') enhanceEmail(input);
      else if (kind === 'date') enhanceDate(input);
      else if (kind === 'datetime') enhanceNativeDateTime(input);
    });
  }

  document.documentElement.lang = 'pt-BR';
  document.addEventListener('DOMContentLoaded', () => enhance(document));
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) enhance(node);
  })));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.SantuarioFields = { enhance, formatPhone, formatCep, formatDate, isoToBr, brToIso };
})();
