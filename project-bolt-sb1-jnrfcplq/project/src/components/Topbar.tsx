import { Menu } from 'lucide-react';
import { BRAND } from '@/types';

interface TopbarProps {
  title: string;
  subtitle: string;
  onMenuClick: () => void;
}

export default function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  return (
    <header className="h-[86px] px-5 sm:px-7 flex items-center gap-4 bg-[#f4f7f6]/88 backdrop-blur-md border-b border-[#e3ebe8] sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden w-[42px] h-[42px] rounded-xl border border-[#e3ebe8] bg-white grid place-items-center shrink-0"
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-[#17211e] truncate">{title}</h1>
        <p className="text-[13px] text-[#6b7a75] mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <span className="hidden sm:block text-sm font-semibold text-[#6b7a75]">
          {BRAND.name}
        </span>
      </div>
    </header>
  );
}
