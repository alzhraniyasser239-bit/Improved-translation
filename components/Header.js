import { Languages } from 'lucide-react';
import InstallApp from './InstallApp';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-cobalt text-white dark:text-[#091822]">
            <Languages size={19} strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold">المترجم الذكي</span>
        </div>
        <div className="flex items-center gap-2">
          <InstallApp />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
