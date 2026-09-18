import { createConnection } from "node:net";

const isListening = (host, port) => new Promise((resolve, reject) => {
  const socket = createConnection({ host, port });
  socket.setTimeout(1500);
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("timeout", () => { socket.destroy(); reject(new Error(`No se pudo comprobar ${host}:${port}`)); });
  socket.once("error", (error) => {
    socket.destroy();
    if (["ECONNREFUSED", "EAFNOSUPPORT", "ENETUNREACH"].includes(error.code)) resolve(false);
    else reject(error);
  });
});

try {
  for (const port of new Set([Number(process.env.PORT ?? 3001), Number(process.env.WEB_PORT ?? 5173)])) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Puerto inválido: ${port}`);
    const occupied = await Promise.all([isListening("127.0.0.1", port), isListening("::1", port)]);
    if (occupied.some(Boolean)) throw new Error(`El puerto ${port} ya está en uso. Cierra la otra terminal de desarrollo; si es Docker, ejecuta npm run dev:docker:stop. Después vuelve a ejecutar npm run dev.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
