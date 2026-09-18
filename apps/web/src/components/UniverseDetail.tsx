import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Character, Universe } from "@lorekeeper/shared";
import { createCharacterSchema, updateUniverseSchema } from "@lorekeeper/validation";
import { ApiError, createCharacter, deleteCharacter, getCharacters, getUniverse, isAborted, updateCharacter, updateUniverse } from "../api/client";

const failureMessage = (error: unknown) => error instanceof ApiError ? error.message : "No pudimos comunicarnos con LoreKeeper.";

export const UniverseDetail = ({ universeId }: { universeId: string }) => {
  const lifecycle = useRef<AbortController | null>(null);
  const [universe, setUniverse] = useState<Universe | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Character | "new" | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const hasCharacters = characters.length > 0;
  const completedPieces = hasCharacters ? 1 : 0;

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    void (async () => {
      try {
        const [world, values] = await Promise.all([getUniverse(universeId, controller.signal), getCharacters(universeId, controller.signal)]);
        if (controller.signal.aborted) return;
        setUniverse(world); setCharacters(values);
      } catch (failure) {
        if (!isAborted(failure) && !controller.signal.aborted) setError(failureMessage(failure));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => { controller.abort(); lifecycle.current = null; };
  }, [universeId]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || pending) return;
    const form = new FormData(event.currentTarget);
    const input = { name: form.get("name"), role: form.get("role") || null, description: form.get("description") || null };
    const parsed = createCharacterSchema.safeParse(input);
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? "Revisa los datos"); return; }
    setPending(true); setFormError(null);
    const controller = lifecycle.current;
    try {
      const value = editing === "new"
        ? await createCharacter(universeId, parsed.data, controller?.signal)
        : await updateCharacter(universeId, editing.id, parsed.data, controller?.signal);
      if (!controller || controller.signal.aborted) return;
      setCharacters((current) => editing === "new" ? [value, ...current] : current.map((item) => item.id === value.id ? value : item));
      setEditing(null);
    } catch (failure) { if (!isAborted(failure)) setFormError(failureMessage(failure)); }
    finally { if (controller && !controller.signal.aborted) setPending(false); }
  };
  const remove = async (value: Character) => {
    if (!window.confirm(`¿Eliminar a “${value.name}”? Esta acción no se puede deshacer.`)) return;
    setRemoving(value.id); setError(null);
    const controller = lifecycle.current;
    try {
      await deleteCharacter(universeId, value.id, controller?.signal);
      if (controller && !controller.signal.aborted) {
        setCharacters((current) => current.filter((item) => item.id !== value.id));
        setEditing((current) => current !== "new" && current?.id === value.id ? null : current);
      }
    } catch (failure) { if (!isAborted(failure)) setError(failureMessage(failure)); }
    finally { if (controller && !controller.signal.aborted) setRemoving(null); }
  };

  const saveDescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!universe || savingDescription) return;
    const value = new FormData(event.currentTarget).get("description");
    const parsed = updateUniverseSchema.safeParse({ description: typeof value === "string" && value.trim() ? value : null });
    if (!parsed.success) { setDescriptionError(parsed.error.issues[0]?.message ?? "Revisa la descripción"); return; }
    setSavingDescription(true); setDescriptionError(null);
    const controller = lifecycle.current;
    try {
      const updated = await updateUniverse(universeId, parsed.data, controller?.signal);
      if (!controller || controller.signal.aborted) return;
      setUniverse(updated);
      setEditingDescription(false);
    } catch (failure) { if (!isAborted(failure)) setDescriptionError(failureMessage(failure)); }
    finally { if (controller && !controller.signal.aborted) setSavingDescription(false); }
  };

  return <main className="main-content universe-detail">
    <a className="back-link" href="/">← Tus universos</a>
    {loading ? <p role="status">Cargando universo…</p> : error && !universe ? <div className="empty-state"><h1>No pudimos abrir este universo</h1><p>{error}</p></div> : universe ? <>
      <div className="universe-workspace">
        <div className="universe-workspace__content">
          <div className="detail-heading"><div><h1>{universe.name}</h1>{editingDescription ? <form className="universe-description-form" onSubmit={(event) => void saveDescription(event)}>
            <label htmlFor="universe-description">Descripción del universo</label>
            <textarea id="universe-description" name="description" maxLength={5000} rows={4} defaultValue={universe.description ?? ""} placeholder="Describe este mundo…" autoFocus />
            {descriptionError ? <p className="form-error" role="alert">{descriptionError}</p> : null}
            <div><button className="button button--secondary" type="button" disabled={savingDescription} onClick={() => { setEditingDescription(false); setDescriptionError(null); }}>Cancelar</button><button className="button button--primary" disabled={savingDescription}>{savingDescription ? "Guardando…" : "Guardar descripción"}</button></div>
          </form> : <div className="universe-description"><p>{universe.description || "Un mundo listo para tomar forma."}</p><button type="button" className="text-button" onClick={() => { setEditingDescription(true); setDescriptionError(null); }}>Editar descripción</button></div>}</div><span className="detail-status">{universe.status === "ACTIVE" ? "Activo" : "Archivado"}</span></div>
          <section className="character-section" aria-labelledby="characters-title">
            <div className="character-heading"><div><h2 id="characters-title">Personajes</h2><p>{characters.length} {characters.length === 1 ? "personaje" : "personajes"} en este universo</p></div><button className="button button--secondary button--inline-create" type="button" onClick={() => { setEditing("new"); setFormError(null); }}><span aria-hidden="true">+</span> Crear personaje</button></div>
        {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
        {editing ? <form className="character-form" key={editing === "new" ? "new" : editing.id} onSubmit={(event) => void save(event)}>
          <h3>{editing === "new" ? "Nuevo personaje" : `Editar a ${editing.name}`}</h3>
          <label htmlFor="character-name">Nombre</label><input id="character-name" name="name" required maxLength={120} defaultValue={editing === "new" ? "" : editing.name} />
          <label htmlFor="character-role">Rol o función <span>(opcional)</span></label><input id="character-role" name="role" maxLength={120} defaultValue={editing === "new" ? "" : editing.role ?? ""} placeholder="Ej. guardiana, antagonista" />
          <label htmlFor="character-description">Descripción <span>(opcional)</span></label><textarea id="character-description" name="description" maxLength={5000} rows={5} defaultValue={editing === "new" ? "" : editing.description ?? ""} placeholder="Apariencia, motivaciones, historia…" />
          {formError ? <p className="form-error" role="alert">{formError}</p> : null}
          <div className="character-form-actions"><button className="button button--secondary" type="button" disabled={pending} onClick={() => setEditing(null)}>Cancelar</button><button className="button button--primary" disabled={pending}>{pending ? "Guardando…" : "Guardar personaje"}</button></div>
        </form> : null}
        {characters.length === 0 ? <div className="empty-state character-empty"><div className="character-empty__icon" aria-hidden="true">✦</div><div><h3>Tu historia necesita una primera voz</h3><p>Empieza por alguien que habite este mundo: quién es y qué papel cumple.</p><button className="button button--primary" type="button" onClick={() => { setEditing("new"); setFormError(null); }}>Crear mi primer personaje</button></div></div> : <div className="character-list">{characters.map((value, index) => <article className="character-card" key={value.id}>
          <div className={`character-avatar character-avatar--${index % 3}`} aria-hidden="true">{value.name.slice(0, 1).toLocaleUpperCase("es")}</div><div className="character-copy"><h3>{value.name}</h3>{value.role ? <p className="character-role">{value.role}</p> : null}<p>{value.description || "Sin descripción todavía."}</p></div>
          <div className="character-actions"><button type="button" className="button button--secondary" onClick={() => { setEditing(value); setFormError(null); }}>Editar</button><button type="button" className="button button--danger" disabled={removing === value.id} onClick={() => void remove(value)}>{removing === value.id ? "Eliminando…" : "Eliminar"}</button></div>
        </article>)}</div>}
          </section>
        </div>
        <aside className="next-step" aria-labelledby="next-step-title">
          <p className="next-step__label">SIGUIENTE PASO</p>
          <h2 id="next-step-title">{hasCharacters ? "Continúa dando forma a tu mundo" : "Crea el personaje que mueve la historia"}</h2>
          <p>{hasCharacters ? "Ya tienes una voz en este universo. Añade otra perspectiva para que la historia empiece a tomar tensión." : "Los personajes dan vida a tu universo. Empieza por quien mueve la historia y todo lo demás cobrará más sentido."}</p>
          <button className="button button--primary next-step__action" type="button" onClick={() => { setEditing("new"); setFormError(null); }}>{hasCharacters ? "Crear otro personaje" : "Crear personaje"}</button>
          <div className="journey-progress" aria-label={`${completedPieces} de 3 piezas esenciales completadas`}>
            <p className="next-step__label">TU PROGRESO EN {universe.name.toLocaleUpperCase("es")}</p>
            <strong>{completedPieces} de 3 piezas esenciales</strong>
            <ol>
              <li className={hasCharacters ? "journey-step journey-step--complete" : "journey-step journey-step--current"}><span aria-hidden="true" />Personajes</li>
              <li className="journey-step"><span aria-hidden="true" />Lugares</li>
              <li className="journey-step"><span aria-hidden="true" />Trama</li>
            </ol>
            <p className="journey-progress__note">{hasCharacters ? "Cuando estés listo, la próxima etapa sumará los lugares y la trama de tu universo." : "Comienza con los personajes. Las próximas etapas incorporarán lugares y trama."}</p>
          </div>
        </aside>
      </div>
    </> : null}
  </main>;
};
