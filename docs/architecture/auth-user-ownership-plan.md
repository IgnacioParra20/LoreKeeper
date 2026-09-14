# Plan de Auth + User + propiedad de Universe

Estado: implementado y migrado en el entorno local. Se conserva debajo el diseño aprobado como referencia.
Fecha: 13 de septiembre de 2026.

## Objetivo y alcance

Una persona podrá registrarse, iniciar sesión, recuperar su sesión al recargar, cerrar sesión y administrar exclusivamente sus universos. La sesión persistirá en PostgreSQL. Al cerrar esta vertical, ninguna ruta de Universe permitirá acceso anónimo ni acceso a universos ajenos.

El alcance comprende registro con email y contraseña, login, logout, consulta del usuario actual, sesiones, propiedad de Universe, interfaz mínima y pruebas. Verificación de email, recuperación de contraseña, proveedores externos, MFA, cambio de email, eliminación de cuentas y colaboración se abordarán después. Esta primera entrega se valida en entorno local; la apertura de registro al público requiere primero definir verificación de email y recuperación de cuentas. Registrar una dirección no demostrará propiedad del buzón.

No se incorporan Redis, colas, IA, roles administrativos ni módulos narrativos adicionales.

## Punto de partida verificado

- El monorepo separa web, API, tipos y validaciones compartidas.
- Universe tiene UUID, nombre, descripción, estado y fechas; no tiene propietario.
- Las rutas de Universe son públicas y su repositorio consulta por identificador sin contexto de usuario.
- La API ya tiene errores uniformes y correlationId.
- Web consume rutas relativas mediante los proxies de Vite y Nginx.
- Las pruebas HTTP usan un repositorio en memoria. El CI dispone de PostgreSQL, pero esa suite no prueba el aislamiento con Prisma real.

## Decisiones propuestas

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Acceso | Email y contraseña | Encaja con el backend propio y evita depender de un proveedor externo en esta vertical. |
| Sesión | Token opaco en cookie; sesión persistida en PostgreSQL | Permite revocar sesiones y sobrevive al reinicio de la API. |
| Contraseñas | Argon2id, mediante una biblioteca mantenida | El hash y su verificación permanecen exclusivamente en la API. |
| Propiedad | Un propietario obligatorio por universo | Conserva un límite claro antes de incorporar colaboración. |
| Despliegue web | Frontend y /api bajo un mismo origen | Aprovecha los proxies existentes y simplifica cookies y CSRF. |
| Autorización | Filtrar por usuario en persistencia, también al escribir | Evita que conocer un UUID otorgue acceso al recurso. |

Los valores siguientes son políticas iniciales de LoreKeeper, revisables al implementar y medir. No son requisitos universales: contraseña de 15 a 128 caracteres, sin recorte ni transformación silenciosa; email recortado y convertido a minúsculas como identidad de acceso del producto, sin eliminar puntos ni sufijos con '+'. La validación será compartida y la unicidad estará respaldada por PostgreSQL.

Argon2id comenzará con al menos 19 MiB de memoria, dos iteraciones y paralelismo uno, ajustando el coste tras medirlo en el contenedor. Se usará una sal aleatoria gestionada por la biblioteca. Referencia: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Modelo de datos previsto

| Entidad | Campos principales | Restricciones |
| --- | --- | --- |
| User | id UUID, email, passwordHash, status ACTIVE/DISABLED, createdAt, updatedAt | Email normalizado único. passwordHash nunca se serializa. |
| Session | id UUID, userId UUID, tokenHash, csrfTokenHash, createdAt, lastSeenAt, expiresAt | tokenHash único; FK a User; índices por userId y expiresAt. |
| Universe | Campos actuales más ownerId UUID | FK obligatoria a User; índice compuesto por ownerId y updatedAt. |

User tendrá muchos Universe y muchas Session. La eliminación de un usuario quedará restringida si posee universos; no se borrará contenido narrativo en cascada. Sus sesiones sí podrán eliminarse en cascada. Esta vertical no expondrá un endpoint para eliminar usuarios ni cambiar propietarios.

El DTO público de User incluirá únicamente id, email, status y fechas. Session será un modelo interno. El DTO público de Universe puede conservar su forma actual: el cliente no necesita elegir ni enviar ownerId.

## Sesiones y protección de solicitudes

Al autenticar se generará un token aleatorio de 32 bytes con un generador criptográfico. Solo se guardará su SHA-256 en Session; el token original viajará en una cookie HttpOnly. Se emitirá una sesión nueva al registrar o iniciar sesión, y se invalidará la sesión previa de ese navegador si existe. Otros dispositivos conservarán sus sesiones.

La cookie de producción será host-only, Path=/, Secure y SameSite=Lax, con prefijo __Host-. En HTTP local se usará otro nombre sin Secure. No se guardarán tokens de sesión en localStorage. La API comprobará la sesión, su vencimiento y el estado del usuario en cada solicitud protegida. Las respuestas de autenticación y contenido privado llevarán Cache-Control: no-store.

Como política inicial, habrá un vencimiento absoluto de siete días y uno por inactividad de 24 horas, ambos aplicados por el servidor. lastSeenAt se actualizará como máximo una vez cada cinco minutos. Logout eliminará la sesión actual y la cookie; un token vencido o eliminado será inutilizable incluso si se conserva una copia. La limpieza periódica de filas expiradas será mantenimiento, nunca la condición para negar acceso.

Para CSRF, las escrituras autenticadas requerirán X-CSRF-Token, validado contra csrfTokenHash. Se generará al crear la sesión y se devolverá con los datos de autenticación; GET /api/auth/csrf permitirá reemplazarlo al recargar. El cliente lo mantendrá en memoria. La rotación deberá manejarse entre pestañas: una escritura rechazada por CSRF podrá renovar el token y reintentarse una sola vez, únicamente si el middleware garantiza rechazo antes de ejecutar el controlador.

Además, todas las escrituras del navegador, incluido registro y login, exigirán un Origin exacto de la lista configurada y Content-Type: application/json cuando tengan cuerpo. Origen ausente o no autorizado será rechazado; las pruebas HTTP deberán enviarlo explícitamente. CORS no reflejará orígenes arbitrarios con credenciales. El middleware se ejecutará antes de cualquier efecto de negocio. SameSite se considera una protección complementaria, no sustituto del control CSRF. Referencia: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Registro y login tendrán límites configurables por IP y, para login, también por email normalizado. Como inicio: 5 registros por hora/IP, 20 intentos de login por 15 minutos/IP y 10 por 15 minutos/email. Se responderá 429 con Retry-After. Para una sola instancia se admite almacenamiento acotado en memoria; reiniciar perderá los contadores. Antes de escalar a varias instancias se deberá compartir ese estado. No se habilitará trust proxy indiscriminadamente.

## Contrato HTTP previsto

Las respuestas conservarán los sobres data y error actuales. Las credenciales, hashes y cookies no aparecerán en errores ni logs.

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| POST /api/auth/register | email, password | 201, usuario público y csrfToken; cookie de sesión. |
| POST /api/auth/login | email, password | 200, usuario público y csrfToken; cookie nueva. |
| GET /api/auth/me | Cookie | 200, usuario público; 401 si no hay sesión válida. |
| GET /api/auth/csrf | Cookie | 200, csrfToken nuevo; invalida el token CSRF previo de esa sesión. |
| POST /api/auth/logout | Cookie y X-CSRF-Token | 204; sesión revocada y cookie eliminada. |
| Rutas actuales /api/universes | Sesión; además CSRF en escrituras | Mismos contratos, restringidos al propietario autenticado. |

GET /api/auth/csrf no modificará contenido de usuario y no será accesible mediante CORS a otros orígenes. /health seguirá siendo público. Swagger documentará las cookies, la cabecera CSRF y todos los estados nuevos.

| Situación | HTTP y código |
| --- | --- |
| Datos inválidos, incluidos campos extra como ownerId | 400, código de validación existente. |
| Email o contraseña incorrectos, o usuario deshabilitado al hacer login | 401, INVALID_CREDENTIALS, mismo mensaje genérico. |
| Sesión ausente, vencida, revocada o usuario deshabilitado | 401, UNAUTHENTICATED. |
| Origen o token CSRF rechazado | 403, REQUEST_ORIGIN_FORBIDDEN o CSRF_INVALID. |
| Universo inexistente o perteneciente a otra persona | 404, UNIVERSE_NOT_FOUND en ambos casos. |
| Email ya registrado | 409, REGISTRATION_UNAVAILABLE. |
| Límite de solicitudes alcanzado | 429, RATE_LIMITED. |

El 409 de registro permite inferir si una dirección está registrada aunque el mensaje sea genérico. Se acepta provisionalmente en la fase local; una inscripción pública deberá revisar este contrato junto con el flujo de correo. El login no distinguirá cuentas inexistentes de contraseñas incorrectas y realizará una verificación Argon2 contra un hash ficticio válido cuando no exista la cuenta.

## Autorización en Universe

1. Un middleware obtiene la identidad exclusivamente de una sesión válida.
2. El controller entrega ese contexto al servicio como dato tipado, separado del DTO de entrada.
3. El servicio requiere ownerId para cada caso de uso; el repositorio ofrece operaciones restringidas por propietario.
4. Crear establece ownerId desde la identidad. Los schemas estrictos rechazan un ownerId enviado por el cliente.
5. Listar filtra por ownerId; consultar, actualizar y borrar usan id más ownerId en la propia consulta.
6. Actualizar y borrar no dependerán solo de una lectura previa: la escritura también comprobará la propiedad, con cero filas afectadas traducido a 404.

El borrado físico de Universe continúa mientras no haya contenido dependiente, como establece la arquitectura vigente. No habrá transferencia de propiedad en esta vertical.

## Migración sin inventar propietarios

No se asumirá que la base continúa vacía porque se haya limpiado durante una prueba anterior. Antes de migrar se hará un inventario actualizado.

**Base vacía:** crear User y Session y agregar ownerId obligatorio directamente. Esta migración deberá fallar con un diagnóstico claro si encuentra universos existentes, antes de aplicar una asignación implícita.

**Base con universos:** respaldar, poner la aplicación en mantenimiento y ejecutar una transición separada. Crear las tablas nuevas y ownerId temporalmente nullable; crear o identificar una cuenta real mediante un procedimiento de bootstrap fuera de HTTP público; obtener una asignación explícita universo → usuario; validar claves, conteos y ausencia de nulos; finalmente aplicar NOT NULL y desplegar la aplicación protegida. No se asignará todo al primer usuario que se registre.

La fase nullable será exclusivamente transitoria y no coexistirá con tráfico de la API pública anterior. Las migraciones de expansión y cierre se ejecutarán por etapas para permitir el backfill entre ambas. Se probarán en una copia antes de tocar datos reales. Si falla el cierre, se mantendrá el mantenimiento hasta resolverlo; no se eliminarán registros como recuperación automática ni se reabrirá la API sin protección.

## Cambios previstos por área

- API: módulos auth y users, repositorios de usuarios/sesiones, servicio de hash, middleware de autenticación y CSRF, límites de acceso y filtros de propiedad. Se conservará la inyección de dependencias para pruebas.
- Validación: schemas estrictos de registro y login. Compartidos: DTO público de usuario y respuestas de autenticación; ningún modelo con passwordHash.
- Web: pantallas simples de registro/login, consulta de sesión al iniciar, carga de universos solo después de autenticar y cierre de sesión. Al cambiar de usuario o recibir 401 se vaciarán lista, mensajes y estado privado, cancelando solicitudes en curso para impedir que una respuesta tardía restaure datos anteriores.
- Cliente HTTP: envío de cookies, gestión en memoria del token CSRF y manejo explícito de 401/403. Los 401 de login deben mostrarse como credenciales inválidas y no activar bucles de redirección.
- Infraestructura: parámetros de sesión y orígenes permitidos, HTTPS para producción, validación de cookies a través de Nginx y biblioteca Argon2 compatible con Node/Alpine.
- Documentación: OpenAPI, README, variables de ejemplo y procedimiento de migración. El estado actual solo se actualizará después de verificar la implementación.

## Orden de implementación y criterios de aceptación

| Paso | Trabajo | Evidencia para darlo por terminado |
| --- | --- | --- |
| 1 | Contratos, modelo e inventario de datos | DTOs definidos; estrategia de migración elegida según datos reales. |
| 2 | User, hash y registro | Email normalizado único incluso con registros concurrentes; ninguna contraseña o hash en respuestas. |
| 3 | Login, sesiones, logout y CSRF | Cookie correcta; sesión persiste tras reinicio; logout, expiración y usuario deshabilitado impiden reutilización. |
| 4 | Propiedad de Universe | Usuarios A y B aislados en POST, GET listado/detalle, PATCH y DELETE; UUID ajeno devuelve 404. |
| 5 | Interfaz conectada | Registro → crear universo → recargar → logout → login; cambio de cuenta sin datos de la anterior. |
| 6 | Migración y entrega | Migraciones, pruebas reales con PostgreSQL, documentación, tipos, lint, build y Docker verificados. |

La suite incluirá tests unitarios de validación y servicios, HTTP con cookies y CSRF, y una suite de integración con Prisma y una base PostgreSQL de pruebas separada. Se probarán la migración desde una base vacía y desde una copia con universos, sin limpiar nunca la base de desarrollo para ejecutar tests. CI deberá ejecutar explícitamente esta suite real además de la suite en memoria.

Casos de fallo obligatorios: contraseña incorrecta, token manipulado, sesión expirada/revocada, ownerId inyectado, origen no permitido, CSRF ausente o incorrecto, límites de login, intento de acceso cruzado y respuesta tardía del usuario anterior en web. Las escrituras rechazadas deberán dejar los datos sin cambios.

## Resultado esperado

Al terminar la implementación, cada universo tendrá un propietario real y no nulo, la API hará cumplir su acceso, y la interfaz mostrará únicamente el archivo de la persona autenticada. Works podrá incorporarse después heredando la autorización a través de Universe.

Este archivo define el trabajo siguiente. No afirma que esos comportamientos ya estén disponibles.
