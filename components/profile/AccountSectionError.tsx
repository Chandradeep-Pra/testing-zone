export default function AccountSectionError({ message, onRetry, retrying = false }: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="account-error" role="alert">
      <p>{message}</p>
      <button type="button" className="account-button account-button-secondary" onClick={onRetry} disabled={retrying}>
        {retrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
