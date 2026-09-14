import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { resetSession } from "./api/client";

const universe = {
  id: "9a2bdf8b-d5f0-45b9-8a65-14fa14893122",
  name: "La Frontera Silente",
  description: "Un sistema de mundos aislados.",
  status: "ACTIVE",
  createdAt: "2026-09-13T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z",
};

describe("App", () => {
  afterEach(() => { cleanup(); resetSession(); vi.restoreAllMocks(); });

  it("carga universos y crea uno mediante la API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "user-a", email: "author@example.test", status: "ACTIVE" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-a" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: universe }), { status: 201 }));

    render(<App />);
    await screen.findByText("Tu archivo narrativo está listo");

    await userEvent.click(screen.getByRole("button", { name: "Crear universo" }));
    await userEvent.type(screen.getByLabelText("Nombre"), universe.name);
    await userEvent.type(screen.getByLabelText("Descripción"), universe.description);
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear universo" }));

    await screen.findByText(universe.name);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/universes",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Crear universo" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows login, registers and clears private data on logout", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Login" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: { id: "a", email: "a@example.test" }, csrfToken: "csrf" } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [universe] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "¿Primera vez aquí? Crea tu cuenta" }));
    await userEvent.type(screen.getByLabelText("Email"), "a@example.test");
    await userEvent.type(screen.getByLabelText("Contraseña"), "A long test passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    await screen.findByText(universe.name);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await screen.findByRole("button", { name: "Iniciar sesión" });
    expect(screen.queryByText(universe.name)).not.toBeInTheDocument();
  });
});
