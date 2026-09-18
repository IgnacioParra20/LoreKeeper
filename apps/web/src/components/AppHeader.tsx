import type { PublicUser } from "@lorekeeper/shared";

const ArchiveMark = () => (
  <svg aria-hidden="true" viewBox="0 0 32 32" className="brand-mark">
    <path d="M7 5.5h7.2c1.4 0 2.7.6 3.8 1.6v19.4c-1.1-1-2.4-1.5-3.8-1.5H7z" />
    <path d="M25 5.5h-7.2c-1.4 0-2.7.6-3.8 1.6v19.4c1.1-1 2.4-1.5 3.8-1.5H25z" />
    <circle cx="16" cy="15" r="2.2" />
  </svg>
);

interface AppHeaderProps {
  user?: PublicUser | null;
  isSigningOut?: boolean;
  onSignOut?: () => void;
}

export const AppHeader = ({ user, isSigningOut = false, onSignOut }: AppHeaderProps) => (
  <header className="app-header">
    <a className="brand" href="/" aria-label="LoreKeeper, inicio">
      <ArchiveMark />
      <span>LoreKeeper</span>
    </a>
    {user ? <div className="header-account">
      <span className="header-account__avatar" aria-hidden="true">{user.email.slice(0, 1).toLocaleUpperCase("es")}</span>
      <span className="header-account__name">{user.email.split("@")[0]}</span>
      <button className="header-account__signout" type="button" onClick={onSignOut} disabled={isSigningOut}>{isSigningOut ? "Cerrando…" : "Cerrar sesión"}</button>
    </div> : null}
  </header>
);
