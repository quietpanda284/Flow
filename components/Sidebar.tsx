
import React from 'react';
import { Settings, Home, Timer, Zap, Map } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const items = [
    { name: 'Home', icon: Home },
    { name: 'Plan', icon: Map },
    { name: 'Trends', icon: Zap },
    { name: 'Focus', icon: Timer },
  ];

  const handleNavigation = (name: string) => {
    onNavigate(name);
    
    if (name === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-20 h-screen bg-card border-r border-border flex flex-col items-center py-6 fixed left-0 top-0 z-50">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent-focus to-blue-500 flex items-center justify-center font-bold text-background text-xl">
          F
        </div>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-6 items-center">
        {items.map((item) => {
          const isActive = activePage === item.name;
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.name)}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${
                isActive ? 'bg-[#2a2d36] text-accent-focus' : 'text-gray-400 hover:text-white hover:bg-[#2a2d36]'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-focus rounded-r-full" />
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      <button className="p-3 text-gray-400 hover:text-white transition-colors mt-auto">
        <Settings size={24} />
      </button>
    </div>
  );
};
