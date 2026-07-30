import { Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/upload', label: 'Create AI Review' }
];

export function Navbar() {
  return (
    <header className="border-b border-line bg-white text-midnight">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">

        <div className="font-normal tracking-normal text-black">
          <p className="text-3xl font-serif tracking-wide">
            Stratton Oakmont
          </p>

          <h3 className="text-xl ">
            Loan Advisor
          </h3>
        </div>

        <nav className="hidden items-center gap-8 sm:flex">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  `inline-flex h-10 items-center text-base font-bold text-black transition hover:text-bronze ${
                    isActive ? 'text-bronze' : ''
                  }`
                }
                to={item.to}
              >
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <Search className="size-7 text-black" aria-hidden="true" />
        </nav>
      </div>
    </header>
  );
}
