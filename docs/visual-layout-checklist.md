# Verificación visual de layouts públicos

Validar en viewport móvil (375px) y escritorio (1440px), para menú y catálogo:

- Estados de carga, error y menú vacío.
- Carrito: agregar producto, minimizar, restaurar y confirmar modalidad disponible.
- `layout-minimal`: lectura lineal y lista de productos.
- `layout-natural`: navegación lateral y cards de dos columnas.
- `layout-warm`: destacados horizontales y composición promocional.
- `layout-elegant`: encabezado centrado y composición editorial.
- Cada theme: contraste de texto, superficie, borde y acción primaria sin cambiar la jerarquía o navegación del layout.

Los layouts reciben el mismo `StoreContentModel` normalizado desde `src/lib/store-content.ts`; los themes solo inyectan tokens de color/contraste desde `ThemeFrame`.
