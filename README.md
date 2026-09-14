# LoreKeeper

LoreKeeper es un sistema de información para escritores, guionistas, autores de fanfiction, creadores de cómics y worldbuilders que necesitan organizar universos narrativos complejos. Su objetivo es conservar una fuente coherente para obras, personajes, eventos, reglas y canon, y preparar la base de futuras comprobaciones de continuidad.

## Estado actual

La versión funcional actual implementa la base técnica, Universe y autenticación con propiedad:

- monorepo con npm workspaces;
- cliente React + TypeScript + Vite;
- API Node.js + Express con errores uniformes y `correlationId`;
- CRUD de `Universe` validado con Zod;
- PostgreSQL + Prisma y migración inicial;
- OpenAPI y Swagger;
- pruebas unitarias, HTTP y de interfaz;
- Docker Compose para ejecutar web, API y base de datos.
- registro y login con email/contraseña, Argon2id y sesiones revocables en PostgreSQL;
- cookies HttpOnly, CSRF, vencimiento y límites de acceso;
- universos privados con ownerId obligatorio y autorización en todas las consultas.

Todavía no incluye verificación de email, recuperación de contraseña, obras, personajes, timeline, canon ni Continuity Engine. La cuenta local no verifica el control del buzón; el registro público requiere completar primero los flujos de correo y recuperación.

## Stack

| Área | Tecnología |
| --- | --- |
| Web | React, TypeScript, Vite |
| API | Node.js, TypeScript, Express |
| Datos | PostgreSQL, Prisma ORM |
| Validación | Zod |
| Pruebas | Vitest, Supertest, Testing Library |
| Contrato | OpenAPI 3.1, Swagger UI |
| Infraestructura | Docker, Docker Compose, GitHub Actions |

## Estructura

```text
apps/
  api/          API, módulo Universe y Prisma
  web/          interfaz inicial de universos
packages/
  shared/       tipos estables compartidos
  validation/   esquemas Zod y tipos de entrada
docs/
  architecture/ decisiones y evolución prevista
  design/       referencia visual de la primera pantalla
.github/workflows/ci.yml
docker-compose.yml
```

## Requisitos

- Node.js 20.19 o superior (se recomienda Node.js 22)
- npm 10 o superior
- Docker Desktop con Docker Compose

## Instalación local

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:deploy
npm run dev
```

En Bash, reemplaza `Copy-Item .env.example .env` por `cp .env.example .env`.

Si la base contiene universos de la versión anterior, sigue primero [la migración por etapas](docs/architecture/auth-migration.md). No ejecutes el cierre sin asignar propietarios. Una base nueva puede aplicar todas las migraciones normalmente.

La aplicación web queda en `http://localhost:5173` y la API en `http://localhost:3001`. El servidor de Vite redirige `/api` a la API durante el desarrollo.

Abre la web y crea una cuenta con email y una contraseña de 15 a 128 caracteres. Registro y login inician una sesión; al recargar se recupera desde PostgreSQL. Cerrar sesión la revoca. Los universos se crean siempre para la identidad autenticada y no aceptan ownerId desde el navegador.

## Ejecución completa con Docker

```bash
docker compose up -d --build
```

Este comando levanta PostgreSQL con volumen persistente, aplica las migraciones al iniciar la API y publica la aplicación en `http://localhost:5173`.

```bash
docker compose logs -f api
docker compose down
```

`docker compose down` conserva el volumen. Usa `docker compose down -v` solo cuando quieras borrar deliberadamente los datos locales.

## Variables de entorno

Copia `.env.example` como `.env`. Las variables principales son:

- `DATABASE_URL`: conexión que utiliza Prisma en ejecución local.
- `PORT`: puerto de la API; por defecto `3001`.
- `CORS_ORIGIN`: origen permitido para la aplicación web.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_PORT`: configuración del contenedor de PostgreSQL.
- `WEB_PORT`: puerto público del frontend en Docker.
- `VITE_API_URL`: URL explícita de la API; normalmente queda vacía para usar el proxy.
- `COOKIE_SECURE`: false solo para HTTP local; true con HTTPS. Se usa cookie host-only, HttpOnly, SameSite=Lax y Path=/; HTTPS agrega Secure y el prefijo __Host-.
- `SESSION_ABSOLUTE_HOURS` / `SESSION_IDLE_HOURS`: 168 / 24 por defecto. El servidor comprueba ambos vencimientos.
- `AUTH_REGISTER_LIMIT` / `AUTH_LOGIN_IP_LIMIT` / `AUTH_LOGIN_EMAIL_LIMIT`: 5 registros/hora/IP, 20 logins/15 minutos/IP y 10/15 minutos/email. Contadores acotados en memoria para una instancia; reiniciar los pierde. El proxy local puede agrupar varias conexiones bajo una IP. Un despliegue con proxy público debe configurar una cadena de confianza precisa y volver a verificar estos límites.
- `TEST_DATABASE_URL`: conexión a una base exclusiva llamada lorekeeper_test, separada de los datos locales.

`.env` está ignorado por Git y `.env.example` no contiene secretos de producción.

## Scripts

```bash
npm run dev             # API y web en modo desarrollo
npm run build           # compila todos los workspaces
npm test                # ejecuta las pruebas
npm run typecheck       # comprueba TypeScript estricto
npm run lint            # comprueba reglas estáticas
npm run prisma:validate # valida el schema de Prisma
npm run prisma:generate # genera Prisma Client
npm run db:migrate      # crea una migración durante desarrollo
npm run db:deploy       # aplica migraciones existentes
npm run db:expand       # aplica solo hasta expansión de Auth, durante mantenimiento
npm run db:assign-owner -- email UUID-1 UUID-2 # asignación offline explícita
npm run test:integration # Prisma/PostgreSQL real; requiere TEST_DATABASE_URL
```

## API

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/health` | Estado de API y base de datos |
| POST | `/api/auth/register` | Registro y sesión |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/auth/csrf` | Renueva el token CSRF |
| POST | `/api/auth/logout` | Revoca sesión actual |
| POST | `/api/universes` | Crear universo |
| GET | `/api/universes` | Listar universos |
| GET | `/api/universes/:id` | Consultar universo |
| PATCH | `/api/universes/:id` | Actualizar universo |
| DELETE | `/api/universes/:id` | Eliminar universo en esta fase |

Swagger UI está disponible en `http://localhost:3001/api/docs` y el documento JSON en `/api/docs.json`.

Las rutas de universos requieren la cookie de sesión. Todas las escrituras exigen un Origin idéntico a CORS_ORIGIN; cuando hay cuerpo, application/json. Las escrituras autenticadas también requieren X-CSRF-Token. Registro/login entregan ese token y GET /api/auth/csrf permite renovarlo. El cliente web lo conserva solo en memoria y reintenta una vez si el middleware rechaza un token CSRF obsoleto antes de ejecutar la operación.

Sin sesión se responde 401. Origen o CSRF inválidos producen 403. Un universo ajeno devuelve el mismo 404 que uno inexistente. Las respuestas privadas llevan Cache-Control: no-store. Swagger debe usarse con el origen permitido (el proxy web también expone `/api/docs`); las cookies HttpOnly las administra el navegador.

Los errores siguen este contrato:

```json
{
  "error": {
    "code": "UNIVERSE_NOT_FOUND",
    "message": "Universe not found",
    "correlationId": "..."
  }
}
```

## Decisiones de esta fase

Auth y User usan sesiones opacas persistidas; no hay JWT ni tokens en localStorage. Cada Universe tiene un ownerId obligatorio con clave foránea a User. Los usuarios no se eliminan en cascada con su contenido. El [plan de la vertical](docs/architecture/auth-user-ownership-plan.md) explica las decisiones y [el procedimiento de migración](docs/architecture/auth-migration.md) describe expansión, asignación y cierre.

Para probar la persistencia real, crea la base separada con `docker compose exec postgres createdb -U lorekeeper lorekeeper_test`, configura TEST_DATABASE_URL y ejecuta `npm run test:integration`. La suite crea y elimina únicamente sus schemas aleatorios dentro de esa base. El CI ejecuta las pruebas en memoria y esta integración. En equipos con poca memoria, ejecuta Vitest con un solo worker.

Los respaldos y credenciales de bootstrap se guardan en `.local/`, ignorada por Git y Docker. El bootstrap genera una contraseña aleatoria para una cuenta de prueba nueva, sin enviarla por correo y sin sobrescribir credenciales existentes.

El borrado actual es físico. Antes de que universos contengan obras o referencias históricas, la operación normal migrará a archivado y la eliminación irreversible requerirá confirmación reforzada.

Consulta [la arquitectura](docs/architecture/README.md) para el flujo de dependencias y la evolución del modelo.

## Roadmap resumido

1. Verificación de email y recuperación de cuentas antes de abrir el registro al público.
2. Works y relaciones entre obras.
3. Characters globales y participaciones por obra.
4. Arcs y Chapters.
5. Events y timeline global.
6. Reglas, canon y excepciones.
7. Continuity Engine determinista y explicable.
