// The frame around every logged-in page: a top rail (org, navigation, you) + the page itself.
// A top rail instead of a sidebar leaves the full width for the board's columns.
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, CardMark, RoleBadge } from './ui.jsx';

export default function Layout() {
  const { user, logout, allowed } = useAuth();
  const { pathname } = useLocation();

  const links = [
    // A project's board lives under /projects/..., so "Projects" stays highlighted there too.
    { to: '/', label: 'Projects', end: true, alsoActive: pathname.startsWith('/projects/') },
    { to: '/teams', label: 'Teams' },
    // Only admins can open the members page, so only admins see the link.
    allowed('member:manage') && { to: '/members', label: 'Members' },
    { to: '/activity', label: 'Activity' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink bg-stock">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2.5 py-3">
            <CardMark />
            <span className="truncate font-condensed text-xl font-semibold">{user.org.name}</span>
          </div>

          {/* On phones the links drop to their own row and scroll sideways. */}
          <nav className="order-last -mx-4 flex w-full gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:self-stretch md:px-0">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center whitespace-nowrap border-b-[3px] px-2 pt-3 pb-2.5 font-medium transition-colors ${
                    isActive || link.alsoActive ? 'border-floor text-ink' : 'border-transparent text-ink-soft hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 py-3">
            <Avatar name={user.name} />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
            <button onClick={logout} className="rounded-md px-2 py-1 text-sm text-ink-soft hover:bg-rack hover:text-ink">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
