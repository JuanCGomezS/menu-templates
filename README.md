# Menu Templates

Proyecto Astro publicado en GitHub Pages con Firebase como backend gratuito. La autenticación usa Firebase Auth y los permisos se leen desde `users/{uid}` en Firestore.

## Comandos básicos

| Comando | Acción |
| --- | --- |
| `npm install` | Instala dependencias. |
| `npm run dev` | Levanta el entorno local. |
| `npm run build` | Genera el sitio estático. |
| `npm run seed:store` | Crea la tienda demo `store_cafe_bella_vista` con Firebase Admin SDK. |
| `npm run seed:auth` | Crea o actualiza usuarios demo con Firebase Admin SDK. |

## Configuración pública de Firebase

El cliente usa variables `PUBLIC_FIREBASE_*` desde `.env` en local y desde GitHub Secrets durante el deploy. Esa configuración es pública por diseño en Firebase Web SDK: no es un secreto y la seguridad real depende de Firebase Auth, las reglas de Firestore y las credenciales privadas del Admin SDK. No subas claves de servicio al repositorio.

Creá un archivo `.env` local tomando como base `.env.example`:

```sh
cp .env.example .env
```

Variables requeridas:

```env
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_AUTH_DOMAIN=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_STORAGE_BUCKET=...
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
PUBLIC_FIREBASE_APP_ID=...
PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

En GitHub agregá esos mismos nombres en **Settings > Secrets and variables > Actions > Repository secrets**. El workflow `.github/workflows/deploy.yml` los inyecta al ejecutar `npm run build`.

## Datos existentes y migración

El proyecto nuevo usa `stores` como modelo objetivo, pero el Firebase actual todavía puede tener datos legacy en `restaurants`. La app mantiene una capa de compatibilidad: primero busca en `stores` y, si no encuentra la tienda, intenta leer `restaurants/{restaurantId}` con sus subcolecciones `categories/items`.

Para copiar los datos legacy hacia el modelo nuevo sin eliminar los originales:

```sh
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/firebase-service-account.json"
export FIREBASE_PROJECT_ID="menu-templates"
npm run migrate:stores
```

Después de validar que las tiendas funcionan desde `stores`, se puede retirar la compatibilidad legacy en una etapa posterior.

## Crear usuarios demo

Los scripts `seed:store` y `seed:auth` usan Firebase Admin SDK, por eso pueden escribir datos iniciales aunque las reglas de Firestore bloqueen escrituras desde el cliente.

### 1. Crear una clave de servicio

1. Entrá a Firebase Console.
2. Abrí el proyecto `menu-templates`.
3. Andá a Configuración del proyecto > Cuentas de servicio.
4. Generá una nueva clave privada y guardala fuera del repositorio git, por ejemplo `./firebase-service-account.json`.

El script también detecta automáticamente estos nombres si existen:

- `firebase-service-account.json`
- `service-account-key.json`
- `scripts/firebase-service-account.json`
- `scripts/service-account-key.json`

Los archivos `service-account*.json` y `firebase-service-account*.json` ya están ignorados por Git.

### 2. Definir variables de entorno

Usá credenciales estándar de Google:

```sh
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/firebase-service-account.json"
export FIREBASE_PROJECT_ID="menu-templates"
```

También podés dejarlo en `.env` para no exportarlo cada vez:

```env
FIREBASE_PROJECT_ID=menu-templates
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Importante: las variables `PUBLIC_FIREBASE_*` sirven para el frontend, pero no autorizan migraciones ni seeds administrativos. Para `seed:store`, `seed:auth` y `migrate:stores` necesitás una credencial de cuenta de servicio.

O usá la clave en base64:

```sh
export FIREBASE_SERVICE_ACCOUNT_BASE64="$(base64 -w 0 firebase-service-account.json)"
export FIREBASE_PROJECT_ID="menu-templates"
```

Definí los usuarios de prueba:

```sh
export SUPERADMIN_EMAIL="superadmin@example.com"
export SUPERADMIN_PASSWORD="cambiar-esta-clave"
export STOREADMIN_EMAIL="storeadmin@example.com"
export STOREADMIN_PASSWORD="cambiar-esta-clave"
```

Opcional para flujos futuros de cliente:

```sh
export CUSTOMER_EMAIL="customer@example.com"
export CUSTOMER_PASSWORD="cambiar-esta-clave"
```

### 3. Ejecutar bootstrap

```sh
npm run seed:auth
```

El script crea los usuarios si no existen, para lo cual exige la contraseña correspondiente. Si el usuario ya existe y la contraseña no está definida, conserva la actual. También escribe `users/{uid}` con el rol correcto. El storeadmin queda vinculado a `store_cafe_bella_vista` y al slug `cafe-bella-vista`; también se actualiza `stores/store_cafe_bella_vista.ownerUid`.

## Probar login y roles

1. Confirmá que la tienda demo exista con `npm run seed:store` si todavía no fue creada, o migrá tus datos actuales con `npm run migrate:stores`.
2. Ejecutá `npm run seed:auth` con las variables anteriores.
3. Iniciá sesión en `/login`.
4. Probá superadmin en `/admin`.
5. Probá storeadmin en `/t/cafe-bella-vista/admin`.

En GitHub Pages, las mismas rutas se sirven bajo el base path del proyecto. El código usa `import.meta.env.BASE_URL` para construir los redirects.

## Flujo real de roles

### 1. Registro público

Desde `/login`, cualquier persona puede usar la pestaña **Registrarme**. El sistema crea la cuenta en Firebase Auth y escribe `users/{uid}` con:

```js
role: 'customer'
```

Un usuario registrado NO puede cambiar su rol desde el cliente.

### 2. Promover un correo a superadmin

Solo quien tenga la cuenta de servicio puede promover usuarios. Primero asegurate de tener en `.env`:

```env
FIREBASE_PROJECT_ID=menu-templates
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Luego ejecutá:

```sh
PROMOTE_EMAIL="tu-correo@dominio.com" npm run promote:superadmin
```

Si el usuario todavía no existe en Firebase Auth, agregá contraseña:

```sh
PROMOTE_EMAIL="tu-correo@dominio.com" PROMOTE_PASSWORD="una-clave-segura" npm run promote:superadmin
```

### 3. Asignar storeadmin desde el panel

Una vez dentro de `/admin` como superadmin:

1. El usuario que será storeadmin debe registrarse primero desde `/login`.
2. En la fila de la tienda, escribí el correo del usuario.
3. Presioná **Asignar**.

El panel cambia ese perfil a:

```js
role: 'storeadmin'
storeId: '<id de tienda>'
storeSlug: '<slug de tienda>'
```
