export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`official-logo${light ? " official-logo-light" : ""}`}>
      <span className="official-monogram" aria-hidden="true">
        <i>S</i><i>R</i>
      </span>
      <span className="official-wordmark">
        <strong>SÁRESOLVE</strong>
        <small>Consultoria e investimentos</small>
      </span>
    </span>
  );
}
