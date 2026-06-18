export type EmotionState = 'unease' | 'doubt' | 'oppression' | 'relief';
export type SpaceType = 'narrow' | 'normal' | 'wide' | 'corridor' | 'staircase';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type IssueCategory = 'narrative' | 'rhythm' | 'foreshadow';

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
