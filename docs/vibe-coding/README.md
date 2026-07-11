# Vibe Coding Architecture

Esta carpeta contiene la arquitectura de trabajo para desarrollar Menu Templates con apoyo de agentes: reglas, playbooks y criterios de calidad para que cada iteración avance rápido sin degradar el producto.

## Objetivo

Convertir el vibe coding en un flujo controlado:

- Ideas rápidas, pero con límites técnicos claros.
- UI atractiva, pero consistente y mantenible.
- Features pequeñas, verificables y alineadas con `PLAN.md`.
- Decisiones documentadas cuando afectan arquitectura, producto o costos.

## Playbooks disponibles

- `skills/best-practices.md`: cómo implementar sin romper seguridad, Firebase Spark ni GitHub Pages.
- `skills/interface-design.md`: cómo diseñar interfaces, layouts, themes y estados visuales.
- `skills/feature-slicing.md`: cómo partir trabajo grande en cortes pequeños y testeables.

## Cómo usar esta carpeta

1. Antes de empezar una tarea, identifica qué playbook aplica.
2. Implementa el cambio más pequeño que desbloquee valor real.
3. Ejecuta el gate mínimo (`npm run build`, revisión visual o prueba manual documentada).
4. Actualiza `PLAN.md` si cambió el estado del proyecto.
5. Resume qué se hizo, qué se verificó y qué queda pendiente.

## Principio rector

El producto debe sentirse premium para el cliente final, pero el código debe seguir siendo simple de operar por una sola persona.
