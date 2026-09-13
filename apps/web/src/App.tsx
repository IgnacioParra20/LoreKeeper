import { useState } from "react";

import type { CreateUniverseInput } from "@lorekeeper/validation";

import { AppHeader } from "./components/AppHeader";
import { CreateUniverseDialog } from "./components/CreateUniverseDialog";
import { UniverseList } from "./components/UniverseList";
import { useUniverses } from "./hooks/use-universes";

export const App = () => {
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
      <AppHeader />
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
