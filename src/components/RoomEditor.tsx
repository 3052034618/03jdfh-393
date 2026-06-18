import { useState, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import type { Room, EmotionState, SpaceType } from '@/types';
import { emotionOptions, spaceTypeOptions } from '@/store/blueprintStore';
import { cn } from '@/lib/utils';

interface RoomEditorProps {
  room: Room | null;
  floorId: string | null;
  onClose: () => void;
  onSave: (floorId: string, roomId: string | null, data: Partial<Room>) => void;
}

export default function RoomEditor({ room, floorId, onClose, onSave }: RoomEditorProps) {
  const [name, setName] = useState('');
  const [mainEvent, setMainEvent] = useState('');
  const [visibleObjects, setVisibleObjects] = useState<string[]>([]);
  const [newObject, setNewObject] = useState('');
  const [emotionState, setEmotionState] = useState<EmotionState>('unease');
  const [spaceType, setSpaceType] = useState<SpaceType>('normal');

  useEffect(() => {
    if (room) {
      setName(room.name);
      setMainEvent(room.mainEvent);
      setVisibleObjects(room.visibleObjects || []);
      setEmotionState(room.emotionState);
      setSpaceType(room.spaceType);
    } else {
      setName('');
      setMainEvent('');
      setVisibleObjects([]);
      setEmotionState('unease');
      setSpaceType('normal');
    }
  }, [room]);

  const handleAddObject = () => {
    const trimmed = newObject.trim();
    if (trimmed && !visibleObjects.includes(trimmed)) {
      setVisibleObjects([...visibleObjects, trimmed]);
      setNewObject('');
    }
  };

  const handleRemoveObject = (obj: string) => {
    setVisibleObjects(visibleObjects.filter((o) => o !== obj));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!floorId) return;
    onSave(floorId, room?.id || null, {
      name: name.trim(),
      mainEvent: mainEvent.trim(),
      visibleObjects,
      emotionState,
      spaceType,
    });
    onClose();
  };

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l border-border-subtle">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <h3 className="font-display text-lg text-accent-gold">
          {room ? '编辑房间' : '新增房间'}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className="block text-xs text-text-muted font-mono tracking-wider mb-2">
            房间名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：入口前厅、祠堂、结局密室"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted font-mono tracking-wider mb-2">
            空间类型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {spaceTypeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSpaceType(opt.value)}
                className={cn(
                  'px-3 py-2 text-sm border transition-all',
                  spaceType === opt.value
                    ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold'
                    : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:border-border-strong'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted font-mono tracking-wider mb-2">
            心理状态
          </label>
          <div className="grid grid-cols-2 gap-2">
            {emotionOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEmotionState(opt.value)}
                className={cn(
                  'px-3 py-2 text-sm border transition-all',
                  emotionState === opt.value
                    ? `tag-${opt.value}`
                    : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:border-border-strong'
                )}
                style={
                  emotionState === opt.value
                    ? { backgroundColor: `${opt.color}18`, borderColor: `${opt.color}60`, color: opt.color }
                    : {}
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted font-mono tracking-wider mb-2">
            主要事件
          </label>
          <textarea
            value={mainEvent}
            onChange={(e) => setMainEvent(e.target.value)}
            placeholder="描述玩家进入这个房间时发生的核心事件..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted font-mono tracking-wider mb-2">
            玩家可见物件
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newObject}
              onChange={(e) => setNewObject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddObject()}
              placeholder="输入物件名称后按回车"
              className="input-field flex-1"
            />
            <button
              onClick={handleAddObject}
              className="btn-secondary px-3"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleObjects.length === 0 ? (
              <p className="text-xs text-text-muted italic">尚未添加任何物件</p>
            ) : (
              visibleObjects.map((obj, idx) => (
                <span
                  key={idx}
                  className="tag bg-bg-tertiary text-text-secondary border-border-strong group cursor-pointer"
                  onClick={() => handleRemoveObject(obj)}
                >
                  <Tag className="w-3 h-3 mr-1 opacity-50" />
                  {obj}
                  <span className="ml-1 opacity-50 group-hover:opacity-100 group-hover:text-accent-crimsonLight transition-opacity">
                    ×
                  </span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border-subtle flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {room ? '保存修改' : '创建房间'}
        </button>
      </div>
    </div>
  );
}
