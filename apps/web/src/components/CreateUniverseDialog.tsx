import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { CreateUniverseInput } from "@lorekeeper/validation";
import { createUniverseSchema } from "@lorekeeper/validation";

interface CreateUniverseDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (input: CreateUniverseInput) => Promise<boolean>;
}

export const CreateUniverseDialog = ({
  isOpen,
  isSubmitting,
  onClose,
  onCreate,
}: CreateUniverseDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 0);
      return () => window.clearTimeout(focusTimer);
    } else {
      setValidationMessage(null);
      return undefined;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = createUniverseSchema.safeParse({
      name: form.get("name"),
      description: form.get("description") || undefined,
    });

    if (!result.success) {
      setValidationMessage(result.error.issues[0]?.message ?? "Revisa los datos ingresados");
      return;
    }

    setValidationMessage(null);
    if (await onCreate(result.data)) {
      formElement.reset();
      onClose();
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="dialog-header">
          <div>
            <h2 id={titleId}>Crear universo</h2>
            <p id={descriptionId}>Define un nombre y una descripción breve. Podrás ampliarlo después.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="universe-name">Nombre</label>
          <input
            ref={nameInputRef}
            id="universe-name"
            name="name"
            maxLength={120}
            placeholder="Escribe un nombre para tu universo"
            autoComplete="off"
            disabled={isSubmitting}
          />

          <label htmlFor="universe-description">Descripción</label>
          <textarea
            id="universe-description"
            name="description"
            maxLength={5000}
            rows={5}
            placeholder="Cuéntanos brevemente sobre tu universo"
            disabled={isSubmitting}
          />

          {validationMessage ? (
            <p className="form-error" role="alert">{validationMessage}</p>
          ) : null}

          <div className="dialog-actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando universo…" : "Crear universo"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
