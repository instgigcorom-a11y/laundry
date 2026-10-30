import { Link } from 'react-router-dom';
import { businessFaqs } from '../data/businessFaqs.js';

export function BusinessFaqs() {
  return <section id="faqs" className="business-faqs" aria-labelledby="business-faq-heading">
    <p className="eyebrow">Before you book</p>
    <h2 id="business-faq-heading">Frequently asked questions about Prem Power Laundry</h2>
    <p>Find services, prices, booking information and ways to visit our Amritsar shop.</p>
    <div className="faq-accordion">{businessFaqs.map(faq => <details key={faq.question}>
      <summary>{faq.question}</summary>
      <div><p>{faq.answer}</p><Link to={faq.path}>{faq.link}</Link></div>
    </details>)}</div>
  </section>;
}
