import { Pencil, Trash2, GripVertical } from 'lucide-react';
import type { Room } from '@/types';
import { emotionOptions, spaceTypeOptions } from '@/store/blueprintStore';
import { cn } from '@/lib/utils';

interface RoomCardProps {
  room: Room;
  isSelected: boolean;
  orderNumber: number;
  onSelect: () => void;
  onDelete: () => void;
}

export default function RoomCard({ room, isSelected, orderNumber, onSelect, onDelete }: RoomCardProps) {
  const emotionConfig = emotionOptions.find((e) => e.value === room.emotionState);
  const spaceConfig = spaceTypeOptions.find((s) => s.value === room.spaceType);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'card-panel p-4 cursor-pointer transition-all duration-200 group',
        isSelected && 'ring-1 ring-accent-gold/60 shadow-goldGlow'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-bg-tertiary border border-border-subtle flex items-center justify-center font-mono text-xs text-text-muted">
            {String(orderNumber + 1).padStart(2, '0')}
          </div>
          <div>
            <h4 className="font-display text-base text-text-primary">{room.name}</h4>
            <p className="text-xs text-text-muted mt-0.5">{spaceConfig?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-1.5 text-text-muted hover:text-accent-gold transition-colors"
            title="拖拽排序"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="p-1.5 text-text-muted hover:text-accent-gold transition-colors"
            title="编辑"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-text-muted hover:text-accent-crimsonLight transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {room.mainEvent && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {room.mainEvent}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2">
        {emotionConfig && (
          <span className={cn('tag', `tag-${room.emotionState}`)}>
            {emotionConfig.label}
          </span>
        )}
        {room.visibleObjects.slice(0, 3).map((obj, idx) => (
          <span
            key={idx}
            className="tag bg-bg-tertiary text-text-secondary border-border-strong"
          >
            {obj}
          </span>
        ))}
        {room.visibleObjects.length > 3 && (
          <span className="tag bg-bg-tertiary text-text-muted border-border-strong">
            +{room.visibleObjects.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}
