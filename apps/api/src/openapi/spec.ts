const universeSpec = {
  openapi: "3.1.0",
  info: {
    title: "LoreKeeper API",
    version: "0.1.0",
    description: "API inicial para la gestión de universos narrativos.",
  },
  servers: [{ url: "/", description: "Servidor actual" }],
  tags: [
    { name: "Health", description: "Estado del servicio" },
    { name: "Universes", description: "Primera vertical del dominio" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Comprueba la disponibilidad de la API",
        responses: {
          "200": {
            description: "Servicio disponible",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
              },
            },
          },
          "503": { description: "Base de datos no disponible" },
        },
      },
    },
    "/api/universes": {
      get: {
        tags: ["Universes"],
        summary: "Lista los universos",
        responses: {
          "200": {
            description: "Colección ordenada por actualización descendente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Universe" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Universes"],
        summary: "Crea un universo",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UniverseInput" } },
          },
        },
        responses: {
          "201": { description: "Universo creado" },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/universes/{id}": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        tags: ["Universes"],
        summary: "Obtiene un universo",
        responses: {
          "200": { description: "Universo encontrado" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Universes"],
        summary: "Actualiza un universo",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UniversePatch" } },
          },
        },
        responses: {
          "200": { description: "Universo actualizado" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Universes"],
        summary: "Elimina físicamente un universo vacío en esta primera fase",
        responses: {
          "204": { description: "Universo eliminado" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    schemas: {
      UniverseStatus: { type: "string", enum: ["ACTIVE", "ARCHIVED"] },
      Universe: {
        type: "object",
        required: ["id", "name", "description", "status", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 5000 },
          status: { $ref: "#/components/schemas/UniverseStatus" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UniverseInput: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 5000 },
          status: { $ref: "#/components/schemas/UniverseStatus" },
        },
      },
      UniversePatch: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: ["string", "null"], maxLength: 5000 },
          status: { $ref: "#/components/schemas/UniverseStatus" },
        },
      },
      Health: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          database: { type: "string", enum: ["up", "down"] },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "correlationId"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "Datos inválidos",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      NotFound: {
        description: "Universo inexistente",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
    },
  },
} as const;

const jsonSchema = (schema: object) => ({ "application/json": { schema } });
const envelope = (schema: object) => ({ type: "object", required: ["data"], properties: { data: schema } });
const userSchema = {
  type: "object", additionalProperties: false, required: ["id", "email", "status", "createdAt", "updatedAt"],
  properties: { id: { type: "string", format: "uuid" }, email: { type: "string", format: "email" }, status: { type: "string", enum: ["ACTIVE", "DISABLED"] }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } },
};
const csrfParameter = { in: "header", name: "X-CSRF-Token", required: true, schema: { type: "string" }, description: "Token obtenido al autenticar o desde GET /api/auth/csrf" };
const authErrors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { description: "Sesión inválida o credenciales incorrectas", content: jsonSchema({ $ref: "#/components/schemas/Error" }) },
  "403": { description: "Origin o CSRF rechazado antes de ejecutar la operación", content: jsonSchema({ $ref: "#/components/schemas/Error" }) },
  "415": { description: "Se requiere application/json" },
  "429": { description: "Límite de acceso alcanzado", headers: { "Retry-After": { schema: { type: "integer" } } } },
};
const credentialsOperation = (registration: boolean) => ({
  tags: ["Auth"], security: [], summary: registration ? "Registra una cuenta e inicia sesión" : "Inicia sesión y reemplaza la sesión actual",
  description: "Requiere Origin exacto permitido. Set-Cookie emite una sesión HttpOnly. El email se normaliza a minúsculas. Registro no verifica el buzón.",
  requestBody: { required: true, content: jsonSchema({ type: "object", additionalProperties: false, required: ["email", "password"], properties: { email: { type: "string", format: "email", maxLength: 254 }, password: { type: "string", minLength: registration ? 15 : 1, maxLength: 128, writeOnly: true } } }) },
  responses: { ...authErrors,
    ...(registration ? { "409": { description: "REGISTRATION_UNAVAILABLE; dirección ya registrada" } } : {}),
    [registration ? "201" : "200"]: { description: "Autenticado", headers: { "Set-Cookie": { schema: { type: "string" } } }, content: jsonSchema(envelope({ type: "object", required: ["user", "csrfToken"], properties: { user: userSchema, csrfToken: { type: "string" } } })) },
  },
});
const securePaths = Object.fromEntries(Object.entries(universeSpec.paths).map(([path, item]) => [path,
  Object.fromEntries(Object.entries(item).map(([method, operation]) => {
    if (method === "parameters") return [method, operation];
    const protectedOperation = operation as { responses: object };
    return [method, { ...operation,
      ...(path === "/health" ? { security: [] } : { description: "Solo universos del propietario autenticado. Recursos ajenos e inexistentes devuelven 404.",
        ...(["post", "patch", "delete"].includes(method) ? { parameters: [csrfParameter] } : {}),
        responses: { ...authErrors, ...protectedOperation.responses },
      }),
    }];
  })),
]));
export const openApiSpec = {
  ...universeSpec,
  info: { ...universeSpec.info, version: "0.2.0", description: "Usuarios, sesiones y universos privados. En HTTP local la cookie es lorekeeper_session; en HTTPS es __Host-lorekeeper_session." },
  security: [{ sessionCookie: [] }],
  tags: [...universeSpec.tags, { name: "Auth", description: "Registro y sesiones" }],
  paths: {
    ...securePaths,
    "/api/auth/register": { post: credentialsOperation(true) },
    "/api/auth/login": { post: credentialsOperation(false) },
    "/api/auth/me": { get: { tags: ["Auth"], summary: "Usuario actual", responses: { ...authErrors, "200": { description: "Usuario público, sin hashes", content: jsonSchema(envelope(userSchema)) } } } },
    "/api/auth/csrf": { get: { tags: ["Auth"], summary: "Renueva el token CSRF de esta sesión", responses: { ...authErrors, "200": { description: "Token nuevo; el anterior queda invalidado", content: jsonSchema(envelope({ type: "object", required: ["csrfToken"], properties: { csrfToken: { type: "string" } } })) } } } },
    "/api/auth/logout": { post: { tags: ["Auth"], summary: "Revoca la sesión actual y elimina la cookie", parameters: [csrfParameter], responses: { ...authErrors, "204": { description: "Sesión cerrada" } } } },
  },
  components: { ...universeSpec.components, schemas: { ...universeSpec.components.schemas, PublicUser: userSchema },
    securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "lorekeeper_session", description: "Cookie HttpOnly; en HTTPS su nombre es __Host-lorekeeper_session. El navegador la envía automáticamente." } },
  },
};
