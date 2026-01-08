# Plan de trabajo — Menús de restaurantes (Astro + GitHub Pages + Firebase)

## 0) Objetivo
Sistema multi-tenant donde cada restaurante:
- Tiene su menú público accesible por URL/QR (sin autenticación)
- Puede elegir una plantilla visual (navideña, halloween, personalizada, etc.)
- Gestiona sus productos, categorías, precios y horarios desde un panel admin
- Todo desplegado en GitHub Pages con Firebase como backend

---

## 1) Modelo de datos (Firestore)

### 1.1 Colecciones principales

**`restaurants`** (colección principal)
```typescript
{
  name: string              // "Pizzeria Don Juan"
  slug: string              // "pizzeria-don-juan" (único, usado en URL)
  templateId: string        // "default" | "christmas" | "halloween" | "custom"
  ownerUid: string         // UID del usuario Firebase Auth
  isActive: boolean         // true = visible públicamente
  currency: string          // "COP" | "USD" | "EUR"
  contact?: {
    whatsapp?: string       // "+57 300 123 4567"
    instagram?: string      // "@pizzeriadonjuan"
    address?: string
  }
  schedule: {
    // Formato: { day: "monday", open: "09:00", close: "22:00", closed: false }
    // o más simple: { monday: "09:00-22:00", tuesday: "09:00-22:00", ... }
    [day: string]: string | { open: string, close: string, closed?: boolean }
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

**`categories`** (subcolección de restaurants o colección con restaurantId)
```typescript
{
  restaurantId: string      // Referencia al restaurante
  name: string              // "Pizzas", "Bebidas", "Postres"
  order: number             // Para ordenar (0, 1, 2...)
  active: boolean           // true = visible en menú público
  createdAt: timestamp
}
```

**`items`** (subcolección de categories o colección con categoryId)
```typescript
{
  restaurantId: string
  categoryId: string        // Referencia a categoría
  name: string              // "Pizza Margarita"
  description?: string      // Opcional
  price: number             // 7000 (sin símbolo, se agrega según currency)
  active: boolean           // true = visible en menú público
  imageUrl?: string         // URL de Firebase Storage (futuro)
  order: number             // Para ordenar dentro de la categoría
  createdAt: timestamp
  updatedAt: timestamp
}
```

**`templates`** (colección estática/config)
```typescript
{
  id: string                // "default" | "christmas" | "halloween"
  name: string              // "Plantilla Navideña"
  active: boolean           // true = disponible para elegir
  // Los templates se definen en código (componentes Astro), no en DB
}
```

### 1.2 Decisiones de diseño
- ✅ **Estructura simple**: `restaurants` → `categories` → `items`
- ✅ **Sin colección `menus`**: Cada restaurante tiene un solo menú (simplifica MVP)
- ✅ **Slug único**: Validar en Firestore Rules que no exista otro con mismo slug
- ✅ **Subcolecciones vs referencias**: Usar referencias (`restaurantId`, `categoryId`) para facilitar queries y reglas de seguridad

# Ejemplo de BD inicial
```
=== LOG COMPLETO DE FIREBASE ===
Restaurantes: 1
Categorías: 2
Items: 3
Templates: 2
Menus: 1

--- DETALLE COMPLETO ---
{
  "restaurants": {
    "count": 1,
    "data": [
      {
        "id": "restaurant_1",
        "updatedAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767907718,
          "nanoseconds": 139000000
        },
        "createdAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767907696,
          "nanoseconds": 746000000
        },
        "ownerUid": "",
        "isActive": true,
        "name": "Pizzeria Don Juan",
        "templateId": "u9xq1W3qtbzWwoidBcrV",
        "slug": "pizzeria-don-juan",
        "currency": "COP",
        "contact": {
          "whatsapp": "+573001234567",
          "address": "Calle 123 #45-67",
          "instagram": "@pizzeriadonjuan"
        },
        "schedule": {
          "thursday": "09:00-22:00",
          "friday": "09:00-23:00",
          "saturday": "10:00-23:00",
          "wednesday": "09:00-22:00",
          "monday": "09:00-22:00",
          "tuesday": "09:00-22:00",
          "sunday": "closed"
        }
      }
    ]
  },
  "categories": {
    "count": 2,
    "data": [
      {
        "id": "6hPfe98jNbmiAhqiMOex",
        "createdAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767908253,
          "nanoseconds": 580000000
        },
        "restaurantId": "restaurant_1",
        "order": 2,
        "active": true,
        "name": "Bebidas"
      },
      {
        "id": "dfZ8bs8kELMhS7GwIL8M",
        "restaurantId": "restaurant_1",
        "active": true,
        "order": 1,
        "name": "Pizzas",
        "createdAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767907812,
          "nanoseconds": 433000000
        }
      }
    ]
  },
  "items": {
    "count": 3,
    "data": [
      {
        "id": "4Ice1bYIUAzNlK3yF3RN",
        "createdAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767907976,
          "nanoseconds": 270000000
        },
        "price": 18000,
        "order": 1,
        "updatedAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767907981,
          "nanoseconds": 581000000
        },
        "restaurantId": "restaurant_1",
        "description": "Tomate, mozzarella, albahaca",
        "active": true,
        "categoryId": "dfZ8bs8kELMhS7GwIL8M",
        "name": "Pizza Margarita"
      },
      {
        "id": "4iZFwMuUsHaEybKBsJ5N",
        "order": 1,
        "name": "Coca-Cola",
        "updatedAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767908394,
          "nanoseconds": 655000000
        },
        "createdAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767908384,
          "nanoseconds": 904000000
        },
        "description": "Coca-Cola",
        "restaurantId": "restaurant_1",
        "price": 5000,
        "active": true,
        "categoryId": "6hPfe98jNbmiAhqiMOex"
      },
      {
        "id": "VVL05cKQ5CYSM9Hh4uxy",
        "order": 2,
        "createdAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767908125,
          "nanoseconds": 145000000
        },
        "active": true,
        "price": 20000,
        "updatedAt": {
          "type": "firestore/timestamp/1.0",
          "seconds": 1767908132,
          "nanoseconds": 747000000
        },
        "name": "Pizza Pepperoni",
        "categoryId": "dfZ8bs8kELMhS7GwIL8M",
        "restaurantId": "restaurant_1",
        "description": "Pepperoni y queso"
      }
    ]
  },
  "templates": {
    "count": 2,
    "data": [
      {
        "id": "u9xq1W3qtbzWwoidBcrV",
        "active": true,
        "name": "Plantilla por defecto"
      },
      {
        "id": "xiYlcFdFbagz7169Dv2t",
        "name": "christmas",
        "active": true
      }
    ]
  },
  "menus": {
    "count": 1,
    "data": [
      {
        "id": "XvGr9LqCLjd2OcsANUrJ",
        "restaurant": "Pizzeria Don Juan",
        "items": [
          {
            "name": "Pizza Margarita",
            "price": 7000
          },
          {
            "name": "Lasagna",
            "price": 11000
          },
          {
            "price": "3000",
            "name": "Jugos"
          }
        ]
      }
    ]
  }
}
```

---

## 2) Firebase: configuración

### 2.1 Proyecto Firebase
- Proyecto: `menu-templates`
- App Web: obtener `firebaseConfig`
- Habilitar: Authentication (Email/Password), Firestore, Storage (opcional para MVP)

### 2.2 Datos de prueba
Crear manualmente en Firestore:
- 1 restaurante con `slug: "pizzeria-don-juan"`
- 2-3 categorías
- 5-6 items distribuidos en categorías
- Template: `default`

---

## 3) Firebase Auth (Panel Admin)

### 3.1 Configuración
- Habilitar: Email/Password provider
- (Futuro: Google Sign-In, pero no necesario para MVP)

### 3.2 Flujo de autenticación
1. Usuario se registra/inicia sesión en `/admin/login`
2. Se obtiene `user.uid` de Firebase Auth
3. Se busca `restaurant` donde `ownerUid == user.uid`
4. Si existe → redirigir a `/admin` (dashboard)
5. Si no existe → mostrar "No tienes un restaurante asignado" / onboarding

### 3.3 Protección de rutas
- Middleware/componente `AuthGuard.astro` que verifica:
  - Usuario autenticado
  - Usuario tiene restaurante asociado
  - Redirige a `/admin/login` si no cumple

---

## 4) Reglas de seguridad (Firestore Rules)

### 4.1 Lectura pública (sin autenticación)
```javascript
// Cualquiera puede leer restaurantes activos y sus datos públicos
match /restaurants/{restaurantId} {
  allow read: if resource.data.isActive == true;
  
  // Cualquiera puede leer categorías e items de restaurantes activos
  match /categories/{categoryId} {
    allow read: if get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.isActive == true;
  }
}

match /categories/{categoryId} {
  allow read: if get(/databases/$(database)/documents/restaurants/$(resource.data.restaurantId)).data.isActive == true;
}

match /items/{itemId} {
  allow read: if get(/databases/$(database)/documents/restaurants/$(resource.data.restaurantId)).data.isActive == true;
}
```

### 4.2 Escritura (solo owner)
```javascript
// Solo el owner puede escribir su restaurante
match /restaurants/{restaurantId} {
  allow write: if request.auth != null && 
                 request.auth.uid == resource.data.ownerUid;
  allow create: if request.auth != null && 
                 request.auth.uid == request.resource.data.ownerUid;
}

// Solo el owner puede escribir categorías e items de su restaurante
match /categories/{categoryId} {
  allow write: if request.auth != null && 
                 request.auth.uid == get(/databases/$(database)/documents/restaurants/$(resource.data.restaurantId)).data.ownerUid;
}

match /items/{itemId} {
  allow write: if request.auth != null && 
                 request.auth.uid == get(/databases/$(database)/documents/restaurants/$(resource.data.restaurantId)).data.ownerUid;
}
```

### 4.3 Validaciones adicionales
- Slug único: Validar en cliente + regla de Firestore
- Precios > 0
- Campos requeridos no vacíos

---

## 5) Frontend Astro (estructura de rutas)

### 5.1 Rutas públicas
```
/                           → Landing page (lista de restaurantes o buscador)
/m/[slug]                   → Menú público del restaurante (ej: /m/pizzeria-don-juan)
```

### 5.2 Rutas admin (protegidas)
```
/admin/login                → Login/registro
/admin                      → Dashboard (resumen, stats básicas)
/admin/categories           → CRUD categorías
/admin/items                → CRUD items (con filtro por categoría)
/admin/settings             → Config: plantilla, horarios, contacto, info restaurante
```

### 5.3 Componentes principales
```
src/
  components/
    MenuLayout.astro         → Layout base para menú público
    TemplateRenderer.astro  → Renderiza template según templateId
    AuthGuard.astro         → Protege rutas admin
    templates/
      default.astro         → Plantilla por defecto
      christmas.astro       → Plantilla navideña
      halloween.astro       → Plantilla halloween
  lib/
    firebase.ts             → Config Firebase (app, firestore, auth)
    auth.ts                 → Helpers de autenticación
    utils.ts                → Helpers (formatear precio, validar horarios, etc.)
```

---

## 6) Integración Firebase en Astro

### 6.1 Configuración
- `src/lib/firebase.ts`: Inicializar Firebase App, Firestore, Auth
- **Importante**: Firebase SDK funciona en cliente (browser), no en SSR de Astro
- Para páginas públicas: usar `client:load` o `client:visible` en componentes que necesiten Firebase
- Para admin: todo en cliente (SPA-like)

### 6.2 Data fetching

**Público (`/m/[slug]`):**
- Opción A: Fetch en cliente con `useEffect` (React-like) o vanilla JS
- Opción B: Usar Astro Islands con componente que carga datos en cliente
- **Recomendado**: Componente `MenuView.astro` que se hidrata en cliente

**Admin:**
- Todo en cliente (Firestore SDK + Auth state)
- Usar `onAuthStateChanged` para detectar cambios de sesión

---

## 7) UI Admin (MVP)

### 7.1 Funcionalidades mínimas
- ✅ Login/registro
- ✅ Dashboard: resumen (total categorías, items, estado)
- ✅ CRUD categorías: crear, editar, eliminar, reordenar (drag & drop futuro)
- ✅ CRUD items: crear, editar, eliminar, toggle active
- ✅ Settings: cambiar plantilla, editar horarios, contacto, info restaurante

### 7.2 UX básico
- Formularios simples (sin librerías pesadas)
- Feedback visual: toast/notificaciones al guardar/eliminar
- Confirmación antes de eliminar
- Loading states
- Validación básica de campos

### 7.3 Estilo
- CSS simple o framework ligero (Tailwind opcional)
- Responsive básico
- No necesita ser "bonito" para MVP, solo funcional

---

## 8) Vista pública (menú)

### 8.1 MVP público
- Mostrar nombre del restaurante
- Indicador de estado: "Abierto" / "Cerrado" (según horario actual)
- Lista de categorías activas (ordenadas por `order`)
- Items activos por categoría (con precio formateado según `currency`)
- Botón WhatsApp (si está configurado)
- Link a Instagram (si está configurado)

### 8.2 Plantillas
- Cada template es un componente Astro en `src/components/templates/`
- `TemplateRenderer.astro` recibe datos del restaurante y renderiza el template correspondiente
- Templates pueden tener estilos completamente diferentes
- Estructura común: recibir `restaurant`, `categories`, `items` como props

### 8.3 SEO básico
- Meta tags: título, descripción
- Open Graph para compartir en redes
- URL limpia: `/m/[slug]`

---

## 9) Deploy (GitHub Pages)

### 9.1 Configuración Astro
```js
// astro.config.mjs
export default defineConfig({
  site: 'https://tu-usuario.github.io',
  base: '/menu-templates/',
  output: 'static' // GitHub Pages es estático
});
```

### 9.2 Workflow GitHub Actions
- Ya existe `.github/workflows/deploy.yml`
- Build en cada push a `main`
- Deploy a `gh-pages` branch

### 9.3 Variables de entorno
- Firebase config: puede ir en código (no es secreto)
- O usar `.env` con `PUBLIC_` prefix para variables públicas de Vite

---

## 10) Checklist MVP (orden de implementación)

### Fase 1: Base de datos y estructura
- [ ] 1. Crear proyecto Firebase y configurar Firestore
- [ ] 2. Definir estructura de colecciones
- [ ] 3. Crear datos de prueba (1 restaurante, categorías, items)
- [ ] 4. Configurar reglas de seguridad básicas

### Fase 2: Frontend público
- [ ] 5. Crear ruta `/m/[slug]` en Astro
- [ ] 6. Componente para cargar datos de Firestore (cliente)
- [ ] 7. Template `default.astro` básico
- [ ] 8. Mostrar restaurante, categorías e items

### Fase 3: Autenticación
- [ ] 9. Configurar Firebase Auth (Email/Password)
- [ ] 10. Crear `/admin/login`
- [ ] 11. Componente `AuthGuard` para proteger rutas

### Fase 4: Panel admin
- [ ] 12. Dashboard básico (`/admin`)
- [ ] 13. CRUD categorías (`/admin/categories`)
- [ ] 14. CRUD items (`/admin/items`)
- [ ] 15. Settings (`/admin/settings`): plantilla, horarios, contacto

### Fase 5: Pulido y deploy
- [ ] 16. Validar reglas de seguridad
- [ ] 17. Testing básico (crear, editar, eliminar)
- [ ] 18. Deploy a GitHub Pages
- [ ] 19. Verificar que todo funciona en producción

---

## 11) Mejoras futuras (post-MVP)

### Funcionalidades
- 📸 **Imágenes**: Firebase Storage para fotos de productos
- 🎨 **Más plantillas**: Agregar plantillas premium
- 📊 **Estadísticas**: Vistas, productos más vistos
- 👥 **Multi-usuario**: Staff users (varios admins por restaurante)
- 📱 **QR Codes**: Generar QR por restaurante
- 🌍 **Multi-idioma**: Soporte i18n
- ⏰ **Horarios por item**: Items disponibles solo en ciertos horarios
- 💾 **Import/Export**: CSV para productos
- 📱 **PWA**: Offline caching del menú

### Técnicas
- ⚡ **Performance**: Lazy loading de imágenes, code splitting
- 🔍 **SEO avanzado**: Sitemap, structured data
- 🎯 **Analytics**: Google Analytics o similar
- 🧪 **Testing**: Unit tests, E2E tests

---

## 12) Notas importantes

### Limitaciones de GitHub Pages
- ✅ Solo hosting estático (perfecto para Astro)
- ❌ No hay backend (por eso Firebase)
- ❌ No hay SSR real (Astro genera HTML estático)
- ✅ Firebase funciona perfecto desde cliente

### Consideraciones de Firebase
- Firestore tiene límites de lectura/escritura (plan gratuito: 50K lecturas/día)
- Para muchos restaurantes, considerar índices compuestos
- Storage tiene límite de 5GB en plan gratuito

### Seguridad
- **Nunca** exponer API keys secretas (Firebase config es público, está bien)
- Validar todo en Firestore Rules (no confiar solo en cliente)
- Sanitizar inputs del usuario

---
