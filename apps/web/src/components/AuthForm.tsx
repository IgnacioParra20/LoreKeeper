import { useState, type FormEvent } from "react";
import type { PublicUser } from "@lorekeeper/shared";
import { loginSchema, registerSchema } from "@lorekeeper/validation";
import { ApiError, authenticate, isAborted } from "../api/client";

export const AuthForm = ({ onAuthenticated }: { onAuthenticated: (user: PublicUser) => void }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const parsed = (mode === "login" ? loginSchema : registerSchema).safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa los datos"); return; }
    setError(null); setPending(true);
    try { onAuthenticated(await authenticate(mode, parsed.data)); }
    catch (failure) { if (!isAborted(failure)) setError(failure instanceof ApiError ? failure.message : "No pudimos conectarnos. Intenta nuevamente."); }
    finally { setPending(false); }
  };
  return <main className="auth-page">
    <div className="auth-intro"><p className="eyebrow">TU ARCHIVO NARRATIVO</p><h1>Un lugar para <br />tus mundos.</h1><p>Conserva tus historias, organiza tus universos y vuelve a ellos cuando llegue la inspiración.</p></div>
    <section className="auth-card" aria-labelledby="auth-title">
      <h2 id="auth-title">{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
      <p>{mode === "login" ? "Entra para continuar con tus universos." : "Tu próximo universo empieza aquí."}</p>
      <form key={mode} onSubmit={(event) => void submit(event)}>
        <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" maxLength={254} required disabled={pending} />
        <label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 15 : 1} maxLength={128} required disabled={pending} aria-describedby={mode === "register" ? "password-help" : undefined} />
        {mode === "register" ? <small id="password-help">Entre 15 y 128 caracteres. Puedes usar una frase.</small> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button--primary" disabled={pending}>{pending ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>
      </form>
      <button className="auth-switch" type="button" disabled={pending} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>{mode === "login" ? "¿Primera vez aquí? Crea tu cuenta" : "Ya tengo una cuenta"}</button>
    </section>
  </main>;
};
