const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isValidPngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) return false;
  return buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

export function sanitizeSvgBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Archivo SVG vacío.');
  }

  let svg = buffer.toString('utf8').trim();
  if (!/<svg[\s>]/i.test(svg) || !/<\/svg>/i.test(svg)) {
    throw new Error('El archivo no contiene un elemento <svg> válido.');
  }

  // Strip XML declarations, DOCTYPE, and comments
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, '');
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');

  // Strip dangerous tags completely (paired and self-closing)
  const dangerousTags = [
    'script',
    'foreignObject',
    'iframe',
    'object',
    'embed',
    'applet',
    'meta',
    'link',
    'base',
    'audio',
    'video',
  ];
  for (const tag of dangerousTags) {
    const pairedRe = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    const singleRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    svg = svg.replace(pairedRe, '').replace(singleRe, '');
  }

  // Remove inline event handlers like onclick="..." or onload='...'
  svg = svg.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript:, vbscript:, data:text/html, or external http(s) hrefs
  svg = svg.replace(
    /\s+(?:xlink:)?href\s*=\s*(?:"\s*(?:javascript:|vbscript:|data:|https?:)[^"]*"|'\s*(?:javascript:|vbscript:|data:|https?:)[^']*')/gi,
    ''
  );

  // Remove url(http...) or url(javascript:...) inside style attributes
  svg = svg.replace(/url\(\s*['"]?\s*(?:javascript:|vbscript:|https?:)[^)]*\)/gi, 'none');

  // Extract strictly from <svg to </svg>
  const match = svg.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) {
    throw new Error('No se pudo sanitizar el archivo SVG.');
  }

  return Buffer.from(match[0], 'utf8');
}
