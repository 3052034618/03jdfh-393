import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Floor,
  Room,
  EmotionState,
  SpaceType,
  NarrativeIssue,
  RhythmIssue,
  ForeshadowItem,
  ChecklistItem,
  DiagnosisReport,
  ReviewNotesMap,
  ChecklistStatusMap,
  ChecklistStatus,
  ImportResult,
} from '@/types';
import {
  getAllRoomsOrdered,
  analyzeNarrative,
  analyzeRhythm,
  analyzeForeshadow,
  buildChecklist,
  generateDiagnosis,
} from '@/utils/diagnosis';
import { sampleFloors } from '@/data/sampleData';
import { validateAndImportBlueprint } from '@/utils/importExport';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

interface BlueprintStore {
  floors: Floor[];
  selectedRoomId: string | null;
  reviewNotes: ReviewNotesMap;
  checklistStatus: ChecklistStatusMap;

  addFloor: (name: string) => void;
  removeFloor: (id: string) => void;
  updateFloorName: (id: string, name: string) => void;

  addRoom: (
    floorId: string,
    room: Omit<Room, 'id' | 'order'> & { order?: number }
  ) => void;
  updateRoom: (floorId: string, roomId: string, updates: Partial<Room>) => void;
  removeRoom: (floorId: string, roomId: string) => void;
  reorderRooms: (floorId: string, roomIdsInOrder: string[]) => void;

  selectRoom: (roomId: string | null) => void;

  setReviewNote: (issueId: string, note: string) => void;
  getReviewNote: (issueId: string) => string;

  setChecklistItemStatus: (itemId: string, status: ChecklistStatus) => void;
  getChecklistItemStatus: (itemId: string) => ChecklistStatus;

  importJSONBlueprint: (rawJSON: string) => ImportResult;
  importBlueprintFromFloors: (floors: Floor[]) => void;

  getAllRooms: () => Room[];
  getNarrativeIssues: () => NarrativeIssue[];
  getRhythmIssues: () => RhythmIssue[];
  getForeshadowItems: () => ForeshadowItem[];
  getChecklist: () => ChecklistItem[];
  getDiagnosis: () => DiagnosisReport;

  loadSampleData: () => void;
  clearAll: () => void;
}

export const useBlueprintStore = create<BlueprintStore>()(
  persist(
    (set, get) => ({
      floors: [],
      selectedRoomId: null,
      reviewNotes: {},
      checklistStatus: {},

      addFloor: (name) =>
        set((state) => {
          const newFloor: Floor = {
            id: generateId(),
            name,
            order: state.floors.length,
            rooms: [],
          };
          return { floors: [...state.floors, newFloor] };
        }),

      removeFloor: (id) =>
        set((state) => ({
          floors: state.floors
            .filter((f) => f.id !== id)
            .map((f, i) => ({ ...f, order: i })),
          selectedRoomId: state.selectedRoomId,
        })),

      updateFloorName: (id, name) =>
        set((state) => ({
          floors: state.floors.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      addRoom: (floorId, room) =>
        set((state) => ({
          floors: state.floors.map((f) => {
            if (f.id !== floorId) return f;
            const order = room.order !== undefined ? room.order : f.rooms.length;
            const newRoom: Room = {
              id: generateId(),
              name: room.name,
              mainEvent: room.mainEvent,
              visibleObjects: room.visibleObjects,
              emotionState: room.emotionState,
              spaceType: room.spaceType,
              order,
            };
            return { ...f, rooms: [...f.rooms, newRoom] };
          }),
        })),

      updateRoom: (floorId, roomId, updates) =>
        set((state) => ({
          floors: state.floors.map((f) => {
            if (f.id !== floorId) return f;
            return {
              ...f,
              rooms: f.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
            };
          }),
        })),

      removeRoom: (floorId, roomId) =>
        set((state) => ({
          floors: state.floors.map((f) => {
            if (f.id !== floorId) return f;
            const filtered = f.rooms
              .filter((r) => r.id !== roomId)
              .map((r, i) => ({ ...r, order: i }));
            return { ...f, rooms: filtered };
          }),
          selectedRoomId: state.selectedRoomId === roomId ? null : state.selectedRoomId,
        })),

      reorderRooms: (floorId, roomIdsInOrder) =>
        set((state) => ({
          floors: state.floors.map((f) => {
            if (f.id !== floorId) return f;
            const reordered = roomIdsInOrder
              .map((id, idx) => {
                const room = f.rooms.find((r) => r.id === id);
                return room ? { ...room, order: idx } : null;
              })
              .filter((r): r is Room => r !== null);
            return { ...f, rooms: reordered };
          }),
        })),

      selectRoom: (roomId) => set({ selectedRoomId: roomId }),

      setReviewNote: (issueId, note) =>
        set((state) => ({
          reviewNotes: { ...state.reviewNotes, [issueId]: note },
        })),

      getReviewNote: (issueId) => get().reviewNotes[issueId] || '',

      setChecklistItemStatus: (itemId, status) =>
        set((state) => ({
          checklistStatus: { ...state.checklistStatus, [itemId]: status },
        })),

      getChecklistItemStatus: (itemId) => get().checklistStatus[itemId] || 'todo',

      importJSONBlueprint: (rawJSON) => {
        try {
          const parsed = JSON.parse(rawJSON);
          const result = validateAndImportBlueprint(parsed);
          if (result.success && result.data) {
            set({
              floors: result.data,
              selectedRoomId: null,
              reviewNotes: {},
              checklistStatus: {},
            });
          }
          return result;
        } catch (e: unknown) {
          const msg = e instanceof SyntaxError ? `JSON 语法错误：${e.message}` : '文件解析失败：未知错误';
          return { success: false, errors: [msg] };
        }
      },

      importBlueprintFromFloors: (importedFloors) =>
        set({
          floors: importedFloors,
          selectedRoomId: null,
          reviewNotes: {},
          checklistStatus: {},
        }),

      getAllRooms: () => getAllRoomsOrdered(get().floors),

      getNarrativeIssues: () => analyzeNarrative(get().getAllRooms()),
      getRhythmIssues: () => analyzeRhythm(get().getAllRooms()),
      getForeshadowItems: () => analyzeForeshadow(get().getAllRooms()),

      getChecklist: () => {
        const state = get();
        return buildChecklist(
          state.getNarrativeIssues(),
          state.getRhythmIssues(),
          state.getForeshadowItems()
        );
      },

      getDiagnosis: () => {
        const state = get();
        return generateDiagnosis(
          state.getNarrativeIssues(),
          state.getRhythmIssues(),
          state.getForeshadowItems()
        );
      },

      loadSampleData: () =>
        set({
          floors: sampleFloors,
          selectedRoomId: null,
        }),

      clearAll: () =>
        set({
          floors: [],
          selectedRoomId: null,
          reviewNotes: {},
          checklistStatus: {},
        }),
    }),
    {
      name: 'haunted-blueprint-store',
      partialize: (state) => ({
        floors: state.floors,
        reviewNotes: state.reviewNotes,
        checklistStatus: state.checklistStatus,
      }),
    }
  )
);

export const emotionOptions: { value: EmotionState; label: string; color: string }[] = [
  { value: 'unease', label: '不安', color: '#4f6d9e' },
  { value: 'doubt', label: '怀疑', color: '#7c6b99' },
  { value: 'oppression', label: '压迫', color: '#8b2635' },
  { value: 'relief', label: '释然', color: '#5a8a6b' },
];

export const spaceTypeOptions: { value: SpaceType; label: string }[] = [
  { value: 'narrow', label: '狭窄空间' },
  { value: 'normal', label: '常规空间' },
  { value: 'wide', label: '开阔空间' },
  { value: 'corridor', label: '走廊' },
  { value: 'staircase', label: '楼梯间' },
];

export const checklistStatusOptions: {
  value: ChecklistStatus;
  label: string;
  icon: 'todo' | 'check' | 'pause';
}[] = [
  { value: 'todo', label: '待处理', icon: 'todo' },
  { value: 'adopted', label: '已采纳', icon: 'check' },
  { value: 'deferred', label: '暂缓', icon: 'pause' },
];
