import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import ComposeEmail from './pages/ComposeEmail';
import EmailLog from './pages/EmailLog';
import Schedules from './pages/Schedules';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/templates', label: 'Templates' },
  { to: '/emails', label: 'Email Log' },
  { to: '/schedules', label: 'Schedules' },
];

function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-indigo-600">Emailer</h1>
          <div className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/compose" element={<ComposeEmail />} />
          <Route path="/emails" element={<EmailLog />} />
          <Route path="/schedules" element={<Schedules />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
