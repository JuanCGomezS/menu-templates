# Skill — Interface Design

Usa este playbook para landing, dashboards, editor de tienda, vista pública, templates y themes.

## Criterio visual

Menu Templates debe sentirse:

- Moderno y comercial.
- Fácil de usar desde celular.
- Vendible a restaurantes, emprendimientos de comida y catálogos de productos.
- Premium sin volverse complejo.

## Layout vs theme

- `layout`: cambia estructura, jerarquía y experiencia de navegación.
- `theme`: cambia tokens, emoción y temporada.

No crear un layout nuevo si solo cambia color, fondo o acento. Eso es theme.

## Reglas de UI

- Mobile-first. Todo flujo crítico debe funcionar bien en pantalla pequeña.
- CTAs claros: una acción primaria por bloque.
- Estados obligatorios en flujos interactivos:
  - loading
  - empty
  - error
  - success/confirmation cuando hay escritura
- Inputs con labels visibles; no depender solo de placeholder.
- Botones deshabilitados durante escrituras para evitar dobles envíos.
- Contraste suficiente entre texto y fondo, especialmente en themes oscuros o festivos.

## Vista pública de tienda

Debe priorizar:

1. Nombre de la tienda.
2. Estado abierto/cerrado si hay horario.
3. Categorías/productos legibles.
4. Precio claro.
5. Contacto o CTA de WhatsApp.
6. Dirección/horario cuando aplique.

No saturar con animaciones o adornos si dificultan leer productos y precios.

## Paneles admin

Deben priorizar operación:

- Guardar rápido.
- Errores claros.
- Preview visual cuando se cambian layout/theme.
- Separar datos públicos, diseño, operación, productos y configuración interna.

## Checklist visual

- [ ] Se ve bien en móvil y desktop.
- [ ] Hay jerarquía clara entre título, descripción, precio y acciones.
- [ ] El CTA principal no compite con 3 acciones más.
- [ ] Hay estados de carga/error/vacío.
- [ ] El theme no rompe contraste.
- [ ] Los textos comerciales suenan naturales en español colombiano/neutro.
