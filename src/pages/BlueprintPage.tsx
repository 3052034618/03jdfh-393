import { useState, useRef } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Building2,
  AlertCircle,
  Upload,
  Download,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useBlueprintStore } from '@/store/blueprintStore';
import type { Room, ImportResult } from '@/types';
import { cn } from '@/lib/utils';
import RoomCard from '@/components/RoomCard';
import RoomEditor from '@/components/RoomEditor';
import {
  exportBlueprintToJSON,
  downloadFile,
} from '@/utils/importExport';

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
    importJSONBlueprint,
  } = useBlueprintStore();

  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingFloorName, setEditingFloorName] = useState('');
  const [activeFloorForNewRoom, setActiveFloorForNewRoom] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPreviewText, setImportPreviewText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportPreviewText(text);
      processImportText(text);
    } catch {
      setImportResult({
        success: false,
        errors: ['文件读取失败，请检查文件是否为有效的文本格式'],
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImportText = (text: string) => {
    const result = importJSONBlueprint(text);
    setImportResult(result);
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setImportResult(null);
    setImportPreviewText('');
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportResult(null);
    setImportPreviewText('');
  };

  const handleExportJSON = () => {
    if (floors.length === 0) return;
    const json = exportBlueprintToJSON(floors);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(json, `haunted-blueprint-${date}.json`, 'application/json');
  };

  const handlePasteImport = () => {
    if (!importPreviewText.trim()) {
      setImportResult({ success: false, errors: ['请先在输入框中粘贴 JSON 内容'] });
      return;
    }
    processImportText(importPreviewText);
  };

  const handleConfirmImport = () => {
    closeImportModal();
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl">
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl text-accent-gold tracking-wide mb-2">
                蓝图录入
              </h2>
              <p className="text-sm text-text-secondary">
                按楼层录入鬼屋空间结构，为每个房间定义房名、事件、物件与心理状态。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openImportModal}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                导入 JSON
              </button>
              <button
                onClick={handleExportJSON}
                disabled={floors.length === 0}
                className="btn-secondary text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                导出 JSON
              </button>
            </div>
          </div>

          {floors.length === 0 ? (
            <div className="card-panel p-12 text-center">
              <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <p className="text-text-secondary mb-2">尚未录入任何楼层</p>
              <p className="text-xs text-text-muted mb-6">
                点击下方按钮开始构建，或使用右上角「导入 JSON」直接带入团队已有蓝图
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => addFloor(`楼层 ${floors.length + 1}`)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加第一层
                </button>
                <button
                  onClick={openImportModal}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  导入 JSON
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {floors
                .sort((a, b) => a.order - b.order)
                .map((floor, floorIdx) => {
                  const isExpanded =
                    expandedFloors.size === 0 ? true : expandedFloors.has(floor.id);
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-bg-secondary border border-border-strong w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl text-accent-gold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  导入 JSON 蓝图
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  支持团队导出的蓝图 JSON 文件，或直接粘贴 JSON 内容
                </p>
              </div>
              <button
                onClick={closeImportModal}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="card-panel p-4">
                <p className="text-xs text-text-muted font-mono mb-3 tracking-wider">
                  方式一：选择本地 JSON 文件
                </p>
                <div
                  className="border-2 border-dashed border-border-strong p-6 text-center hover:border-accent-gold/40 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-text-secondary mb-1">
                    点击选择 JSON 文件，或将文件拖入此处
                  </p>
                  <p className="text-xs text-text-muted">
                    顶层需包含 floors 数组
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="card-panel p-4">
                <p className="text-xs text-text-muted font-mono mb-3 tracking-wider">
                  方式二：粘贴 JSON 内容
                </p>
                <textarea
                  value={importPreviewText}
                  onChange={(e) => setImportPreviewText(e.target.value)}
                  placeholder='粘贴 JSON 内容，例如：{"floors":[{"name":"一层","rooms":[{"name":"入口前厅",...}]}]}'
                  rows={8}
                  className="input-field resize-none font-mono text-xs"
                />
                <button
                  onClick={handlePasteImport}
                  className="btn-secondary text-xs mt-3 inline-flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  校验并预览
                </button>
              </div>

              {importResult && (
                <div
                  className={cn(
                    'p-4 border animate-slideUp',
                    importResult.success
                      ? 'bg-status-low/5 border-status-low/30'
                      : 'bg-accent-crimson/10 border-accent-crimson/40'
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {importResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-status-low shrink-0" />
                        <span className="font-medium text-status-low">校验通过</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-accent-crimsonLight shrink-0" />
                        <span className="font-medium text-accent-crimsonLight">
                          格式有误，导入失败
                        </span>
                      </>
                    )}
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-accent-crimsonLight font-mono mb-1">
                        错误：
                      </p>
                      <ul className="space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-text-secondary flex items-start gap-1.5"
                          >
                            <span className="text-accent-crimsonLight mt-0.5">×</span>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-status-medium font-mono mb-1">
                        警告（已自动处理）：
                      </p>
                      <ul className="space-y-1">
                        {importResult.warnings.map((warn, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-text-secondary flex items-start gap-1.5"
                          >
                            <Info className="w-3 h-3 text-status-medium mt-0.5 shrink-0" />
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.success && importResult.data && (
                    <div className="text-xs text-text-secondary font-mono pt-2 border-t border-border-subtle">
                      共 {importResult.data.length} 个楼层，合计{' '}
                      {importResult.data.reduce((sum, f) => sum + f.rooms.length, 0)} 个房间
                    </div>
                  )}
                </div>
              )}

              <div className="card-panel p-4 bg-bg-tertiary/30">
                <p className="text-xs text-text-muted font-mono mb-2 tracking-wider">
                  期望的 JSON 结构示例
                </p>
                <pre className="text-[10px] font-mono text-text-secondary overflow-x-auto leading-relaxed">
{`{
  "projectName": "鬼屋蓝图项目",
  "floors": [
    {
      "name": "一层 · 主屋",
      "order": 0,
      "rooms": [
        {
          "name": "入口前厅",
          "mainEvent": "玩家推门进入，门自动锁死",
          "visibleObjects": ["全家福照片", "蜡烛"],
          "emotionState": "unease",
          "spaceType": "normal",
          "order": 0
        }
      ]
    }
  ]
}`}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-border-subtle flex gap-3 justify-end">
              <button onClick={closeImportModal} className="btn-secondary">
                取消
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!importResult?.success}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importResult?.success
                  ? '确认导入并覆盖当前蓝图'
                  : '请先完成校验'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
