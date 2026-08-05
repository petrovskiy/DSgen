import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'node_modules', '@tabler', 'icons', 'icons');
const OUT = join(__dirname, 'icons');
const ICON_STROKE =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const OUTLINE = [
  'arrow-back-up',
  'arrow-left',
  'arrow-right',
  'arrows-shuffle',
  'blocks',
  'book',
  'border-corners',
  'box',
  'brand-flutter',
  'brand-github',
  'brand-html5',
  'brand-swift',
  'check',
  'chevron-down',
  'chevron-right',
  'chevron-up',
  'circle',
  'circle-check',
  'circle-x',
  'cloud-download',
  'copy',
  'device-floppy',
  'devices',
  'dots-vertical',
  'download',
  'edit',
  'external-link',
  'eye',
  'file',
  'file-code',
  'file-download',
  'file-text',
  'file-zip',
  'folder',
  'folder-open',
  'grid-dots',
  'history',
  'info-circle',
  'layout-grid',
  'letter-spacing',
  'line-height',
  'link',
  'minus',
  'palette',
  'pencil',
  'plus',
  'refresh',
  'robot',
  'ruler',
  'search',
  'settings',
  'shadow',
  'spacing-vertical',
  'sparkles',
  'square',
  'stack-2',
  'sun',
  'template',
  'text-caption',
  'trash',
  'typography',
  'wand',
  'world',
  'x',
];

const FILLED = ['circle', 'circle-check', 'check', 'square', 'square-check', 'star', 'x'];

function read(path) {
  return readFileSync(path, 'utf8');
}

function innerBody(svg) {
  return svg
    .replace(/^[\s\S]*?>/, '') // до первого '>' (открывающий тег svg)
    .replace(/<\/svg>\s*$/, '');
}

function buildSprite(entries, variant, extraAttrs) {
  const symbols = entries.map((name) => {
    const body = innerBody(read(join(SRC, variant, `${name}.svg`)));
    return `  <symbol id="tabler-${name}" viewBox="0 0 24 24" ${extraAttrs}>${body}</symbol>`;
  });
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">',
    ...symbols,
    '</svg>',
  ].join('\n');
}

const outlineSprite = buildSprite(OUTLINE, 'outline', ICON_STROKE);
const filledSprite = buildSprite(FILLED, 'filled', 'fill="currentColor"');
const spriteSvg = `<!-- Спрайт Tabler Icons (MIT) — генерируется: npm run icons -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${outlineSprite}
${filledSprite}
</svg>
`;

mkdirSync(join(OUT, 'outline'), { recursive: true });
mkdirSync(join(OUT, 'filled'), { recursive: true });

for (const name of OUTLINE) {
  copyFileSync(join(SRC, 'outline', `${name}.svg`), join(OUT, 'outline', `${name}.svg`));
}
for (const name of FILLED) {
  copyFileSync(join(SRC, 'filled', `${name}.svg`), join(OUT, 'filled', `${name}.svg`));
}

writeFileSync(join(OUT, 'sprite.svg'), spriteSvg.trim() + '\n');

writeFileSync(
  join(OUT, 'sprite.js'),
  `/* Спрайт Tabler Icons (MIT). Подключается один раз, иконки доступны во всех HTML-страницах:
   <svg class="icon" aria-hidden="true"><use href="#tabler-{имя}"></use></svg> */
(function () {
  if (document.getElementById('tabler-icons-sprite')) return;
  var div = document.createElement('div');
  div.id = 'tabler-icons-sprite';
  div.style.display = 'none';
  div.innerHTML = ${JSON.stringify(spriteSvg)};
  document.body.insertBefore(div, document.body.firstChild);
})();
`,
);

console.log(
  `Готово: ${OUTLINE.length} outline + ${FILLED.length} filled иконок в ${OUT}\\outline и ${OUT}\\filled, спрайт sprite.svg / sprite.js`,
);
