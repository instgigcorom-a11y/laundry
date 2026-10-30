import { Link, useLocation } from 'react-router-dom';
import { serviceTags } from '../data/serviceGuides.js';

export function ServiceTags() {
  const { pathname } = useLocation();
  return <section className="service-tags" aria-labelledby="service-tags-heading">
    <h2 id="service-tags-heading">Tags</h2>
    <p>Explore our services in Amritsar. Select a tag for service details and published prices.</p>
    <nav aria-label="Service tags"><ul>{serviceTags.map(tag => <li key={tag.path}><Link to={tag.path} aria-current={pathname.replace(/\/+$/, '') === tag.path.replace(/\/+$/, '') ? 'page' : undefined}>{tag.label}</Link></li>)}</ul></nav>
  </section>;
}
