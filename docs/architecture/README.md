# Arquitectura inicial de LoreKeeper

LoreKeeper comienza con una arquitectura monolítica modular dentro de un monorepo. La primera vertical implementa `Universe` de extremo a extremo y conserva límites claros para agregar las siguientes entidades sin introducir microservicios ni infraestructura prematura.

## Componentes actuales

- `apps/web`: cliente React, TypeScript y Vite. Consume únicamente el contrato HTTP público.
- `apps/api`: API Express modular. Traduce HTTP a servicios de aplicación y depende de interfaces de repositorio.
- `packages/shared`: tipos de respuesta y vocabulario estable que cliente y servidor pueden compartir.
- `packages/validation`: esquemas Zod de entrada para mantener las mismas reglas en ambos límites.
- PostgreSQL: fuente de verdad transaccional.
- Prisma: implementación de persistencia y migraciones versionadas.

## Flujo de una solicitud

```text
React
  -> REST /api/universes
  -> middleware de validación Zod
  -> UniverseController
  -> UniverseService
  -> UniverseRepository
  -> Prisma
  -> PostgreSQL
```

El controlador conoce HTTP, pero no contiene reglas de negocio ni consultas. El servicio expresa el caso de uso y depende de `UniverseRepository`. La implementación de Prisma queda detrás de esa interfaz; las pruebas HTTP utilizan un repositorio en memoria y ejercitan el mismo enrutado, validación, controlador y servicio.

## Decisión de monorepo

Los workspaces de npm permiten una instalación y scripts raíz únicos, sin mezclar las responsabilidades de web, API, contratos y validación. Esta estructura favorece cambios atómicos del contrato durante las primeras iteraciones y evita adoptar una herramienta adicional antes de que el tamaño del proyecto lo justifique.

## Propiedad futura y autenticación

La primera migración no incluye `User` ni un `ownerId` opcional. Un propietario nulo tendría una semántica ambigua y una autenticación incompleta sería más riesgosa que una migración posterior explícita. La vertical de Auth + User deberá crear usuarios, agregar `ownerId` a `Universe`, poblarlo durante la migración y finalmente hacerlo obligatorio, junto con autorización por recurso.

## Evolución del dominio

La jerarquía principal será `Universe -> Work -> Arc -> Chapter`. Las obras, arcos y capítulos son estructura editorial. Los personajes, lugares, organizaciones, habilidades y objetos pertenecen al universo para conservar una identidad única y poder participar en varias obras.

En particular, `Character` no tendrá una clave foránea directa a `Work`. La presencia y el rol se expresarán mediante `CharacterWorkParticipation` y, cuando sea necesario, `CharacterArcParticipation`. Así una ficha puede ser secundaria en una obra y protagonista en otra sin duplicarse.

Después de Works y Characters, `Event` formará la cronología global y se vinculará con obras, arcos y capítulos como contexto narrativo. Reglas, canon y Continuity Engine se incorporarán sobre esos datos estructurados; no forman parte de esta primera vertical.

## Borrado de universos

El endpoint actual usa eliminación física porque todavía no existen datos dependientes. Antes de introducir obras u otras referencias históricas, la operación habitual debe migrar a archivado mediante `status = ARCHIVED`. La eliminación física deberá quedar como una acción excepcional, reforzada y con una política explícita de retención.

