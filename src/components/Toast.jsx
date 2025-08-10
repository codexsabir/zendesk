export default function Toast({ message }) {
  return (
    <>
      <div className="sr-only" aria-live="polite" role="status">{message}</div>
      {message ? (
        <div className="toast">{message}</div>
      ) : null}
    </>
  );
}