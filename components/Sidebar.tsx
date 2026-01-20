import React from 'react';
import { Settings, Home, Timer, Zap, Map, Database, User } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isDevMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isDevMode }) => {
  const items = [
    { name: 'Home', icon: Home },
    { name: 'Plan', icon: Map },
    { name: 'Trends', icon: Zap },
    { name: 'Focus', icon: Timer },
    // Only show Test page if Developer Mode is enabled
    ...(isDevMode ? [{ name: 'Test', icon: Database }] : []),
  ];

  const handleNavigation = (name: string) => {
    onNavigate(name);
    
    if (name === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isSettingsActive = activePage === 'Settings';
  const isAccountActive = activePage === 'Account';

  return (
    <div className="fixed left-0 top-0 h-screen w-16 bg-[#1a1d24] border-r border-white/5 flex flex-col items-center py-6 z-50">
      <div className="mb-10 select-none scale-75">
        <svg 
            width="44" 
            height="18" 
            viewBox="0 0 64 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_8px_rgba(0,255,148,0.3)]"
            aria-label="Flow Logo"
        >
            <text 
                x="50%" 
                y="52%" 
                dominantBaseline="middle" 
                textAnchor="middle" 
                fontFamily="'Inter', sans-serif" 
                fontWeight="800" 
                fontSize="18" 
                stroke="#00FF94" 
                strokeWidth="1.5" 
                fill="none" 
                letterSpacing="2"
            >
                FLOW
            </text>
        </svg>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-4 items-center">
        {items.map((item) => {
          const isActive = activePage === item.name;
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.name)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative ${
                isActive 
                  ? 'bg-accent-focus/15 text-accent-focus shadow-[0_0_15px_rgba(0,255,148,0.15)] ring-1 ring-accent-focus/20' 
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300 group-hover:scale-110" />
              
              {/* Tooltip */}
              <span className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#0f1117] text-xs font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4 mb-2 w-full items-center">
        {/* Account Button */}
        <button 
            onClick={() => handleNavigation('Account')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative ${
                isAccountActive 
                ? 'bg-white/10 text-white ring-1 ring-white/20' 
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            }`}
        >
            <User size={20} strokeWidth={isAccountActive ? 2.5 : 2} />
            <span className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#0f1117] text-xs font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0">
                Account
            </span>
        </button>

        {/* Settings Button */}
        <button 
            onClick={() => handleNavigation('Settings')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative ${
                isSettingsActive 
                ? 'bg-white/10 text-white ring-1 ring-white/20' 
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            }`}
        >
            <Settings size={20} strokeWidth={isSettingsActive ? 2.5 : 2} />
            <span className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#0f1117] text-xs font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0">
                Settings
            </span>
        </button>
      </div>
    </div>
  );
};