import type { Universe } from "@lorekeeper/shared";

interface UniverseListProps {
  universes: Universe[];
  isLoading: boolean;
  onRetry: () => void;
  hasError: boolean;
}

const UniverseGlyph = ({ name }: { name: string }) => (
  <div className="universe-glyph" aria-hidden="true">
    {name.slice(0, 1).toLocaleUpperCase("es")}
  </div>
);

export const UniverseList = ({
  universes,
  isLoading,
  onRetry,
  hasError,
}: UniverseListProps) => {
  if (isLoading) {
    return (
      <div className="universe-list" aria-label="Cargando universos" aria-busy="true">
        {[0, 1].map((item) => (
          <div className="universe-row universe-row--skeleton" key={item}>
            <div className="skeleton skeleton--glyph" />
            <div className="skeleton-copy">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--line" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hasError && universes.length === 0) {
    return (
      <div className="empty-state">
        <h2>No pudimos cargar tus universos</h2>
        <p>Revisa que la API esté disponible y vuelve a intentarlo.</p>
        <button className="button button--secondary" type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (universes.length === 0) {
    return (
      <div className="empty-state">
        <h2>Tu archivo narrativo está listo</h2>
        <p>Crea tu primer universo para empezar a organizar sus historias y su lore.</p>
      </div>
    );
  }

  return (
    <div className="universe-list">
      {universes.map((universe) => (
        <article className="universe-row" key={universe.id}>
          <UniverseGlyph name={universe.name} />
          <div className="universe-copy">
            <h2>{universe.name}</h2>
            <p>{universe.description || "Sin descripción todavía."}</p>
          </div>
          <div className="universe-status">
            <span className={`status-dot status-dot--${universe.status.toLowerCase()}`} />
            {universe.status === "ACTIVE" ? "Activo" : "Archivado"}
          </div>
        </article>
      ))}
    </div>
  );
};

