import { newsroomConfig } from '../data/newsroom-config.js';

// Public brand navigation only; login stays in the existing LIFF application.
document.querySelectorAll('[data-line-path]').forEach(link => {
  const path = link.dataset.linePath;
  link.href = `https://liff.line.me/${newsroomConfig.liffId}/${path}`;
});
