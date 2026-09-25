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

## Validación de pedidos con Firebase Emulator

La base de la issue #3 queda aislada en los archivos de pedidos, reglas, índices y pruebas; no modifica datos productivos. Antes de comenzar un cambio de pedidos, verificá el estado local con `git status --short` y conservá los cambios ajenos en otro commit o stash.

La prueba reproducible cubre la carga de pedidos del `storeadmin`, el aislamiento entre tiendas y la creación pública:

```sh
npm run test:emulator
```

El comando inicia únicamente Firestore Emulator, ejecuta `tests/firestore.rules.test.mjs` y lo detiene. La carga operativa del panel usa `stores/{storeId}/orders`, filtra estados activos, se limita a los últimos siete días y a 50 resultados; no consulta pedidos de todas las tiendas ni el historial completo.

## Contrato de pedido público

La modalidad `in_store` representa un pedido en mesa: exige `tableNumber` (entero de 1 a 999) y no admite teléfono ni dirección. La modalidad `delivery` exige `customerPhone` y `deliveryAddress`, y no admite `tableNumber`. Ambas requieren nombre, productos, total y estado inicial `pending`.

Usá `validatePublicOrder(input, store.capabilities)` desde `src/lib/orders.ts` antes de llamar a `createPublicOrder`. La validación cliente normaliza los campos y las reglas de Firestore repiten el contrato, comprueban que la capacidad correspondiente de la tienda esté habilitada y bloquean campos cruzados. Los documentos de pedidos históricos permanecen legibles: sus campos de modalidad son opcionales al leerlos.

## Cola operativa de pedidos

Al ingresar como `storeadmin`, `/t/{slug}/admin` abre directamente la cola de pedidos del día. La zona horaria IANA se configura en **Operación > Zona horaria de operación**; las tiendas existentes sin ese campo usan `America/Bogota` de forma compatible.

La cola consulta solo `stores/{storeId}/orders` dentro de un rango explícito de inicio/fin del día local, ordena por `createdAt`, limita cada página a 25 documentos y permite cargar la página siguiente. Desde allí se puede atender el pedido con las transiciones pendiente → aceptado → preparando → listo → entregado, o cancelarlo.

La pestaña **Estadísticas** incluye un calendario nativo para un día o un rango de hasta 31 días. Muestra pedidos, ventas (sin cancelados) y productos destacados, y conserva el mismo límite/paginación de 25 documentos. El índice compuesto `orders(status, createdAt desc)` está en `firestore.indexes.json` para la cola de pedidos activos; desplegalo junto a reglas e índices con `firebase deploy --only firestore`.

## Pedido público y stock

El carrito público puede minimizarse sin perder sus productos. Antes de agregar o confirmar, valida la modalidad configurada en la tienda, la disponibilidad del producto y el stock visible. La confirmación queda bloqueada mientras se envía y usa un identificador único por intento para evitar duplicados; ante un error conserva el carrito para reintentar.

La atención administrativa usa `transitionOrderStatus`: al aceptar, una transacción comprueba disponibilidad y descuenta stock de los productos que lo controlan; al cancelar un pedido aceptado, preparando o listo, la misma transacción lo repone. No se descuenta en la creación pública ni se repone después de entregarlo.

## Selector de plantillas

El editor usa cards de plantilla en lugar de renderizar una tienda completa dentro del formulario. Cada card comunica su estructura y propósito, es seleccionable con teclado y lector de pantalla, y conserva los IDs canónicos al guardar. Los IDs heredados se resuelven de forma compatible mediante `resolveTemplate`.

## Layouts y themes

Las cuatro plantillas consumen el mismo `StoreContentModel` normalizado; cambian jerarquía, navegación, densidad y composición sin alterar los datos. Los themes solo inyectan tokens de paleta y contraste. La lista de comprobación móvil/escritorio, incluido carrito, carga, error y vacío, está en [`docs/visual-layout-checklist.md`](docs/visual-layout-checklist.md).

## Release y rutas estáticas

Usá `npm run verify` antes de publicar: ejecuta typecheck, pruebas de reglas con Emulator, build y validación de archivos estáticos. El workflow de `main` despliega coordinadamente Firestore Rules, índices y Storage Rules antes de GitHub Pages; requiere el secreto `FIREBASE_SERVICE_ACCOUNT`. La verificación de carga directa/refresh y el registro de evidencia de producción están en [`docs/release-checklist.md`](docs/release-checklist.md).

## Sesión y permisos

El perfil de permisos se deduplica en memoria y se conserva durante cinco minutos por sesión para evitar lecturas repetidas de `users/{uid}` al navegar. Los paneles distinguen carga, sesión ausente, perfil incompleto, acceso denegado y error de red; Firestore Rules sigue validando toda operación. La guía de prueba está en [`docs/session-permissions-checklist.md`](docs/session-permissions-checklist.md).

## Identidad y ubicación

Desde el editor se puede cargar o reemplazar el logo (imagen menor de 5 MB) y configurar latitud/longitud. Los logos se almacenan bajo `stores/{storeId}/branding/` en Firebase Storage; la tienda pública muestra el logo cuando existe y un enlace accesible a Google Maps cuando hay coordenadas. Las tiendas sin estos campos siguen funcionando sin cambios.

## Acceso con Google

En Firebase Console, activá **Authentication → Sign-in method → Google** y agregá `JuanCGomezS.github.io` a **Authentication → Settings → Authorized domains** para GitHub Pages. El botón Google sirve para entrar con una cuenta ya registrada; desde **Registrarme** abre Google, pide confirmar el nombre y crea solo un perfil `customer`. Si el documento `users/{uid}` ya existe, se conservan rol y vínculo de tienda; el cliente nunca puede asignarlos.

## Estados y seguimiento de pedidos

Mesa/recogida: **Solicitado → Confirmado → En preparación → Listo → Entregado**. Domicilio añade **En camino** entre Listo y Entregado. El panel solo muestra acciones válidas; aceptación descuenta stock y cancelar antes de entrega lo repone según el flujo existente.

Al confirmar, el cliente recibe un código de alta entropía y un enlace de seguimiento que puede copiar o compartir. El negocio puede reenviarlo manualmente por WhatsApp. El documento público de seguimiento contiene solamente modalidad, estado y marcas de tiempo; Firestore permite lectura directa por código, pero bloquea listados y escrituras públicas.
