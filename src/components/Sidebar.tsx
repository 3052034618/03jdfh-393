import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileSearch, ListTodo, Skull, Download, Trash2 } from 'lucide-react';
import { useBlueprintStore } from '@/store/blueprintStore';

interface SidebarProps {
  onLoadSample: () => void;
  onClearAll: () => void;
}

export default function Sidebar({ onLoadSample, onClearAll }: SidebarProps) {
  const { floors, getAllRooms } = useBlueprintStore();
  const totalRooms = getAllRooms().length;

  const navItems = [
    { to: '/blueprint', label: '蓝图录入', icon: LayoutDashboard },
    { to: '/diagnosis', label: '诊断报告', icon: FileSearch },
    { to: '/checklist', label: '修改清单', icon: ListTodo },
  ];

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border-subtle flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-crimson/20 border border-accent-crimson/50 flex items-center justify-center">
            <Skull className="w-5 h-5 text-accent-crimsonLight" />
          </div>
          <div>
            <h1 className="font-display text-lg text-accent-gold tracking-wider">HAUNT LAB</h1>
            <p className="text-[10px] text-text-muted font-mono tracking-widest">空间叙事评审</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border-subtle space-y-3">
        <div className="text-xs text-text-muted font-mono">
          <div className="flex justify-between">
            <span>楼层数</span>
            <span className="text-accent-gold">{floors.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>房间数</span>
            <span className="text-accent-gold">{totalRooms}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onLoadSample}
            className="w-full btn-secondary text-xs flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            加载示例蓝图
          </button>
          <button
            onClick={onClearAll}
            className="w-full px-3 py-2 text-xs text-text-muted border border-border-subtle 
                       hover:border-accent-crimson/50 hover:text-accent-crimsonLight transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              <Trash2 className="w-3 h-3" />
              清空所有数据
            </span>
          </button>
        </div>

        <p className="text-[10px] text-text-muted text-center font-mono">
          v1.0.0 · 评审模式
        </p>
      </div>
    </aside>
  );
}
