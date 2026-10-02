# Checklist de release

## Antes de publicar

```sh
npm ci
npm run verify
```

`verify` ejecuta typecheck, reglas mediante Firestore Emulator, build y validación de los artefactos estáticos.

## Despliegue coordinado

El workflow de `main` publica primero `firestore.rules`, `firestore.indexes.json` y `storage.rules`; GitHub Pages solo se publica si ese job termina correctamente. Configurá el secreto `FIREBASE_SERVICE_ACCOUNT` con el JSON de una cuenta de servicio que pueda desplegar Firestore y Storage, además de las variables públicas de Firebase ya documentadas.

## Rutas en GitHub Pages

Tras cada deploy, abrir una ventana privada y probar carga directa + refresh:

| Ruta | Resultado esperado |
| --- | --- |
| `/menu-templates/` | Landing con HTTP 200 |
| `/menu-templates/login/` | Login con HTTP 200 |
| `/menu-templates/admin/` | Guard de superadmin o redirección a login |
| `/menu-templates/t/{slug}/` | Fallback 404 de Pages que inicia la tienda cliente |
| `/menu-templates/t/{slug}/admin/` | Fallback 404 de Pages que inicia el guard de tienda |

GitHub Pages no puede devolver HTTP 200 para rutas dinámicas `/t/{slug}` sin rewrites. El criterio es que el fallback cargue la aplicación cliente también después de refresh; conservar esta limitación en la comunicación comercial.

## Registro

Registrar en el PR o release: SHA desplegado, URL del workflow exitoso, URL de Pages, resultado de las cinco rutas y fecha/hora. No marcar una release como verificada sin esas evidencias.
