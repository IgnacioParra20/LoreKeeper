import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const universe = {
  id: "9a2bdf8b-d5f0-45b9-8a65-14fa14893122",
  name: "La Frontera Silente",
  description: "Un sistema de mundos aislados.",
  status: "ACTIVE",
  createdAt: "2026-09-13T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z",
};

describe("App", () => {
  afterEach(() => vi.restoreAllMocks());

  it("carga universos y crea uno mediante la API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
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
});
