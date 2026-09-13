const ArchiveMark = () => (
  <svg aria-hidden="true" viewBox="0 0 32 32" className="brand-mark">
    <path d="M7 5.5h7.2c1.4 0 2.7.6 3.8 1.6v19.4c-1.1-1-2.4-1.5-3.8-1.5H7z" />
    <path d="M25 5.5h-7.2c-1.4 0-2.7.6-3.8 1.6v19.4c1.1-1 2.4-1.5 3.8-1.5H25z" />
    <circle cx="16" cy="15" r="2.2" />
  </svg>
);

export const AppHeader = () => (
  <header className="app-header">
    <a className="brand" href="/" aria-label="LoreKeeper, inicio">
      <ArchiveMark />
      <span>LoreKeeper</span>
    </a>
  </header>
);

