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
  ReviewSnapshot,
  ImportConfirmedMappings,
  SnapshotComparison,
  SnapshotCreateInput,
  IssueCategory,
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
import { validateAndImportBlueprintWithMappings } from '@/utils/importExport';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const categoryLabelForSnapshot: Record<IssueCategory, string> = {
  narrative: '叙事连贯性',
  rhythm: '恐怖节奏',
  foreshadow: '伏笔回收',
};

export function compareSnapshotWithCurrent(
  snapshot: ReviewSnapshot,
  currentChecklist: ChecklistItem[],
  currentReviewNotes: ReviewNotesMap,
  currentStatuses: ChecklistStatusMap
): SnapshotComparison {
  const currentScore = 0;
  const snapshotRegistryMap = new Map(
    snapshot.issueRegistry.map((it) => [it.id, it])
  );
  const currentRegistryMap = new Map(
    currentChecklist.map((it) => [it.id, { id: it.id, category: it.category, description: it.description }])
  );

  const newIssues: SnapshotComparison['newIssues'] = [];
  const resolvedIssues: SnapshotComparison['resolvedIssues'] = [];
  currentChecklist.forEach((it) => {
    if (!snapshotRegistryMap.has(it.id)) {
      newIssues.push({ id: it.id, category: it.category, description: it.description });
    }
  });
  snapshot.issueRegistry.forEach((it) => {
    if (!currentRegistryMap.has(it.id)) {
      resolvedIssues.push(it);
    }
  });

  const statusChanges: SnapshotComparison['statusChanges'] = [];
  currentChecklist.forEach((it) => {
    const oldStatus = snapshot.checklistStatus[it.id] || 'todo';
    const newStatus = currentStatuses[it.id] || 'todo';
    if (oldStatus !== newStatus) {
      statusChanges.push({
        id: it.id,
        description: it.description,
        from: oldStatus,
        to: newStatus,
      });
    }
  });

  const noteChanges: SnapshotComparison['noteChanges'] = [];
  currentChecklist.forEach((it) => {
    const oldNote = snapshot.reviewNotes[it.id] || '';
    const newNote = currentReviewNotes[it.id] || '';
    if (oldNote !== newNote && (oldNote.length > 0 || newNote.length > 0)) {
      noteChanges.push({
        id: it.id,
        description: it.description,
        oldNote,
        newNote,
      });
    }
  });
  snapshot.issueRegistry.forEach((it) => {
    if (!currentRegistryMap.has(it.id)) {
      const oldNote = snapshot.reviewNotes[it.id] || '';
      if (oldNote.length > 0) {
        noteChanges.push({
          id: it.id,
          description: it.description,
          oldNote,
          newNote: '',
        });
      }
    }
  });

  return {
    scoreChange: currentScore - snapshot.overallScore,
    newIssues,
    resolvedIssues,
    statusChanges,
    noteChanges,
  };
}

interface BlueprintStore {
  floors: Floor[];
  selectedRoomId: string | null;
  reviewNotes: ReviewNotesMap;
  checklistStatus: ChecklistStatusMap;
  reviewSnapshots: ReviewSnapshot[];

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

  previewImportJSONBlueprint: (rawJSON: string, mappings?: ImportConfirmedMappings) => ImportResult;
  confirmImportJSONBlueprint: (rawJSON: string, mappings?: ImportConfirmedMappings) => ImportResult;
  importBlueprintFromFloors: (floors: Floor[]) => void;

  saveReviewSnapshot: (input?: SnapshotCreateInput) => ReviewSnapshot;
  deleteReviewSnapshot: (id: string) => void;
  compareSnapshot: (snapshotId: string) => SnapshotComparison | null;

  getAllRooms: () => Room[];
  getNarrativeIssues: () => NarrativeIssue[];
  getRhythmIssues: () => RhythmIssue[];
  getForeshadowItems: () => ForeshadowItem[];
  getChecklist: () => ChecklistItem[];
  getDiagnosis: () => DiagnosisReport;

  loadSampleData: () => void;
  clearAll: () => void;
}

export { categoryLabelForSnapshot };

export const useBlueprintStore = create<BlueprintStore>()(
  persist(
    (set, get) => ({
      floors: [],
      selectedRoomId: null,
      reviewNotes: {},
      checklistStatus: {},
      reviewSnapshots: [],

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

      previewImportJSONBlueprint: (rawJSON, mappings) => {
        try {
          const parsed = JSON.parse(rawJSON);
          return validateAndImportBlueprintWithMappings(parsed, mappings);
        } catch (e: unknown) {
          const msg = e instanceof SyntaxError ? `JSON 语法错误：${e.message}` : '文件解析失败：未知错误';
          return { success: false, errors: [msg] };
        }
      },

      confirmImportJSONBlueprint: (rawJSON, mappings) => {
        try {
          const parsed = JSON.parse(rawJSON);
          const result = validateAndImportBlueprintWithMappings(parsed, mappings);
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

      saveReviewSnapshot: (input) => {
        const state = get();
        const diagnosis = state.getDiagnosis();
        const checklist = state.getChecklist();
        const notes = state.reviewNotes;
        const statuses = state.checklistStatus;

        let todoCount = 0;
        let adoptedCount = 0;
        let deferredCount = 0;
        checklist.forEach((it) => {
          const st = statuses[it.id] || 'todo';
          if (st === 'todo') todoCount++;
          else if (st === 'adopted') adoptedCount++;
          else deferredCount++;
        });

        const issueRegistry: ReviewSnapshot['issueRegistry'] = checklist.map(
          (it) => ({
            id: it.id,
            category: it.category,
            description: it.description,
          })
        );

        const snapshot: ReviewSnapshot = {
          id: generateId(),
          createdAt: new Date().toISOString(),
          overallScore: diagnosis.overallScore,
          summary: diagnosis.summary,
          narrativeCount: diagnosis.narrativeIssues.length,
          rhythmCount: diagnosis.rhythmIssues.length,
          foreshadowUnresolvedCount: diagnosis.foreshadowItems.filter(
            (f) => f.status !== 'resolved'
          ).length,
          noteCount: Object.values(notes).filter((n) => n.trim().length > 0).length,
          todoCount,
          adoptedCount,
          deferredCount,
          totalIssueCount: checklist.length,
          reviewNotes: { ...notes },
          checklistStatus: { ...statuses },
          meetingTitle: input?.meetingTitle?.trim() || undefined,
          attendees: input?.attendees?.trim() || undefined,
          meetingConclusion: input?.meetingConclusion?.trim() || undefined,
          issueRegistry,
        };

        set((state) => ({
          reviewSnapshots: [snapshot, ...state.reviewSnapshots].slice(0, 50),
        }));

        return snapshot;
      },

      deleteReviewSnapshot: (id) =>
        set((state) => ({
          reviewSnapshots: state.reviewSnapshots.filter((s) => s.id !== id),
        })),

      compareSnapshot: (snapshotId) => {
        const state = get();
        const snap = state.reviewSnapshots.find((s) => s.id === snapshotId);
        if (!snap) return null;
        const result = compareSnapshotWithCurrent(
          snap,
          state.getChecklist(),
          state.reviewNotes,
          state.checklistStatus
        );
        result.scoreChange = state.getDiagnosis().overallScore - snap.overallScore;
        return result;
      },

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
        reviewSnapshots: state.reviewSnapshots,
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
