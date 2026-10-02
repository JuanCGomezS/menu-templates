# Verificación de sesión y permisos

Ejecutar en una ventana privada y con una sesión persistida:

1. Iniciar sesión como superadmin; recargar `/admin/`: debe aparecer un skeleton y luego el panel, sin una pantalla vacía.
2. Iniciar sesión como storeadmin; recargar `/t/{slug}/admin/`: debe cargar solo su tienda.
3. Visitar un panel sin sesión: debe redirigir a `/login/`.
4. Probar una cuenta Auth sin documento `users/{uid}`: debe mostrar **Perfil incompleto**.
5. Probar rol `customer`: debe mostrar **Acceso denegado** en rutas administrativas.
6. Desconectar red tras iniciar: debe mostrarse un error de sesión o carga recuperable.
7. Cerrar sesión y recargar: el perfil cacheado de `sessionStorage` debe eliminarse y no autorizar la interfaz.

El perfil se conserva durante cinco minutos en `sessionStorage` por UID para evitar lecturas repetidas entre cargas. Firestore Rules sigue siendo la fuente de autorización para cada operación; el cache solo mejora la experiencia visual.
