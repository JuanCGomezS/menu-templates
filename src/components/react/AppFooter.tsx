import { withBasePath } from '../../lib/base-path';

export default function AppFooter() {
  return (
    <footer className="border-t border-orange-100 bg-white/70 px-4 py-5 text-sm text-gray-600 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-gray-800">Menu Templates</p>
        <nav className="flex flex-wrap gap-4">
          <a className="transition hover:text-orange-700" href={withBasePath('/')}>Inicio</a>
          <a className="transition hover:text-orange-700" href={withBasePath('/login')}>Administración</a>
        </nav>
      </div>
    </footer>
  );
}
