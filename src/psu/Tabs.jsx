// The two views of the PSU dashboard, as links between its two pages.
const VIEWS = [
  { id: 'sector', href: './', label: 'Sector overview' },
  { id: 'companies', href: './companies.html', label: 'Maharatna company financials' },
];

export default function Tabs({ current }) {
  return (
    <nav className="ps-views" aria-label="Dashboard views">
      {VIEWS.map((v) => (
        <a key={v.id} href={v.href} aria-current={v.id === current ? 'page' : undefined}>{v.label}</a>
      ))}
    </nav>
  );
}
