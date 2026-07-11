# AGENTS.md — Menu Templates

Guía operativa para agentes y devs trabajando en este repo.

## Producto

Menu Templates es una plataforma multi-tienda para vender menús, catálogos y pedidos básicos usando infraestructura gratuita: Astro estático en GitHub Pages + Firebase Auth/Firestore/Storage.

## Rama base

- Desarrollo activo: `staging`.
- Features grandes: crear ramas desde `staging`.
- No trabajar contra `main` salvo para hotfix o publicación explícita.

## Prioridades de arquitectura

1. Mantener el hosting estático compatible con GitHub Pages.
2. Evitar backend propio mientras el MVP pueda vivir en Firebase Spark.
3. Minimizar lecturas Firestore con queries acotadas y cache TTL.
4. Separar visualmente `layout` de `theme`:
   - `layout` cambia estructura y experiencia.
   - `theme` cambia ambientación/tokens.
5. Preferir componentes pequeños y datos tipados antes de añadir lógica inline larga.
6. Cada cambio funcional debe actualizar `PLAN.md` si mueve el estado del producto.

## Skills/playbooks del proyecto

Antes de implementar, revisa el playbook más cercano:

- `docs/vibe-coding/skills/best-practices.md` — estándares de implementación y seguridad.
- `docs/vibe-coding/skills/interface-design.md` — criterios visuales, responsive y experiencia de UI.
- `docs/vibe-coding/skills/feature-slicing.md` — cómo partir features sin romper el MVP.

Estos archivos no son documentación comercial; son instrucciones de trabajo para mantener consistencia cuando se hace vibe coding con agentes.

## Comandos útiles

```sh
npm install
npm run dev
npm run build
npm run preview
```

Scripts administrativos requieren Firebase Admin SDK y credenciales locales fuera de git:

```sh
npm run seed:store
npm run seed:auth
npm run migrate:stores
npm run promote:superadmin
```

## Reglas de cambio

- No subir claves de servicio, `.env` real ni secretos.
- No usar `onSnapshot` para datos públicos estáticos.
- No leer colecciones completas sin `limit` o filtro por tienda/estado.
- Si un componente supera ~300 líneas, buscar extracción antes de añadir más lógica.
- Validar al menos con `npm run build` antes de considerar listo un cambio.

## Checklist antes de PR

- [ ] Build local pasa.
- [ ] `PLAN.md` refleja tareas completadas/pendientes.
- [ ] README se actualizó si cambió un comando o flujo público.
- [ ] No hay secretos ni credenciales.
- [ ] Los cambios visuales se probaron en móvil y desktop.
- [ ] Las reglas Firestore siguen alineadas con el modelo de datos.
