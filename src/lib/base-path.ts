const normalizedBase = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!normalizedBase) {
    return normalizedPath;
  }

  if (normalizedPath === '/') {
    return `${normalizedBase}/`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export function stripBasePath(pathname: string) {
  if (!normalizedBase || !pathname.startsWith(normalizedBase)) {
    return pathname;
  }

  return pathname.slice(normalizedBase.length) || '/';
}
