import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Pencil, Building2, AlertCircle } from 'lucide-react';
import { useBlueprintStore } from '@/store/blueprintStore';
import type { Room } from '@/types';
import { cn } from '@/lib/utils';
import RoomCard from '@/components/RoomCard';
import RoomEditor from '@/components/RoomEditor';

export default function BlueprintPage() {
  const {
    floors,
    selectedRoomId,
    addFloor,
    removeFloor,
    updateFloorName,
    addRoom,
    updateRoom,
    removeRoom,
    selectRoom,
  } = useBlueprintStore();

  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingFloorName, setEditingFloorName] = useState('');
  const [activeFloorForNewRoom, setActiveFloorForNewRoom] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const toggleFloor = (floorId: string) => {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floorId)) {
        next.delete(floorId);
      } else {
        next.add(floorId);
      }
      return next;
    });
  };

  const startEditFloor = (floorId: string, currentName: string) => {
    setEditingFloorId(floorId);
    setEditingFloorName(currentName);
  };

  const saveFloorName = (floorId: string) => {
    if (editingFloorName.trim()) {
      updateFloorName(floorId, editingFloorName.trim());
    }
    setEditingFloorId(null);
  };

  const handleSelectRoom = (floorId: string, room: Room) => {
    selectRoom(room.id);
    setActiveFloorForNewRoom(floorId);
    setShowEditor(true);
  };

  const handleAddRoom = (floorId: string) => {
    selectRoom(null);
    setActiveFloorForNewRoom(floorId);
    setShowEditor(true);
  };

  const handleSaveRoom = (floorId: string, roomId: string | null, data: Partial<Room>) => {
    if (roomId) {
      updateRoom(floorId, roomId, data);
    } else {
      addRoom(floorId, data as Omit<Room, 'id' | 'order'>);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    selectRoom(null);
  };

  const getSelectedRoom = (): Room | null => {
    if (!selectedRoomId) return null;
    for (const floor of floors) {
      const room = floor.rooms.find((r) => r.id === selectedRoomId);
      if (room) return room;
    }
    return null;
  };

  const selectedRoom = getSelectedRoom();
  const activeFloorId = selectedRoom
    ? floors.find((f) => f.rooms.some((r) => r.id === selectedRoomId))?.id || null
    : activeFloorForNewRoom;

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl">
          <div className="mb-8">
            <h2 className="font-display text-2xl text-accent-gold tracking-wide mb-2">蓝图录入</h2>
            <p className="text-sm text-text-secondary">
              按楼层录入鬼屋空间结构，为每个房间定义房名、事件、物件与心理状态。
            </p>
          </div>

          {floors.length === 0 ? (
            <div className="card-panel p-12 text-center">
              <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <p className="text-text-secondary mb-2">尚未录入任何楼层</p>
              <p className="text-xs text-text-muted mb-6">
                点击下方按钮开始构建你的鬼屋空间蓝图
              </p>
              <button
                onClick={() => addFloor(`楼层 ${floors.length + 1}`)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加第一层
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {floors
                .sort((a, b) => a.order - b.order)
                .map((floor, floorIdx) => {
                  const isExpanded = expandedFloors.size === 0 ? true : expandedFloors.has(floor.id);
                  const sortedRooms = [...floor.rooms].sort((a, b) => a.order - b.order);

                  return (
                    <div
                      key={floor.id}
                      className="card-panel animate-fadeIn"
                      style={{ animationDelay: `${floorIdx * 60}ms` }}
                    >
                      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleFloor(floor.id)}
                            className="p-1 text-text-muted hover:text-text-primary transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {editingFloorId === floor.id ? (
                            <input
                              type="text"
                              value={editingFloorName}
                              onChange={(e) => setEditingFloorName(e.target.value)}
                              onBlur={() => saveFloorName(floor.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveFloorName(floor.id)}
                              autoFocus
                              className="bg-bg-tertiary border border-accent-gold/50 px-2 py-1 text-text-primary text-sm focus:outline-none"
                            />
                          ) : (
                            <h3
                              className="font-display text-lg text-text-primary cursor-pointer hover:text-accent-gold transition-colors"
                              onClick={() => startEditFloor(floor.id, floor.name)}
                            >
                              {floor.name}
                              <span className="ml-2 text-xs text-text-muted font-mono">
                                {sortedRooms.length} 个房间
                              </span>
                            </h3>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditFloor(floor.id, floor.name)}
                            className="p-1.5 text-text-muted hover:text-accent-gold transition-colors"
                            title="重命名楼层"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFloor(floor.id)}
                            className="p-1.5 text-text-muted hover:text-accent-crimsonLight transition-colors"
                            title="删除楼层"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-5">
                          {sortedRooms.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-border-subtle">
                              <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-30" />
                              <p className="text-sm text-text-muted mb-3">本楼层暂无房间</p>
                              <button
                                onClick={() => handleAddRoom(floor.id)}
                                className="btn-secondary text-xs inline-flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                添加第一个房间
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                {sortedRooms.map((room, roomIdx) => (
                                  <div
                                    key={room.id}
                                    className="animate-slideUp"
                                    style={{ animationDelay: `${roomIdx * 40}ms` }}
                                  >
                                    <RoomCard
                                      room={room}
                                      isSelected={selectedRoomId === room.id}
                                      orderNumber={roomIdx}
                                      onSelect={() => handleSelectRoom(floor.id, room)}
                                      onDelete={() => removeRoom(floor.id, room.id)}
                                    />
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => handleAddRoom(floor.id)}
                                className={cn(
                                  'w-full py-3 border border-dashed border-border-strong',
                                  'text-text-muted hover:text-accent-gold hover:border-accent-gold/40',
                                  'transition-all text-sm flex items-center justify-center gap-2'
                                )}
                              >
                                <Plus className="w-4 h-4" />
                                添加房间
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              <button
                onClick={() => addFloor(`楼层 ${floors.length + 1}`)}
                className={cn(
                  'w-full py-4 border-2 border-dashed border-border-strong',
                  'text-text-muted hover:text-accent-gold hover:border-accent-gold/40',
                  'transition-all text-sm flex items-center justify-center gap-2'
                )}
              >
                <Plus className="w-5 h-5" />
                添加新楼层
              </button>
            </div>
          )}
        </div>
      </div>

      {showEditor && (
        <div className="w-96 shrink-0">
          <RoomEditor
            room={selectedRoom}
            floorId={activeFloorId}
            onClose={handleCloseEditor}
            onSave={handleSaveRoom}
          />
        </div>
      )}
    </div>
  );
}
