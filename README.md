# LoreKeeper

LoreKeeper es un sistema de información para escritores, guionistas, autores de fanfiction, creadores de cómics y worldbuilders que necesitan organizar universos narrativos complejos. Su objetivo es conservar una fuente coherente para obras, personajes, eventos, reglas y canon, y preparar la base de futuras comprobaciones de continuidad.

## Estado actual

La versión `0.1.0` implementa la base técnica y la primera vertical del dominio:

- monorepo con npm workspaces;
- cliente React + TypeScript + Vite;
- API Node.js + Express con errores uniformes y `correlationId`;
- CRUD de `Universe` validado con Zod;
- PostgreSQL + Prisma y migración inicial;
- OpenAPI y Swagger;
- pruebas unitarias, HTTP y de interfaz;
- Docker Compose para ejecutar web, API y base de datos.

Todavía no incluye autenticación, obras, personajes, timeline, canon ni Continuity Engine.

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

La aplicación web queda en `http://localhost:5173` y la API en `http://localhost:3001`. El servidor de Vite redirige `/api` a la API durante el desarrollo.

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
```

## API

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/health` | Estado de API y base de datos |
| POST | `/api/universes` | Crear universo |
| GET | `/api/universes` | Listar universos |
| GET | `/api/universes/:id` | Consultar universo |
| PATCH | `/api/universes/:id` | Actualizar universo |
| DELETE | `/api/universes/:id` | Eliminar universo en esta fase |

Swagger UI está disponible en `http://localhost:3001/api/docs` y el documento JSON en `/api/docs.json`.

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

Auth y User se implementarán como una vertical posterior. `Universe` no incluye por ahora un propietario opcional ni una identidad simulada. La transición prevista agrega `ownerId` mediante una migración controlada cuando exista un modelo de usuario real.

El borrado actual es físico. Antes de que universos contengan obras o referencias históricas, la operación normal migrará a archivado y la eliminación irreversible requerirá confirmación reforzada.

Consulta [la arquitectura](docs/architecture/README.md) para el flujo de dependencias y la evolución del modelo.

## Roadmap resumido

1. Auth + User y propiedad de universos.
2. Works y relaciones entre obras.
3. Characters globales y participaciones por obra.
4. Arcs y Chapters.
5. Events y timeline global.
6. Reglas, canon y excepciones.
7. Continuity Engine determinista y explicable.

