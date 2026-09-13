export const openApiSpec = {
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

