# Skill — Best Practices

Usa este playbook para cambios de arquitectura, datos, seguridad, scripts, reglas Firebase o flujos de desarrollo.

## Antes de escribir código

- Revisa `PLAN.md` y confirma la etapa afectada.
- Revisa si ya existe helper en `src/lib/` antes de crear uno nuevo.
- Mantén GitHub Pages como restricción: sin rutas server-side, sin APIs propias, sin dependencias de runtime Node en cliente.
- Mantén Firebase Spark como restricción: lecturas acotadas, cache cuando aplique, cero realtime para datos estáticos.

## Firestore y Firebase

- Consultar siempre por tienda, slug, estado o límite.
- No usar `onSnapshot` para tiendas, categorías, items o templates públicos.
- Pedidos activos pueden usar realtime solo si el valor operativo lo justifica.
- Guardar URLs finales de Storage en Firestore; no recalcular rutas de archivos en cada render.
- Las escrituras administrativas deben pasar por roles (`superadmin`, `storeadmin`) y reglas Firestore.

## React/Astro

- `.astro` para páginas, layout base, landing y contenedores estáticos.
- `.tsx` para Auth, dashboards, formularios, estado y Firebase.
- Componentes interactivos deben manejar loading, empty, error y success cuando aplique.
- Evitar componentes monolíticos: si una sección crece, extraer helpers/componentes nombrados.

## Datos y tipos

- Tipar modelos compartidos en `src/lib/*` cuando se reutilicen.
- No duplicar nombres de roles, planes o tipos de tienda si ya existen en `config/app-constants.js` o helpers.
- Mantener compatibilidad legacy `restaurants` solo mientras `PLAN.md` lo indique.

## Scripts y documentación

- Si README menciona un comando, debe existir en `package.json`.
- Si se agrega script administrativo, debe documentar credenciales requeridas.
- No incluir secretos reales en ejemplos; usar placeholders.

## Gate mínimo

Antes de cerrar una tarea:

```sh
npm run build
```

Si el build necesita variables públicas de Firebase, usar placeholders locales para validar compilación, nunca credenciales privadas.
