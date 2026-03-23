import './Spinner.css';

export function Spinner({ size = 24 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}
