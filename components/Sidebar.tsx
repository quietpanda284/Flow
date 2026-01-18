
import React from 'react';
import { Settings, Home, Timer, Zap, Map, Database } from 'lucide-react';

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

  return (
    <div className="w-20 h-screen bg-card border-r border-border flex flex-col items-center py-6 fixed left-0 top-0 z-50">
      <div className="mb-8 select-none">
        <svg 
            width="44" 
            height="18" 
            viewBox="0 0 64 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_5px_rgba(0,255,148,0.4)]"
            aria-label="FlowState Logo"
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
              <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-700">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Settings Button */}
      <button 
        onClick={() => handleNavigation('Settings')}
        className={`p-3 rounded-xl transition-all duration-200 mt-auto group relative ${
            isSettingsActive ? 'bg-[#2a2d36] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2d36]'
        }`}
      >
        <Settings size={24} strokeWidth={isSettingsActive ? 2.5 : 2} />
        {isSettingsActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
        <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-700">
            Settings
        </span>
      </button>
    </div>
  );
};
