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

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

interface BlueprintStore {
  floors: Floor[];
  selectedRoomId: string | null;

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

      loadSampleData: () => set({ floors: sampleFloors, selectedRoomId: null }),

      clearAll: () => set({ floors: [], selectedRoomId: null }),
    }),
    {
      name: 'haunted-blueprint-store',
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
