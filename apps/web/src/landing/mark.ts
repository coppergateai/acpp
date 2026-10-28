/** Geometric ACPP mark — hexagon + signed identity node. Works on dark and light. */

export function renderMark(options?: {
  size?: number;
  className?: string;
  title?: string;
}): string {
  const size = options?.size ?? 28;
  const className = options?.className ? ` class="${options.className}"` : "";
  const title = options?.title ?? "ACPP";
  return `<svg${className} width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
  <title>${title}</title>
  <path class="acpp-mark-fill" d="M16 1.5 28.5 8.5v15L16 30.5 3.5 23.5v-15L16 1.5Z"/>
  <path class="acpp-mark-stroke" stroke-width="1.5" d="M16 1.5 28.5 8.5v15L16 30.5 3.5 23.5v-15L16 1.5Z"/>
  <path class="acpp-mark-stroke" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M11 16.5c0-3 2.1-5 5-5s5 2 5 5c0 2.2-1.2 3.8-3.2 4.5L16 23l-1.8-2c-2-.7-3.2-2.3-3.2-4.5Z"/>
  <circle class="acpp-mark-node" cx="16" cy="16.2" r="1.6"/>
</svg>`;
}

export function renderWordmark(options?: { size?: number; className?: string }): string {
  const size = options?.size ?? 28;
  const className = options?.className ? ` class="${options.className}"` : ' class="brand"';
  return `<a href="/"${className} aria-label="ACPP home">
    ${renderMark({ size })}
    <span class="brand-word">ACPP</span>
  </a>`;
}
