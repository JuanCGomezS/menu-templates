# Skill — Feature Slicing

Usa este playbook para partir features grandes en cortes pequeños, revisables y alineados con el MVP.

## Orden recomendado

1. Modelo de datos mínimo.
2. Reglas/permiso mínimo.
3. Helper de lectura/escritura.
4. UI simple funcional.
5. Estados de UX.
6. Pulido visual.
7. Documentación y `PLAN.md`.

## Cómo partir una feature

Cada corte debe responder:

- ¿Qué usuario desbloquea? (`superadmin`, `storeadmin`, cliente público)
- ¿Qué colección toca?
- ¿Qué riesgo tiene para Firebase Spark?
- ¿Cómo se valida?
- ¿Qué queda fuera explícitamente?

## Ejemplo: CRUD de productos

Buen corte 1:

- Listar categorías e items existentes en el editor.
- Sin imágenes.
- Sin variantes.
- Validación: build + prueba manual de lectura.

Buen corte 2:

- Crear/editar nombre, descripción, precio, categoría y activo.
- Sin Storage aún.
- Validación: reglas Firestore + prueba manual de escritura.

Buen corte 3:

- Stock básico (`trackStock`, `stock`).
- Sin descuento automático por pedido aún.

Buen corte 4:

- Imágenes con Storage.
- Guardar URL en Firestore.

## Evitar

- Mezclar cambios de UI, reglas, migraciones y pedidos en un solo PR grande.
- Implementar pagos antes de validar pedidos manuales.
- Crear abstracciones genéricas sin dos casos reales.
- Marcar tareas del plan como completas si solo existe la UI mock.

## Cierre de corte

Una tarea queda lista cuando tiene:

- Código implementado.
- Gate mínimo ejecutado.
- Estado actualizado en `PLAN.md` si aplica.
- Pendientes explícitos si hay deuda intencional.
