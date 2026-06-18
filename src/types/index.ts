export type EmotionState = 'unease' | 'doubt' | 'oppression' | 'relief';
export type SpaceType = 'narrow' | 'normal' | 'wide' | 'corridor' | 'staircase';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type IssueCategory = 'narrative' | 'rhythm' | 'foreshadow';
export type ChecklistStatus = 'todo' | 'adopted' | 'deferred';

export interface Room {
  id: string;
  name: string;
  mainEvent: string;
  visibleObjects: string[];
  emotionState: EmotionState;
  spaceType: SpaceType;
  order: number;
}

export interface Floor {
  id: string;
  name: string;
  order: number;
  rooms: Room[];
}

export interface NarrativeIssue {
  id: string;
  fromRoom: string;
  toRoom: string;
  fromRoomId: string;
  toRoomId: string;
  description: string;
  suggestion: string;
  missingEvidence: string[];
  priority: Priority;
}

export interface RhythmIssue {
  id: string;
  rooms: string[];
  roomIds: string[];
  description: string;
  suggestion: string;
  rhythmPattern: string;
  priority: Priority;
}

export type ForeshadowStatus = 'resolved' | 'unresolved' | 'partial';

export interface ForeshadowItem {
  id: string;
  element: string;
  introducedIn: string;
  introducedInId: string;
  resolvedIn: string | null;
  resolvedInId: string | null;
  status: ForeshadowStatus;
  description: string;
  priority: Priority;
}

export interface ChecklistItem {
  id: string;
  category: IssueCategory;
  priority: Priority;
  description: string;
  suggestion: string;
  relatedRoom: string;
  relatedRoomId: string | null;
}

export interface DiagnosisReport {
  narrativeIssues: NarrativeIssue[];
  rhythmIssues: RhythmIssue[];
  foreshadowItems: ForeshadowItem[];
  overallScore: number;
  summary: string;
}

export interface EmotionPoint {
  roomName: string;
  roomId: string;
  emotion: EmotionState;
  value: number;
  index: number;
}

export interface ImportedRoom {
  name?: string;
  mainEvent?: string;
  visibleObjects?: string[];
  emotionState?: EmotionState;
  spaceType?: SpaceType;
  order?: number;
}

export interface ImportedFloor {
  name?: string;
  order?: number;
  rooms?: ImportedRoom[];
}

export interface ImportedBlueprint {
  floors?: ImportedFloor[];
  projectName?: string;
  version?: string;
}

export interface ImportResult {
  success: boolean;
  data?: Floor[];
  errors?: string[];
  warnings?: string[];
}

export type ReviewNotesMap = Record<string, string>;

export type ChecklistStatusMap = Record<string, ChecklistStatus>;

export interface ReviewSnapshot {
  id: string;
  createdAt: string;
  overallScore: number;
  summary: string;
  narrativeCount: number;
  rhythmCount: number;
  foreshadowUnresolvedCount: number;
  noteCount: number;
  todoCount: number;
  adoptedCount: number;
  deferredCount: number;
  totalIssueCount: number;
  reviewNotes: ReviewNotesMap;
  checklistStatus: ChecklistStatusMap;
  meetingTitle?: string;
  attendees?: string;
  meetingConclusion?: string;
  issueRegistry: { id: string; category: IssueCategory; description: string }[];
}

export interface SnapshotComparison {
  scoreChange: number;
  newIssues: { id: string; category: IssueCategory; description: string }[];
  resolvedIssues: { id: string; category: IssueCategory; description: string }[];
  statusChanges: {
    id: string;
    description: string;
    from: ChecklistStatus;
    to: ChecklistStatus;
  }[];
  noteChanges: {
    id: string;
    description: string;
    oldNote: string;
    newNote: string;
  }[];
}

export interface SnapshotCreateInput {
  meetingTitle?: string;
  attendees?: string;
  meetingConclusion?: string;
}

export interface FieldMapping {
  sourceKey: string;
  targetKey: string;
  label: string;
  sampleValue?: string;
}

export interface ImportPreview {
  floors: ImportedFloor[];
  fieldMappings: FieldMapping[];
  unmappedKeys: string[];
  stats: {
    floorCount: number;
    roomCount: number;
    fieldsDetected: number;
    fieldsMapped: number;
  };
}

export type ImportConfirmedMappings = Record<string, string>;
