import { afterEach, expect, it, vi } from "vitest";
import { createUniverse, getUniverses, resetSession } from "./client";
afterEach(() => { resetSession(); vi.restoreAllMocks(); });
it("discards delayed responses from the previous session even if fetch ignores abort", async () => {
  let resolve: (response: Response) => void = () => { throw new Error("Missing resolver"); };
  vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }));
  const pending = getUniverses();
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  resetSession();
  resolve(new Response(JSON.stringify({ data: [{ name: "Previous owner's private data" }] }), { status: 200 }));
  await rejected;
});
it("refreshes CSRF and retries a rejected mutation only once", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "CSRF_INVALID" } }), { status: 403 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "fresh" } }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "CSRF_INVALID" } }), { status: 403 }));
  await expect(createUniverse({ name: "World" })).rejects.toMatchObject({ code: "CSRF_INVALID" });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": "fresh" });
});
