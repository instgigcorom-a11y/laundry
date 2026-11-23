import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <main className="home">
    <h1>Page not found</h1>
    <p>The page may have moved or the address may be incorrect.</p>
    <Link className="button" to="/">Back to Prem Power Laundry</Link>
  </main>;
}
