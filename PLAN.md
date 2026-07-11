# Menu Templates — Plan de Desarrollo

Plataforma multi-tienda construida sobre **Astro + React + Firebase + GitHub Pages** para vender menús, catálogos y control básico de pedidos a múltiples negocios. El objetivo inicial es mantenerse dentro de infraestructura gratuita: **GitHub Pages para despliegue estático** y **Firebase Spark** para Auth, Firestore y Storage.

El producto no es solo “un menú digital”. Es una base reutilizable para que restaurantes, emprendimientos de comida y tiendas puedan tener una presencia pública vendible, con plantillas reales según su enfoque, administración propia y herramientas operativas básicas.

---

## 0) Visión del producto

### Objetivo principal

Vender este sistema a múltiples tiendas para mejorar su atención, presentación y operación diaria mediante:

- Menús públicos por URL/QR.
- Catálogos visuales para productos físicos o emprendimientos de venta.
- Pedidos en tienda y pedidos a domicilio.
- Control básico de stock.
- Panel de administración por tienda.
- Varias plantillas visuales según tipo de negocio, ocasión o experiencia deseada.

### Tipos de negocio objetivo

| Tipo | Enfoque público | Ejemplos |
|---|---|---|
| Restaurante | Menú gastronómico | Pizzería, café, hamburguesería, bar |
| Emprendimiento de comida | Menú + pedidos por contacto | Postres, comidas rápidas, almuerzos |
| Emprendimiento de ventas | Catálogo de productos | Ropa, accesorios, detalles, regalos |

### Dos líneas funcionales del producto

| Línea | Función | Prioridad |
|---|---|---|
| Presentación pública | Menú o catálogo público por tienda | MVP |
| Operación interna | Pedidos, domicilios y stock | Post-MVP temprano |

---

## 1) Restricción clave: infraestructura gratuita

Este proyecto debe vivir inicialmente dentro de planes gratuitos. Esta restricción define la arquitectura, no es un detalle secundario.

### Stack de infraestructura

| Capa | Tecnología | Razón |
|---|---|---|
| Hosting | GitHub Pages | Despliegue estático gratuito |
| Framework | Astro | Excelente para sitios estáticos y performance |
| UI interactiva | React en islands/client components | Paneles, Auth, formularios y estados complejos |
| Auth | Firebase Auth | Email/password sin backend propio |
| Base de datos | Firestore | Multi-tenant simple desde cliente |
| Imágenes | Firebase Storage | Logos e imágenes de productos |
| Automatización | GitHub Actions | Deploy gratuito |

### Límites relevantes de Firebase Spark

| Recurso | Límite gratuito |
|---|---|
| Lecturas Firestore | 50.000 / día |
| Escrituras Firestore | 20.000 / día |
| Eliminaciones Firestore | 20.000 / día |
| Storage almacenado | 5 GB total |
| Storage descarga | 1 GB / día |
| Firebase Auth | Sin límite práctico para este MVP |

### Reglas obligatorias para no quemar el plan free

1. **Cachear datos públicos con `localStorage` + TTL.**
2. **No usar `onSnapshot` para datos estáticos** como tiendas, categorías, productos o plantillas.
3. **Reservar tiempo real solo para pedidos activos** si realmente aporta valor.
4. **Consultar por tienda y estado**, nunca leer colecciones completas sin filtro.
5. **Guardar URLs de Storage en Firestore**, no recalcular ni releer archivos.
6. **Invalidar cache por recurso**, no borrar todo el cache ante cualquier cambio.

TTL sugerido:

| Dato | TTL | Motivo |
|---|---:|---|
| Configuración de tienda | 1 hora | Cambia poco |
| Categorías | 1 hora | Cambian poco |
| Productos/items públicos | 30 min | Pueden cambiar por stock o disponibilidad |
| Templates disponibles | 2 horas | Casi estático |
| Pedidos activos admin | Sin cache o TTL corto | Operación diaria |

---

## 2) Conceptos de producto

### Tienda

Entidad principal del sistema. Una tienda puede ser restaurante, emprendimiento de comida o negocio de productos.

### Menú vs catálogo

| Concepto | Cuándo se usa | Qué muestra |
|---|---|---|
| Menú | Comida preparada o restaurante | Categorías, platos, precios, descripción, disponibilidad |
| Catálogo | Productos físicos o emprendimientos de venta | Productos, fotos, variantes, stock, precio |

La misma base técnica puede cubrir ambos, pero el lenguaje visual y la experiencia deben cambiar según el tipo de negocio.

### Templates vs themes

Esta distinción es IMPORTANTE:

- **Theme**: cambia colores, tipografía, bordes, sombras o modo oscuro.
- **Template**: cambia la estructura visual y la experiencia de navegación.

Ejemplos de templates reales:

| Plantilla / layout | Enfoque | Diferencia real |
|---|---|---|
| `layout-minimal` | Lectura directa | Menú limpio, rápido y fácil de escanear |
| `layout-natural` | Marca fresca/artesanal | Estética orgánica para cafés, comida saludable o productos naturales |
| `layout-warm` | Promocional/cercano | Experiencia colorida para comida rápida, postres o combos |
| `layout-elegant` | Marca premium | Presentación sobria para restaurantes o catálogos cuidados |

Ejemplos de themes reales:

| Theme | Enfoque | Diferencia real |
|---|---|---|
| `theme-default` | Base permanente | Sin ambientación estacional |
| `theme-christmas` | Navidad | Ambientación temporal para regalos, combos o temporada |
| `theme-mothers-day` | Día de la Madre | Ambientación emocional para detalles, postres y promociones |
| `theme-halloween` | Halloween | Ambientación oscura/promocional |
| `theme-valentine` | San Valentín | Ambientación romántica para cenas, regalos o fechas especiales |

No crear una plantilla nueva solo para cambiar colores o ambientación estacional. Para eso existe el sistema de themes.

---

## 3) Roles y autenticación

La autenticación se resuelve con **Firebase Auth**. La autorización se resuelve leyendo el documento `users/{uid}` en Firestore para mantener el proyecto simple y compatible con el plan gratuito.

### Roles base

| Rol | Descripción | Acceso |
|---|---|---|
| `superadmin` | Dueño de la plataforma | Control global de todas las tiendas, planes, estados y usuarios |
| `storeadmin` | Dueño/admin de una tienda | Administra solo su tienda: menú, catálogo, pedidos, stock y configuración |
| `customer` | Cliente final | Puede ver tienda pública y realizar pedidos |

### Decisiones iniciales

- El `superadmin` sos vos: controla todas las tiendas desde un panel global.
- Cada `storeadmin` solo puede acceder a su propia tienda.
- El `customer` puede iniciar sesión en una etapa posterior, pero para el MVP el pedido puede hacerse sin cuenta para reducir fricción.
- No usar Custom Claims como fuente principal en esta etapa; Firestore es suficiente y más simple de operar.

---

## 4) Modelo de rutas

```text
/                         → Landing pública del producto
/login                    → Login para superadmin/storeadmin
/admin                    → Dashboard superadmin
/admin/store              → Crear tienda o editar tienda con `?storeId=...`
/t/[storeSlug]            → Vista pública de tienda: menú o catálogo, resuelta en cliente
/t/[storeSlug]/admin      → Panel admin de la tienda
```

### Decisión de routing

La ruta de tienda debe resolverse en cliente, no con páginas estáticas por tienda.

**Por qué:** si se genera una página por tienda con `getStaticPaths`, habría que reconstruir y redesplegar cada vez que se cree una tienda nueva. Con resolución client-side, GitHub Pages sigue siendo estático y las tiendas nuevas aparecen solo con datos en Firestore.

**Limitación actual en GitHub Pages:** la implementación estática usa `/t.astro` para la pantalla base y `404.html` como fallback para deep links `/t/{storeSlug}`. Eso permite renderizar la tienda en cliente, pero una visita directa a `/t/{storeSlug}` puede tener semántica HTTP inicial de 404 en GitHub Pages. No se debe documentar ni vender como una ruta generada real con HTTP 200 por tienda mientras se mantenga este hosting estático sin rewrites.

---

## 5) Modelo de datos Firestore

Modelo propuesto para mantener multi-tenant simple, seguro y barato en lecturas.

```text
stores/{storeId}
  ├── name: string
  ├── slug: string
  ├── type: 'restaurant' | 'food_business' | 'product_store'
  ├── ownerUid: string
  ├── active: boolean
  ├── templateId: string
  ├── themeId: string
  ├── currency: 'COP' | 'USD' | 'EUR'
  ├── plan: 'free_trial' | 'standard' | 'plus' | 'premium'
  ├── trialStartedAt: Timestamp
  ├── trialEndsAt: Timestamp
  ├── planExpiresAt?: Timestamp
  ├── limits: {
  │     maxProducts: number
  │     maxCategories: number
  │     maxImages: number
  │   }
  ├── contact: {
  │     whatsapp?: string
  │     instagram?: string
  │     address?: string
  │     deliveryNotes?: string
  │   }
  ├── schedule: {
  │     [day: string]: { open: string, close: string, closed: boolean }
  │   }
  └── createdAt / updatedAt

stores/{storeId}/categories/{categoryId}
  ├── name: string
  ├── order: number
  ├── active: boolean

stores/{storeId}/items/{itemId}
  ├── categoryId: string
  ├── name: string
  ├── description?: string
  ├── price: number
  ├── imageUrl?: string
  ├── active: boolean
  ├── order: number
  ├── stock?: number
  ├── trackStock: boolean
  ├── variants?: Array<{ name: string, price?: number, stock?: number }>

stores/{storeId}/orders/{orderId}
  ├── customerName: string
  ├── customerPhone: string
  ├── type: 'in_store' | 'delivery'
  ├── status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  ├── items: Array<{ itemId: string, name: string, quantity: number, price: number }>
  ├── total: number
  ├── deliveryAddress?: string
  ├── notes?: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

users/{uid}
  ├── email: string
  ├── role: 'superadmin' | 'storeadmin' | 'customer'
  ├── storeId?: string
  └── createdAt: Timestamp

templates/{templateId}
  ├── name: string
  ├── type: 'restaurant' | 'food_business' | 'product_store' | 'seasonal'
  ├── active: boolean
  └── description: string
```

### Decisiones de datos

- Usar `stores` en lugar de `restaurants` porque el producto no será solo para restaurantes.
- Usar subcolecciones por tienda para simplificar reglas de seguridad: `stores/{storeId}/items`, `orders`, `categories`.
- Mantener `templates` como configuración simple; los componentes reales viven en código.
- `orders` queda dentro de cada tienda porque siempre pertenece a una tienda específica.
- `stock` es opcional para menús de comida y útil para catálogos o productos limitados.

---

## 6) Reglas de seguridad Firestore — principios

### Lectura pública

- Cualquiera puede leer tiendas activas.
- Cualquiera puede leer categorías e items activos de tiendas activas.
- Cualquiera puede leer templates activos.

### Escritura protegida

- `superadmin` puede gestionar cualquier tienda.
- `storeadmin` solo puede escribir dentro de su tienda.
- `customer` no puede editar tienda, categorías, items ni stock.

### Pedidos

Para el MVP, crear pedidos puede permitirse sin login o con rol `customer`, según fricción deseada.

Regla práctica inicial:

- Crear pedido: público con validación estricta de campos.
- Leer pedidos: solo `superadmin` o `storeadmin` de esa tienda.
- Actualizar estado: solo `storeadmin` o `superadmin`.

---

## 7) Arquitectura UI: Astro vs React

### Usar `.astro` para

- Landing del producto.
- Layouts base.
- Secciones estáticas.
- SEO inicial.
- Contenedores de página.

### Usar `.tsx` para

- Login y Auth.
- Dashboard superadmin.
- Panel de tienda.
- CRUD de categorías, items, pedidos y stock.
- Vista pública dinámica que lee Firestore.
- Componentes con estado, filtros, formularios o Firebase.

### Regla práctica

Astro arma la página. React maneja la app interactiva donde realmente hay estado.

---

## 8) Estructura de directorios propuesta

```text
src/
  components/
    home/
      HeroSection.astro
      FeaturesSection.astro
      TemplatesSection.astro
      PricingSection.astro
      ContactSection.astro
    react/
      auth/
        LoginForm.tsx
        AuthGuard.tsx
      public-store/
        StoreApp.tsx
        MenuView.tsx
        CatalogView.tsx
        OrderCart.tsx
      store-admin/
        StoreAdminApp.tsx
        CategoriesManager.tsx
        ItemsManager.tsx
        OrdersPanel.tsx
        StockManager.tsx
        StoreSettings.tsx
      superadmin/
        SuperAdminApp.tsx
        StoresManager.tsx
        UsersManager.tsx
    templates/
      restaurant-classic/
      fast-food/
      dessert-shop/
      product-catalog/
      seasonal-christmas/
  layouts/
    Layout.astro
    StoreLayout.astro
  lib/
    firebase.ts
    auth.ts
    users.ts
    stores.ts
    categories.ts
    items.ts
    orders.ts
    stock.ts
    templates.ts
    cache.ts
    types.ts
    utils.ts
  pages/
    index.astro
    login.astro
    admin.astro
    t/
      [...slug].astro
  styles/
    global.css
    theme.css
```

---

## 9) Etapas de desarrollo

### Etapa -1 — Arquitectura de vibe coding

**Objetivo:** crear una capa de trabajo para que el desarrollo asistido por agentes sea rápido, consistente y seguro.

- [x] Crear `AGENTS.md` con reglas operativas del repo, rama base y checklist antes de PR.
- [x] Crear playbook de buenas prácticas para Astro, React, Firebase y GitHub Pages.
- [x] Crear playbook de diseño de interfaces, layouts, themes y estados visuales.
- [x] Crear playbook para partir features grandes en cortes pequeños y verificables.
- [x] Alinear README con los scripts administrativos existentes.

**Entregable:** agentes y devs tienen instrucciones locales para construir sin desordenar arquitectura, UI ni costos de Firebase.

---

### Etapa 0 — Setup técnico

**Objetivo:** proyecto listo para desarrollar y desplegar gratis.

- [x] Confirmar configuración Astro estática para GitHub Pages.
- [x] Configurar Firebase SDK en `src/lib/firebase.ts`.
- [x] Habilitar Firebase Auth Email/Password.
- [x] Habilitar Firestore en modo producción.
- [x] Habilitar Firebase Storage.
- [x] Configurar `.env` con variables `PUBLIC_FIREBASE_*`.
- [x] Configurar GitHub Actions para deploy.
- [x] Activar alertas de uso de Firebase.

**Entregable:** sitio desplegado en GitHub Pages con Firebase conectado.

---

### Etapa 1 — Landing comercial

**Objetivo:** explicar y vender el producto antes de tener toda la operación interna completa.

- [x] Hero con propuesta de valor: menús, catálogos y pedidos para tiendas.
- [x] Sección de beneficios para restaurantes y emprendimientos.
- [x] Sección de templates reales, explicando diferencia con themes.
- [x] Sección de precios/planes iniciales.
- [x] CTA por WhatsApp/contacto.
- [x] Footer con información básica.

**Entregable:** landing estática responsive lista para mostrar a posibles clientes.

---

### Etapa 2 — Superadmin

**Objetivo:** poder crear y controlar tiendas desde un panel global.

- [x] Login con Firebase Auth.
- [x] Crear `users/{uid}` con rol `superadmin` mediante script seed.
- [x] Crear tienda desde dashboard.
- [x] Asignar `storeadmin` a una tienda.
- [x] Activar/desactivar tienda.
- [x] Elegir tipo de tienda: restaurante, comida o catálogo.
- [x] Elegir template inicial.
- [x] Ver resumen de tiendas, estado y uso básico.

**Entregable:** superadmin puede crear y administrar tiendas sin tocar Firestore manualmente.

---

### Etapa 3 — Vista pública de tienda

**Objetivo:** cada tienda tiene una URL pública funcional para menú o catálogo.

- [x] Mantener fallback estático `/t.astro` + `404.html` para `/t/{storeSlug}` en GitHub Pages, o migrar a hosting con rewrites si se requiere HTTP 200 real.
- [x] Resolver `storeSlug` en cliente.
- [x] Cargar configuración de tienda con cache TTL.
- [x] Cargar categorías e items activos.
- [x] Renderizar template según `templateId`.
- [x] Mostrar contacto, horario y estado abierto/cerrado.
- [x] Agregar botón de WhatsApp.
- [x] Preparar SEO básico dinámico en cliente.

**Entregable:** `/t/{storeSlug}` muestra menú o catálogo público desde Firestore.

---

### Etapa 4 — Panel admin de tienda

**Objetivo:** el `storeadmin` gestiona su negocio sin ayuda técnica.

- [x] Validar acceso: `users/{uid}.role === 'storeadmin'` y `storeId` coincide.
- [x] CRUD categorías.
- [x] CRUD items/productos.
- [x] Activar/desactivar items sin borrar.
- [x] Subir imágenes a Firebase Storage.
- [x] Cambiar template.
- [x] Cambiar theme básico.
- [x] Editar horario, contacto, dirección y redes.
- [x] Invalidar cache específico al guardar cambios.

**Entregable:** una tienda puede mantener su menú/catálogo desde el panel.

---

### Etapa 5 — Pedidos básicos

**Objetivo:** permitir que clientes hagan pedidos desde la vista pública.

- [ ] Agregar carrito simple en cliente.
- [ ] Pedido en tienda: nombre + teléfono + notas.
- [ ] Pedido a domicilio: dirección + teléfono + notas.
- [ ] Crear documento en `stores/{storeId}/orders`.
- [ ] Panel admin muestra pedidos pendientes.
- [ ] Cambiar estados: pendiente → aceptado → preparando → listo/entregado/cancelado.
- [ ] Notificación manual por WhatsApp como primer paso.

**Entregable:** cliente crea pedido y la tienda lo gestiona desde su panel.

---

### Etapa 6 — Stock básico

**Objetivo:** controlar disponibilidad de productos cuando aplique.

- [x] Campo `trackStock` por item.
- [x] Campo `stock` por item o variante.
- [ ] Descontar stock al aceptar pedido, no necesariamente al crearlo.
- [ ] Evitar aceptar pedidos con stock insuficiente.
- [ ] Mostrar “agotado” en catálogo público.
- [x] Permitir ajuste manual de stock desde admin.

**Entregable:** tiendas tipo catálogo pueden controlar disponibilidad sin sistema complejo de inventario.

---

### Etapa 7 — Plantillas y temas

**Objetivo:** convertir la diferenciación visual en una ventaja comercial.

- [x] Crear `layout-minimal`.
- [x] Crear `layout-natural`.
- [x] Crear `layout-warm`.
- [x] Crear `layout-elegant`.
- [ ] Definir API común de props para templates: `store`, `categories`, `items`, `theme`.
- [x] Definir themes como tokens de color/estilo separados del template.

**Entregable:** el producto puede vender variedad real, no solo cambios de color.

---

### Etapa 8 — Pulido comercial y técnico

- [x] Generación de QR por tienda.
- [x] PWA básica para acceso rápido desde celular.
- [ ] Skeletons/loading states.
- [x] Error states claros.
- [ ] Métricas básicas: pedidos del día, productos más pedidos, visitas estimadas.
- [ ] Auditoría de lecturas Firestore.
- [x] Revisión de reglas de seguridad.
- [ ] Deploy final verificado.

---

## 10) Orden de implementación recomendado

```text
Etapa 0 → Setup técnico
Etapa 1 → Landing comercial
Etapa 2 → Superadmin
Etapa 3 → Vista pública de tienda
Etapa 4 → Panel admin de tienda
Etapa 5 → Pedidos básicos
Etapa 6 → Stock básico
Etapa 7 → Plantillas y temas
Etapa 8 → Pulido
```

La razón de este orden es simple: primero se construye lo que permite vender y crear tiendas; después se agregan operación y diferenciación visual.

---

## 11) Decisiones técnicas clave

### ¿Por qué GitHub Pages + Firebase?

Porque permite vender y validar el producto sin costo fijo inicial. GitHub Pages sirve el frontend estático y Firebase cubre Auth, DB y Storage sin montar backend propio.

### ¿Por qué resolver tiendas en cliente?

Porque GitHub Pages no tiene servidor. Resolver por cliente evita rebuilds cada vez que se crea una tienda nueva.

### ¿Por qué pedidos sin pago online inicialmente?

Porque integrar pagos exige backend, pasarela, webhooks y más superficie de seguridad. Para el MVP, WhatsApp y confirmación manual son suficientes para validar valor.

### ¿Por qué clientes sin cuenta en MVP?

Porque pedir registro baja conversión. Primero importa que el cliente pueda pedir rápido. La cuenta de cliente puede venir después si hay historial, puntos o recompra.

### ¿Por qué templates separados de themes?

Porque vender “plantillas” como simples cambios de color es débil. Una plantilla debe cambiar layout, jerarquía visual y experiencia. El theme solo cambia la piel.

---

## 12) Fuera de alcance inicial

- Pagos online.
- Facturación automática.
- Pasarela tipo Stripe/MercadoPago.
- Backend propio permanente.
- Inventario avanzado con proveedores, costos o bodegas.
- Multi-sucursal avanzada.
- App móvil nativa.
- Analítica avanzada.

Estas funciones pueden agregarse cuando el producto ya tenga tiendas pagando o uso suficiente para justificar complejidad.
