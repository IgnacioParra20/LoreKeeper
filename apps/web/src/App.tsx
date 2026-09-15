import { useEffect, useRef, useState } from "react";
import type { PublicUser } from "@lorekeeper/shared";

import type { CreateUniverseInput } from "@lorekeeper/validation";

import { AppHeader } from "./components/AppHeader";
import { CreateUniverseDialog } from "./components/CreateUniverseDialog";
import { UniverseList } from "./components/UniverseList";
import { useUniverses } from "./hooks/use-universes";
import { AuthForm } from "./components/AuthForm";
import { UniverseDetail } from "./components/UniverseDetail";
import { ApiError, getCurrentUser, isAborted, logout, refreshCsrf, resetSession } from "./api/client";

const UniverseScreen = () => {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { universes, isLoading, isCreating, error, create, reload } = useUniverses();

  const handleCreate = async (input: CreateUniverseInput): Promise<boolean> => {
    const universe = await create(input);
    if (!universe) return false;
    setSuccessMessage(`“${universe.name}” se creó correctamente.`);
    window.setTimeout(() => setSuccessMessage(null), 4_000);
    return true;
  };

  return (
    <div className="app-shell">
      <main className="main-content">
        <div className="page-heading">
          <h1>Tus universos</h1>
          <button
            className="button button--primary button--create"
            type="button"
            onClick={() => setDialogOpen(true)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Crear universo
          </button>
        </div>

        {error && universes.length > 0 ? <p className="notice notice--error">{error}</p> : null}
        {successMessage ? (
          <p className="notice notice--success" role="status">{successMessage}</p>
        ) : null}

        <UniverseList
          universes={universes}
          isLoading={isLoading}
          hasError={Boolean(error)}
          onRetry={() => void reload()}
        />
      </main>

      <CreateUniverseDialog
        isOpen={isDialogOpen}
        isSubmitting={isCreating}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export const App = () => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const authChannel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const expired = () => { setUser(null); setLoading(false); setError(null); };
    const changed = () => { resetSession(); setUser(null); setRevision((value) => value + 1); };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("lorekeeper-auth");
    authChannel.current = channel;
    if (channel) channel.onmessage = changed;
    window.addEventListener("lorekeeper:session-expired", expired);
    setLoading(true);
    void (async () => {
      try {
        const existing = await getCurrentUser(controller.signal);
        if (!current) return;
        await refreshCsrf();
        if (current) setUser(existing);
      } catch (failure) {
        if (current && !isAborted(failure) && !(failure instanceof ApiError && failure.code === "UNAUTHENTICATED")) setError("No pudimos comprobar tu sesión.");
      } finally { if (current) setLoading(false); }
    })();
    return () => { current = false; controller.abort(); channel?.close(); authChannel.current = null; window.removeEventListener("lorekeeper:session-expired", expired); };
  }, [revision]);
  const broadcast = () => {
    authChannel.current?.postMessage("changed");
  };
  const signOut = async () => {
    setLeaving(true); setError(null);
    try { await logout(); setUser(null); broadcast(); }
    catch (failure) { if (!isAborted(failure) && !(failure instanceof ApiError && failure.code === "UNAUTHENTICATED")) setError("No pudimos cerrar la sesión. Intenta otra vez."); }
    finally { setLeaving(false); }
  };
  return <>
    <AppHeader />
    {user ? <div className="account-bar"><span>{user.email}</span><button className="button button--secondary" onClick={() => void signOut()} disabled={leaving}>{leaving ? "Cerrando…" : "Cerrar sesión"}</button></div> : null}
    {error ? <div className="session-error" role="alert">{error} {!user ? <button className="button button--secondary" onClick={() => { setError(null); setRevision((value) => value + 1); }}>Reintentar</button> : null}</div> : null}
    {loading ? <main className="main-content" role="status">Comprobando tu sesión…</main> : user ? /^\/universes\/[^/]+\/?$/.test(window.location.pathname)
      ? <UniverseDetail key={`${user.id}:${window.location.pathname}`} universeId={window.location.pathname.split("/")[2]!} />
      : <UniverseScreen key={user.id} /> : !error ? <AuthForm onAuthenticated={(value) => { setUser(value); broadcast(); }} /> : null}
  </>;
};
