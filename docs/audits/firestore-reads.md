# Auditoría de lecturas Firestore

Fecha: 2026-07-10
Rama: `feature/continue-plan-vibe-loop`

## Objetivo

Revisar las lecturas actuales para mantener el MVP compatible con Firebase Spark y evitar patrones caros antes de agregar pedidos, métricas o realtime.

## Resumen

Estado actual: aceptable para MVP.

- Las lecturas públicas usan queries acotadas por slug, tienda activa y límites.
- La vista pública usa cache TTL en `localStorage`.
- El dashboard superadmin lista tiendas con límite.
- El editor de tienda carga subcolecciones de una tienda específica.
- No hay listeners realtime (`onSnapshot`) para datos públicos.

## Lecturas públicas

Archivo: `src/lib/public-store-data.ts`

- `getStoreBySlug(slug)`
  - Lee `stores` con `where('slug', '==', slug)`, `where('active', '==', true)` y `limit(1)`.
  - Riesgo: bajo.
- Categorías públicas
  - Lee `stores/{storeId}/categories` con `where('active', '==', true)` y límite.
  - Riesgo: bajo.
- Items públicos
  - Lee `stores/{storeId}/items` con `where('active', '==', true)` y límite.
  - Riesgo: medio si se suben límites comerciales demasiado alto.
- Templates activos
  - Lee `templates` con límite y cache TTL.
  - Riesgo: bajo.
- Fallback legacy `restaurants`
  - Mantiene compatibilidad temporal.
  - Riesgo: medio por duplicar rutas de lectura cuando no encuentra en `stores`.
  - Recomendación: retirar después de migración validada.

## Cache TTL actual

- Store: 1 hora.
- Categorías: 1 hora.
- Items: 30 minutos.
- Templates: 2 horas.

La invalidación desde el editor ya llama `clearPublicStoreCache` después de guardar.

## Admin

- Superadmin usa `getLimitedStoresForAdmin()` con límite.
- Editor de tienda lee categorías/items solo dentro de `stores/{storeId}`.
- La búsqueda de storeadmin usa query por email con `limit(1)`.

## Reglas para próximos cortes

### Pedidos

- Evitar leer todos los pedidos históricos.
- Usar límite por estado/fecha, por ejemplo:
  - `where('status', 'in', ['pending', 'accepted', 'preparing'])`
  - `orderBy('createdAt', 'desc')`
  - `limit(50)`
- Realtime solo para pedidos activos del panel tienda, no para historial completo.

### Métricas

- No calcular métricas recorriendo todos los pedidos en cliente.
- Para MVP, calcular solo ventana pequeña del día con límite razonable.
- Para producción, considerar documentos agregados por tienda/día:
  - `stores/{storeId}/metrics/{yyyy-mm-dd}`

### Imágenes

- Guardar `imageUrl` en item para evitar llamadas extra a Storage por render.
- Optimizar tamaño antes o durante subida si empiezan a aparecer imágenes pesadas.

## Checklist de guardrails

- [x] Datos públicos sin `onSnapshot`.
- [x] Queries públicas con `limit`.
- [x] Queries públicas filtradas por tienda/slug/estado.
- [x] Cache TTL en vista pública.
- [x] Invalidación explícita al guardar tienda.
- [x] Reglas documentadas para pedidos y métricas.

## Próxima revisión

Revisar de nuevo después de implementar pedidos básicos y métricas del día.
