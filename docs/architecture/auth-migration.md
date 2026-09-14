# Migración de usuarios y propietarios

La migración se divide en expansión (User, Session, ownerId temporalmente nullable) y cierre (ownerId obligatorio). No se modifica la migración original de Universe.

## Base nueva, sin universos

Ejecutar `npm run db:deploy`. Se aplican las tres migraciones y la aplicación permite registrar la primera cuenta normalmente.

## Base existente con universos

1. Detener web y API: `docker compose stop web api`. Mantener PostgreSQL activo. Confirmar que no hay otro proceso de API conectado.
2. Crear un respaldo de PostgreSQL con `pg_dump` y verificarlo con `pg_restore --list`. Guardarlo en `.local/`, que está excluido de Git y Docker.
3. Ejecutar `npm run prisma:generate` y `npm run build:packages`.
4. Ejecutar `npm run db:expand`. Este comando aplica solo las migraciones originales hasta auth_expand, conservando archivos y checksums.
5. Asignar cada conjunto de universos al email elegido: `npm run db:assign-owner -- autor@example.test UUID-1 UUID-2`. Usar identificadores reales y una asignación explícita; no existe un fallback al primer usuario registrado.
6. Si no existe esa cuenta, el bootstrap crea una cuenta de prueba con contraseña aleatoria, hash Argon2id y credenciales en `.local/auth-bootstrap.txt`. El archivo no se sobrescribe. Si la cuenta ya existe, conserva sus credenciales. No se envía correo. Para crear varias cuentas nuevas, mover cada archivo de credenciales a una ubicación privada antes de ejecutar el siguiente bootstrap.
7. Confirmar que no quedan universos sin propietario. Ejecutar `npm run db:deploy` para aplicar auth_contract y verificar NOT NULL.
8. Reconstruir y levantar API/web con `docker compose up -d --build`. Probar login y comprobar que se conservaron nombres, IDs y cantidad de universos.

El bootstrap bloquea la tabla durante su transacción, exige que todos los UUID existan y estén sin asignar y modifica solo ownerId. No borra universos ni reasigna los que ya tienen propietario.

## Fallos y recuperación

Si el cierre se intenta prematuramente, la transacción falla sin alterar los universos. Prisma puede registrar la migración como fallida. Tras verificar en PostgreSQL que se revirtió su transacción, usar `prisma migrate resolve --rolled-back 20260914000100_auth_contract` con el mismo schema y DATABASE_URL; completar las asignaciones y repetir deploy. No marcarla como aplicada sin verificar NOT NULL.

Mantener la aplicación detenida hasta completar el cierre. Si es necesario restaurar el respaldo, ensayar primero en otra base y verificarlo antes de reemplazar datos. No ejecutar reset ni borrar el volumen como recuperación.

## Pruebas independientes

Crear una base exclusiva `lorekeeper_test`, configurar TEST_DATABASE_URL y ejecutar `npm run test:integration`. La suite rechaza otros nombres de base, crea schemas aleatorios de uso exclusivo y elimina únicamente esos schemas al terminar. Prueba la migración vacía, una migración con un universo previo y el rechazo del cierre antes de asignar propietario.
