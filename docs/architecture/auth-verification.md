# Verificación de Auth y propiedad

Implementación local verificada el 14 de septiembre de 2026.

- API: 20 pruebas aprobadas; registro, normalización, cookies, sesiones, expiración, CSRF, límites y aislamiento entre propietarios.
- Frontend: 4 pruebas aprobadas; registro, logout, creación y descarte de respuestas de sesiones anteriores.
- Validaciones compartidas: 5 pruebas aprobadas.
- PostgreSQL real: 2 pruebas de integración aprobadas en schemas aislados de lorekeeper_test, incluyendo migración con datos previos y rechazo del cierre prematuro.
- Typecheck aprobado; lint aprobado por directorios para limitar memoria; imágenes Docker de API y web compiladas.
- Navegador: login, creación, recarga con sesión persistente y logout verificados; cuenta de prueba separada sin acceso a universos existentes. Revisados escritorio y móvil; sin errores de consola. Corregido un espacio faltante en el título móvil.
- Migración real: los dos universos originales conservan IDs, nombres, descripción, estado y fechas (checksums comparados antes/después); owner_id es NOT NULL.
- Respaldo anterior a la migración: .local/lorekeeper-pre-auth.dump; credenciales de bootstrap en .local/auth-bootstrap.txt. Ambos excluidos de Git y Docker. La carpeta del proyecto está en OneDrive: estas exclusiones no impiden su sincronización por OneDrive.

El entorno tuvo fallos de memoria durante ejecuciones conjuntas. Las suites se repitieron por separado, sin reducir el coste de Argon2id. Para exposición pública siguen pendientes verificación de email, recuperación de cuentas y rate limiting compartido si se usan varias instancias.
