// The frame around every logged-in page: sidebar navigation + the page itself.
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, RoleBadge } from './ui.jsx';

export default function Layout() {
  const { user, logout, allowed } = useAuth();

  const links = [
    { to: '/', label: 'Projects', end: true },
    { to: '/teams', label: 'Teams' },
    // Only admins can open the members page, so only admins see the link.
    allowed('member:manage') && { to: '/members', label: 'Members' },
    { to: '/activity', label: 'Activity' },
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            {user.org.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.org.name}</p>
            <p className="text-xs text-zinc-500">Workspace</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:flex-1 md:flex-col md:pb-0">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button onClick={logout} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 md:hidden">
            Log out
          </button>
        </nav>

        <div className="hidden items-center gap-3 border-t border-zinc-200 px-4 py-4 md:flex">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
          <button onClick={logout} className="text-xs text-zinc-500 hover:text-zinc-900">
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
