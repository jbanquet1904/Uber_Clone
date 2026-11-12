# UberClone — Versión Conductor

App móvil del conductor, inspirada en Uber, hecha con **React Native + Expo (SDK 58)** para iOS y Android. El conductor:

1. Se registra con sus datos, su vehículo y sus documentos.
2. Se pone Disponible y comparte su ubicación en tiempo real.
3. Recibe solicitudes con 15 segundos para aceptar o rechazar.
4. Navega al punto de recogida y luego al destino.
5. Cobra con **Mercado Pago** (modo de prueba) o en efectivo.
6. Consulta sus ganancias netas y su historial.

## Tecnologías

| Para qué | Qué se usó |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19 |
| Navegación | React Navigation 7: **Tabs** (registro), **Drawer** (menú) y **Stack** (viaje e historial) |
| Base de datos y tiempo real | Firebase Firestore (`onSnapshot`) |
| Fotos | Cloudinary (subida *unsigned*) |
| Mapa y ubicación | `react-native-maps` (Apple Maps en iPhone, Google Maps en Android) y `expo-location` |
| Rutas | Google **Routes API** si hay key; si no, OSRM (gratis, sin key); si tampoco responde, una estimación |
| Pagos | Backend Node.js/Express + Mercado Pago Checkout Pro + Firebase Admin |

## Estructura

```
App.js                     Providers (idioma y sesión) + NavigationContainer
src/
  config/                  pricing.js (tarifas y comisión), Firebase, opciones de los formularios
  context/                 DriverContext: sesión, perfil y viaje activo
  hooks/                   useDriverLocation, useLocationPublisher, useTripRequests, useEarnings, useTripHistory
  i18n/                    Español / inglés
  navigation/              RootNavigator, RegistrationTabs, DrawerNavigator, TripStack, HistoryStack
  screens/                 registration/, trip/, history/, Ganancias, Perfil, Configuración, Ingresar
  services/                Firestore, Cloudinary, rutas, pagos, simulador de solicitudes
  utils/                   calculateFare, validaciones, fechas, ganancias, geo
backend/                   Servidor de pagos (Express + Mercado Pago + Firebase Admin)
docs/AI_LOG.md             Bitácora de uso de IA
firestore.indexes.json     Índices compuestos que necesita el historial
```

## Instalación de la app

Requisitos: Node.js 20 o superior y la app **Expo Go** en el teléfono. Para entrar al flujo de pagos, el teléfono y el computador deben estar en la misma red Wi-Fi.

```bash
npm install
cp .env.example .env      # y llena los valores (ver abajo)
npx expo start -c
```

Escanea el código QR con la cámara del iPhone (o con Expo Go en Android). Si cambias el `.env`, reinicia con `npx expo start -c`: las variables `EXPO_PUBLIC_` se leen al compilar.

## Variables de entorno

### App (`.env`; la plantilla es `.env.example`)

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | Configuración web del proyecto de Firebase |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` / `_UPLOAD_PRESET` | Subida de fotos con un preset *unsigned* |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Opcional. Routes API; sin ella se usa OSRM |
| `EXPO_PUBLIC_API_URL` | Opcional. URL del backend de pagos. Vacía: en desarrollo se usa el computador que corre Expo, puerto 3000 |

Las variables `EXPO_PUBLIC_` quedan dentro de la app y cualquiera puede leerlas: **nunca** van ahí llaves secretas.

### Backend (`backend/.env`; la plantilla es `backend/.env.example`)

| Variable | Para qué |
|---|---|
| `MP_ACCESS_TOKEN` | Access token **de prueba** del vendedor de Mercado Pago (lo único obligatorio) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Opcional. Ruta al JSON de la cuenta de servicio de Firebase. Vacío: el backend usa la configuración web del `.env` de la raíz |
| `PORT` | Puerto (por defecto 3000) |
| `PUBLIC_URL` | Opcional. URL pública `https` (ngrok) para las URL de retorno y el webhook |
| `MP_WEBHOOK_SECRET` | Opcional. Clave para validar la firma `x-signature` del webhook |

## Firebase

1. Crea una base de datos **Firestore**. En modo de prueba, las reglas permiten todo durante 30 días; después todas las lecturas y escrituras fallan con `permission-denied`, así que hay que extender la fecha en **Firestore › Reglas**.
2. **Índices.** El historial filtra por conductor y por fechas, y para eso necesita dos índices compuestos, que están en `firestore.indexes.json`. Hay dos formas de crearlos:
   - La primera vez que abras Historial, en la terminal de Expo aparece un error con un **enlace para crear el índice**: ábrelo y espera unos minutos.
   - O, con Firebase CLI: `firebase deploy --only firestore:indexes`.
3. **Aprobar un conductor.** No hay panel de administración, así que se aprueba desde la consola: en `drivers/{id}`, cambia `status` de `pending` a `approved`. Para rechazarlo, usa `rejected` y agrega un campo `rejectionReason`. La app cambia de pantalla sola.

### Colecciones

| Colección | Contenido |
|---|---|
| `drivers/{id}` | Registro del conductor: `status`, `personal`, `vehicle`, `documents` y `terms` |
| `driverLocations/{driverId}` | `available`, `location` (GeoPoint), `heading` y `updatedAt` (latido). Va aparte para no exponer el perfil |
| `trips/{id}` | Viaje: `status`, `origin`, `destination`, `distanceKm`, `durationMin`, `category`, `fare`, `commission`, `tip`, `driverEarnings`, `commissionRate`, `paymentMethod`, `paymentStatus`, `paymentId`, `rating`, `createdAt` y `completedAt` |

Estados del viaje: `requested` → `accepted` → `driver_arriving` → `in_progress` → `completed` → `paid`. Además están `rejected` (rechazado o vencido) y `cancelled` (cancelado antes de `in_progress`).

## Backend de pagos

```bash
cd backend && npm install && cd ..
cp backend/.env.example backend/.env   # pega el MP_ACCESS_TOKEN de prueba
npm run backend                        # desde la raíz: arranca el backend en el puerto 3000
npm --prefix backend test              # pruebas del cobro con dobles (no tocan Firebase ni Mercado Pago)
```

1. **Firestore desde el backend.** Si `GOOGLE_APPLICATION_CREDENTIALS` está vacío, el backend usa la misma configuración web del `.env` de la raíz, y eso funciona mientras Firestore esté en modo de prueba. Para producción hay que usar una cuenta de servicio: en la consola de Firebase, ve a **Configuración del proyecto › Cuentas de servicio › Generar nueva clave privada**, guarda el JSON como `backend/serviceAccountKey.json` (ya está en `.gitignore`: da permisos de administrador) y pon esa ruta en la variable. Así el backend usa Firebase Admin, y las reglas pueden dejar que solo el backend marque un viaje como pagado.
2. **La app encuentra sola el backend.** En desarrollo usa el mismo computador que sirve la app en Expo Go, en el puerto 3000. Solo hay que llenar `EXPO_PUBLIC_API_URL` si el backend corre en otro lado. Si Windows pregunta por el firewall, permite el acceso en redes privadas.
3. **Flujo de cobro:**
   1. Al finalizar el viaje, la app calcula la tarifa final con `calculateFare`.
   2. La app manda al backend solo el `tripId`. El backend lee el monto del viaje en Firestore, crea la preferencia de Checkout Pro y devuelve el enlace de pago.
   3. La app abre el checkout y el pasajero paga con una tarjeta de prueba.
   4. Al cerrar el checkout, la app le pide al backend que verifique. El backend consulta el pago en Mercado Pago, comprueba el monto y actualiza `paymentStatus`, `paymentId` y `status: paid`.
   5. La app escucha el viaje en tiempo real y muestra el resumen.
4. **Webhook (opcional).** Mercado Pago exige `https` y no acepta `localhost` en las URL de retorno ni en el webhook. Si expones el backend con `ngrok http 3000` y pones esa URL en `PUBLIC_URL`, se agregan `back_urls`, `auto_return` y `notification_url`. Sin eso, el pago se confirma cuando el conductor cierra el checkout.

### Mercado Pago de prueba

1. En [Mercado Pago Developers](https://www.mercadopago.com.co/developers), crea una aplicación de **Checkout Pro** y copia el **Access Token de prueba** en `backend/.env`.
2. Paga con una [tarjeta de prueba](https://www.mercadopago.com.co/developers/es/docs/checkout-pro/integration-test/test-cards). El **nombre del titular** decide el resultado: `APRO` aprueba, `OTHE` rechaza y `CONT` queda pendiente.
3. Durante todo el proyecto se usan solo credenciales de prueba.

## Probar el flujo completo (guion del video)

1. **Registro:** llena las tres pestañas y toca *Enviar registro*. La cuenta queda **Pendiente**.
2. **Aprobación:** en la consola de Firebase, pon `status: approved`. La app entra sola a Inicio.
3. **Disponible:** prende el interruptor. En `driverLocations` aparece tu ubicación.
4. **Solicitud:** toca *Simular solicitud (dev)*. Ese botón solo existe en desarrollo y hace el papel de la app del pasajero. Llega la tarjeta con 15 segundos; tócala para **Aceptar**.
5. **Viaje:** se ve la ruta hasta la recogida. Toca *Pasajero a bordo*, la ruta cambia al destino, y después toca *Finalizar viaje*.
6. **Cobro:**
   - Mercado Pago: toca *Cobrar con Mercado Pago*, paga con la tarjeta `APRO` y cierra el checkout. El estado pasa a **Aprobado**.
   - Efectivo: toca *Recibí … en efectivo*.
7. **Historial y Ganancias:** en el menú, Historial muestra el viaje con su ruta y Ganancias muestra los totales del día y el saldo.

Otros casos para probar:
- Rechazar una solicitud o dejar que se venza.
- Cancelar el viaje desde la consola (`status: cancelled`): la app vuelve sola a Inicio.
- Cerrar la app con un viaje activo: al abrirla vuelve al viaje.
- Cerrar sesión en Configuración y volver a entrar con el documento y el celular.

## Tarifa, comisión y ganancias

Todo se configura en `src/config/pricing.js`:
- Base: 3.500 COP.
- 1.200 COP por km y 250 COP por minuto.
- Mínima: 6.000 COP.
- Multiplicadores: Económico 1,0, XL 1,4 y Premium 1,8.
- Comisión: 20 %.

`calculateFare({ distanceKm, durationMin, category, tip })` es una sola función pura. La usan:
- **La estimación**, al crear la solicitud.
- **El cierre**, con la distancia de la ruta real y la duración real. En el cierre se pasa el `commissionRate` guardado en el viaje.

La tarifa se redondea a múltiplos de 100 COP, y la propina va completa al conductor.

El **saldo** es la ganancia de los viajes pagados por la pasarela menos las comisiones de los viajes en efectivo, y puede quedar negativo.

## Decisiones técnicas

- **Routes API en vez de Directions y Distance Matrix:** Google pasó esas dos APIs a *Legacy* en marzo de 2025 y no se pueden activar en proyectos nuevos. La ruta se pide una vez por tramo (al crear, al aceptar y al recoger), nunca en cada actualización de ubicación. Si no hay key, o Google no responde, se usa OSRM.
- **Apple Maps en iPhone:** Google Maps en iOS necesita la key dentro de una compilación nativa, y Expo Go no lo permite. La ruta es un servicio web y se dibuja con `Polyline` sobre cualquier mapa.
- **La solicitud es una tarjeta sobre el mapa, no un modal.** Un modal le quita el foco a Inicio, y el conductor quedaría No disponible justo al decidir.
- **Transacciones (`runTransaction`)** para aceptar, rechazar y cada cambio de estado. Si el tiempo se vence justo cuando el conductor acepta, gana exactamente una de las dos operaciones.
- **Navegación condicional:** el `status` del conductor decide entre registro, pendiente y app, y el `status` del viaje decide qué pantalla del viaje se muestra.
- **AsyncStorage solo guarda preferencias y punteros:** sesión `{ id, status }`, id del viaje activo, último estado de disponibilidad e idioma. Nunca guarda datos personales ni coordenadas.

## Limitaciones conocidas

- **Sin Firebase Auth.** Ingresar con documento y celular no es seguro, y las reglas de Firestore están en modo de prueba. La solución real es Firebase Auth (por ejemplo, por SMS) con reglas que comparen `request.auth.uid`.
- **Expo Go no permite ubicación en segundo plano ni notificaciones push.** Por eso, en segundo plano el conductor queda No disponible y las solicitudes se avisan con vibración solo con la app abierta. Para producción haría falta un *development build*.
- **No hay despachador.** El simulador ofrece cada solicitud a tu propio conductor. Si la rechazas, queda `rejected`, con tu id en `declinedBy` para que un backend futuro se la ofrezca a otro conductor.
- **Las fotos de un registro cancelado quedan en Cloudinary.** Borrarlas exige la API firmada, que debe vivir en un backend.

## Uso de IA

En este proyecto se usó inteligencia artificial (Claude) como asistente de programación. Cada uso está registrado en la bitácora [`docs/AI_LOG.md`](docs/AI_LOG.md), con el prompt, el resumen de la respuesta, qué se usó, modificó o descartó, los archivos y commits afectados y cómo se verificó. Los bloques de código asistidos llevan el comentario `// AI-assisted: see docs/AI_LOG.md #N`. La bitácora también se entrega exportada a PDF.
