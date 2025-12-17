import { NavLink } from 'react-router-dom';

const MENU_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/fruit-game', label: 'Fruit Game' },
  { to: '/hand-tracker', label: 'Hand Tracker' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Fruit Game</h1>
        <p className="mt-2 text-slate-300">
          选择一个页面进入。
        </p>

        <ul className="mt-8 grid gap-3">
          {MENU_ITEMS.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'block rounded-xl border px-5 py-4 transition',
                    'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70',
                    isActive
                      ? 'ring-2 ring-indigo-400/70'
                      : 'hover:border-slate-700',
                  ].join(' ')
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{item.label}</span>
                  <span className="text-slate-400">→</span>
                </div>
                <div className="mt-1 text-sm text-slate-400">{item.to}</div>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
