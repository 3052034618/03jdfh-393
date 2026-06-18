import type {
  Floor,
  Room,
  EmotionState,
  SpaceType,
  ImportedBlueprint,
  ImportResult,
  ImportedRoom,
  ImportedFloor,
  DiagnosisReport,
  ChecklistItem,
  ReviewNotesMap,
  ChecklistStatusMap,
  Priority,
  FieldMapping,
  ImportConfirmedMappings,
  ReviewSnapshot,
  SnapshotComparison,
  IssueCategory,
  ChecklistStatus,
} from '@/types';
import type { NarrativeIssue, RhythmIssue, ForeshadowItem } from '@/types';
import { emotionLabel, spaceTypeLabel } from './diagnosis';

const VALID_EMOTIONS: EmotionState[] = ['unease', 'doubt', 'oppression', 'relief'];
const VALID_SPACES: SpaceType[] = ['narrow', 'normal', 'wide', 'corridor', 'staircase'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function isValidEmotion(val: unknown): val is EmotionState {
  return typeof val === 'string' && VALID_EMOTIONS.includes(val as EmotionState);
}

function isValidSpace(val: unknown): val is SpaceType {
  return typeof val === 'string' && VALID_SPACES.includes(val as SpaceType);
}

const emotionAliasMap: Record<string, EmotionState> = {
  不安: 'unease',
  怀疑: 'doubt',
  压迫: 'oppression',
  释然: 'relief',
  unease: 'unease',
  doubt: 'doubt',
  oppression: 'oppression',
  relief: 'relief',
};

const spaceAliasMap: Record<string, SpaceType> = {
  狭窄: 'narrow',
  狭窄空间: 'narrow',
  常规: 'normal',
  常规空间: 'normal',
  开阔: 'wide',
  开阔空间: 'wide',
  走廊: 'corridor',
  楼梯间: 'staircase',
  narrow: 'narrow',
  normal: 'normal',
  wide: 'wide',
  corridor: 'corridor',
  staircase: 'staircase',
};

export function validateAndImportBlueprint(raw: unknown): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const floors: Floor[] = [];

  if (raw === null || raw === undefined) {
    return { success: false, errors: ['文件内容为空'] };
  }

  if (typeof raw !== 'object') {
    return { success: false, errors: ['顶层结构必须是 JSON 对象'] };
  }

  const data = raw as ImportedBlueprint;

  if (!data.floors) {
    return { success: false, errors: ['缺少必填字段：floors（楼层数组）'] };
  }

  if (!Array.isArray(data.floors)) {
    return { success: false, errors: ['floors 必须是数组类型'] };
  }

  if (data.floors.length === 0) {
    warnings.push('floors 数组为空，导入后不会有任何楼层');
  }

  data.floors.forEach((importedFloor: ImportedFloor, floorIdx: number) => {
    if (typeof importedFloor !== 'object' || importedFloor === null) {
      errors.push(`第 ${floorIdx + 1} 个楼层不是有效对象`);
      return;
    }

    const floorName = importedFloor.name?.trim() || `楼层 ${floorIdx + 1}`;
    if (!importedFloor.name) {
      warnings.push(`第 ${floorIdx + 1} 个楼层未命名，已自动命名为「${floorName}」`);
    }

    const rooms: Room[] = [];
    const importedRooms = Array.isArray(importedFloor.rooms) ? importedFloor.rooms : [];

    if (!Array.isArray(importedFloor.rooms) && importedFloor.rooms !== undefined) {
      warnings.push(`楼层「${floorName}」的 rooms 不是数组，已忽略`);
    }

    importedRooms.forEach((importedRoom: ImportedRoom, roomIdx: number) => {
      if (typeof importedRoom !== 'object' || importedRoom === null) {
        errors.push(`楼层「${floorName}」第 ${roomIdx + 1} 个房间不是有效对象`);
        return;
      }

      let roomName = importedRoom.name?.trim();
      if (!roomName) {
        roomName = `房间 ${roomIdx + 1}`;
        warnings.push(`楼层「${floorName}」第 ${roomIdx + 1} 个房间未命名，已自动命名为「${roomName}」`);
      }

      let emotionState: EmotionState = 'unease';
      if (importedRoom.emotionState !== undefined) {
        const key = String(importedRoom.emotionState).trim();
        if (isValidEmotion(key)) {
          emotionState = key;
        } else if (emotionAliasMap[key]) {
          emotionState = emotionAliasMap[key];
        } else {
          warnings.push(
            `房间「${roomName}」的心理状态「${importedRoom.emotionState}」无效，已默认设为「不安」`
          );
        }
      } else {
        warnings.push(`房间「${roomName}」未设置心理状态，已默认设为「不安」`);
      }

      let spaceType: SpaceType = 'normal';
      if (importedRoom.spaceType !== undefined) {
        const key = String(importedRoom.spaceType).trim();
        if (isValidSpace(key)) {
          spaceType = key;
        } else if (spaceAliasMap[key]) {
          spaceType = spaceAliasMap[key];
        } else {
          warnings.push(
            `房间「${roomName}」的空间类型「${importedRoom.spaceType}」无效，已默认设为「常规空间」`
          );
        }
      }

      let visibleObjects: string[] = [];
      if (importedRoom.visibleObjects !== undefined) {
        if (Array.isArray(importedRoom.visibleObjects)) {
          visibleObjects = importedRoom.visibleObjects
            .map((o) => String(o).trim())
            .filter((o) => o.length > 0);
        } else {
          warnings.push(`房间「${roomName}」的 visibleObjects 不是数组，已忽略`);
        }
      }

      let mainEvent = '';
      if (importedRoom.mainEvent !== undefined) {
        mainEvent = String(importedRoom.mainEvent).trim();
      }

      const order =
        typeof importedRoom.order === 'number' ? importedRoom.order : roomIdx;

      rooms.push({
        id: generateId(),
        name: roomName,
        mainEvent,
        visibleObjects,
        emotionState,
        spaceType,
        order,
      });
    });

    rooms.sort((a, b) => a.order - b.order);
    rooms.forEach((r, i) => (r.order = i));

    floors.push({
      id: generateId(),
      name: floorName,
      order: typeof importedFloor.order === 'number' ? importedFloor.order : floorIdx,
      rooms,
    });
  });

  floors.sort((a, b) => a.order - b.order);
  floors.forEach((f, i) => (f.order = i));

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return { success: true, data: floors, warnings };
}

const ROOM_FIELD_ALIASES: { keys: string[]; target: string; label: string }[] = [
  { keys: ['name', 'roomName', 'room_name', 'title', '房间名', '房名'], target: 'name', label: '房间名称' },
  { keys: ['mainEvent', 'main_event', 'event', '事件', '主要事件', 'description'], target: 'mainEvent', label: '主要事件' },
  { keys: ['visibleObjects', 'visible_objects', 'objects', 'items', 'props', '物件', '可见物件', 'roomObjects'], target: 'visibleObjects', label: '可见物件' },
  { keys: ['emotionState', 'emotion_state', 'emotion', 'mood', '心理', '情绪', '心理状态'], target: 'emotionState', label: '心理状态' },
  { keys: ['spaceType', 'space_type', 'space', 'type', '空间类型', '空间'], target: 'spaceType', label: '空间类型' },
  { keys: ['order', 'index', 'sort', 'seq', '顺序'], target: 'order', label: '排序' },
];

const FLOOR_FIELD_ALIASES: { keys: string[]; target: string; label: string }[] = [
  { keys: ['name', 'floorName', 'floor_name', '楼层名', '楼层'], target: 'name', label: '楼层名称' },
  { keys: ['rooms', 'roomList', 'room_list', 'roomsList', 'room_list', '房间列表', 'roomItems'], target: 'rooms', label: '房间列表' },
  { keys: ['order', 'index', 'sort', 'seq'], target: 'order', label: '排序' },
];

export function detectFieldMappings(raw: unknown): {
  mappings: FieldMapping[];
  unmappedKeys: string[];
  rawFloors: ImportedFloor[];
} {
  const mappings: FieldMapping[] = [];
  const mappedSourceKeys = new Set<string>();

  if (!raw || typeof raw !== 'object') return { mappings: [], unmappedKeys: [], rawFloors: [] };
  const data = raw as ImportedBlueprint;
  if (!Array.isArray(data.floors) || data.floors.length === 0) {
    return { mappings: [], unmappedKeys: [], rawFloors: [] };
  }

  const firstFloor = data.floors[0] as Record<string, unknown>;
  const floorKeys = Object.keys(firstFloor);

  FLOOR_FIELD_ALIASES.forEach((alias) => {
    for (const key of floorKeys) {
      if (alias.keys.includes(key)) {
        mappings.push({
          sourceKey: key,
          targetKey: alias.target,
          label: alias.label,
          sampleValue: key === alias.target
            ? undefined
            : truncateSample(firstFloor[key]),
        });
        mappedSourceKeys.add(key);
        break;
      }
    }
  });

  const firstFloorData = data.floors[0] as Record<string, unknown>;
  let firstRooms: ImportedRoom[] = [];
  let roomsKeyFound = false;
  for (const alias of FLOOR_FIELD_ALIASES.find((a) => a.target === 'rooms')?.keys || []) {
    if (alias in firstFloorData && Array.isArray(firstFloorData[alias])) {
      firstRooms = firstFloorData[alias] as ImportedRoom[];
      roomsKeyFound = true;
      break;
    }
  }
  if (!roomsKeyFound && Array.isArray(firstFloorData.rooms)) {
    firstRooms = firstFloorData.rooms;
  }
  if (firstRooms.length > 0) {
    const firstRoom = firstRooms[0] as Record<string, unknown>;
    const roomKeys = Object.keys(firstRoom);

    ROOM_FIELD_ALIASES.forEach((alias) => {
      for (const key of roomKeys) {
        if (alias.keys.includes(key)) {
          mappings.push({
            sourceKey: key,
            targetKey: alias.target,
            label: alias.label,
            sampleValue: key === alias.target
              ? undefined
              : truncateSample(firstRoom[key]),
          });
          mappedSourceKeys.add(key);
          break;
        }
      }
    });

    const allRoomKeys = new Set<string>();
    firstRooms.forEach((r: unknown) => {
      if (typeof r === 'object' && r !== null) {
        Object.keys(r as Record<string, unknown>).forEach((k) => allRoomKeys.add(k));
      }
    });
    const unmappedKeys = Array.from(allRoomKeys).filter((k) => !mappedSourceKeys.has(k));
    return { mappings, unmappedKeys, rawFloors: data.floors };
  }

  const unmappedKeys = floorKeys.filter((k) => !mappedSourceKeys.has(k));
  return { mappings, unmappedKeys, rawFloors: data.floors };
}

function truncateSample(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    const items = val.map((v) => String(v).trim()).filter((v) => v);
    return items.length > 2 ? `${items.slice(0, 2).join(', ')}...` : items.join(', ');
  }
  const s = String(val).trim();
  return s.length > 40 ? s.slice(0, 40) + '...' : s;
}

function applyMappingsToFloors(
  rawFloors: ImportedFloor[],
  mappings: ImportConfirmedMappings
): ImportedFloor[] {
  const roomKeyMap: Record<string, string> = {};
  const floorKeyMap: Record<string, string> = {};
  const reverseFloorKeyMap: Record<string, string> = {};

  Object.entries(mappings).forEach(([sourceKey, targetKey]) => {
    const isFloorAlias = FLOOR_FIELD_ALIASES.some((a) => a.keys.includes(sourceKey));
    if (isFloorAlias) {
      floorKeyMap[sourceKey] = targetKey;
      reverseFloorKeyMap[targetKey] = sourceKey;
    } else {
      roomKeyMap[sourceKey] = targetKey;
    }
  });

  return rawFloors.map((rawFloor) => {
    const rawFloorObj = rawFloor as unknown as Record<string, unknown>;
    const mappedFloor: Record<string, unknown> = {};
    Object.entries(rawFloorObj).forEach(([key, val]) => {
      const targetKey = floorKeyMap[key] || key;
      if (targetKey === 'rooms' && !Array.isArray(val)) {
        mappedFloor.rooms = [];
      } else {
        mappedFloor[targetKey] = val;
      }
    });

    const roomsSourceKey = reverseFloorKeyMap['rooms'] || 'rooms';
    const rawRoomsRaw = rawFloorObj[roomsSourceKey];
    const rawRooms: ImportedRoom[] = Array.isArray(rawRoomsRaw) ? rawRoomsRaw as ImportedRoom[] : [];

    mappedFloor.rooms = rawRooms.map((rawRoom) => {
      const mappedRoom: Record<string, unknown> = {};
      Object.entries(rawRoom as unknown as Record<string, unknown>).forEach(([key, val]) => {
        const targetKey = roomKeyMap[key] || key;
        if (targetKey === 'visibleObjects' && !Array.isArray(val)) {
          if (typeof val === 'string') {
            mappedRoom.visibleObjects = val.split(/[,，、;；]/).map((s: string) => s.trim()).filter(Boolean);
          } else {
            mappedRoom.visibleObjects = [];
          }
        } else {
          mappedRoom[targetKey] = val;
        }
      });
      return mappedRoom as ImportedRoom;
    });

    return mappedFloor as ImportedFloor;
  });
}

export function validateAndImportBlueprintWithMappings(
  raw: unknown,
  mappings?: ImportConfirmedMappings
): ImportResult {
  if (!mappings || Object.keys(mappings).length === 0) {
    return validateAndImportBlueprint(raw);
  }

  const data = raw as ImportedBlueprint;
  if (!data.floors) {
    return { success: false, errors: ['缺少必填字段：floors（楼层数组）'] };
  }

  const mappedFloors = applyMappingsToFloors(data.floors, mappings);
  const mappedBlueprint = { ...data, floors: mappedFloors };
  return validateAndImportBlueprint(mappedBlueprint);
}

export function exportBlueprintToJSON(floors: Floor[]): string {
  const exportData = {
    projectName: '鬼屋空间蓝图',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    floors: floors.map((floor) => ({
      name: floor.name,
      order: floor.order,
      rooms: floor.rooms.map((room) => ({
        name: room.name,
        mainEvent: room.mainEvent,
        visibleObjects: room.visibleObjects,
        emotionState: room.emotionState,
        emotionStateLabel: emotionLabel[room.emotionState],
        spaceType: room.spaceType,
        spaceTypeLabel: spaceTypeLabel[room.spaceType],
        order: room.order,
      })),
    })),
  };
  return JSON.stringify(exportData, null, 2);
}

const priorityLabel: Record<Priority, string> = {
  critical: '严重',
  high: '重要',
  medium: '中等',
  low: '轻微',
};

const categoryLabel: Record<string, string> = {
  narrative: '叙事连贯性',
  rhythm: '恐怖节奏',
  foreshadow: '伏笔回收',
};

export function exportReportToMarkdown(
  diagnosis: DiagnosisReport,
  checklist: ChecklistItem[],
  reviewNotes: ReviewNotesMap = {},
  statusMap: ChecklistStatusMap = {}
): string {
  const today = new Date().toLocaleDateString('zh-CN');
  const lines: string[] = [];

  lines.push('# 鬼屋空间叙事评审报告');
  lines.push('');
  lines.push(`> 生成日期：${today}`);
  lines.push(`> 叙事指数：**${diagnosis.overallScore}** / 100`);
  lines.push('');
  lines.push('## 评审总览');
  lines.push('');
  lines.push(diagnosis.summary);
  lines.push('');
  lines.push(`- 叙事断层问题：${diagnosis.narrativeIssues.length} 项`);
  lines.push(`- 恐怖节奏问题：${diagnosis.rhythmIssues.length} 项`);
  lines.push(`- 伏笔待回收：${diagnosis.foreshadowItems.filter((f) => f.status !== 'resolved').length} 项`);
  lines.push('');

  lines.push('## 一、空间叙事连贯性');
  lines.push('');
  if (diagnosis.narrativeIssues.length === 0) {
    lines.push('相邻房间之间过渡自然，未发现明显叙事断层。');
  } else {
    diagnosis.narrativeIssues.forEach((issue: NarrativeIssue, idx) => {
      lines.push(`### ${idx + 1}. 「${issue.fromRoom}」→「${issue.toRoom}」`);
      lines.push('');
      lines.push(`- **优先级**：${priorityLabel[issue.priority]}`);
      lines.push(`- **问题描述**：${issue.description}`);
      lines.push(`- **缺失证据**：`);
      issue.missingEvidence.forEach((ev) => lines.push(`  - ${ev}`));
      lines.push(`- **修改建议**：${issue.suggestion}`);
      if (reviewNotes[issue.id]) {
        lines.push(`- **评审备注**：${reviewNotes[issue.id]}`);
      }
      lines.push('');
    });
  }

  lines.push('## 二、恐怖节奏分析');
  lines.push('');
  if (diagnosis.rhythmIssues.length === 0) {
    lines.push('空间节奏把控良好，情绪曲线存在合理起伏。');
  } else {
    diagnosis.rhythmIssues.forEach((issue: RhythmIssue, idx) => {
      lines.push(`### ${idx + 1}. 节奏模式「${issue.rhythmPattern}」`);
      lines.push('');
      lines.push(`- **优先级**：${priorityLabel[issue.priority]}`);
      lines.push(`- **问题描述**：${issue.description}`);
      lines.push(`- **涉及房间**：${issue.rooms.join(' → ')}`);
      lines.push(`- **修改建议**：${issue.suggestion}`);
      if (reviewNotes[issue.id]) {
        lines.push(`- **评审备注**：${reviewNotes[issue.id]}`);
      }
      lines.push('');
    });
  }

  lines.push('## 三、伏笔回收清单');
  lines.push('');
  lines.push('| 伏笔元素 | 首次出现 | 回收状态 | 回收位置 | 优先级 | 评审备注 |');
  lines.push('|----------|----------|----------|----------|--------|----------|');
  diagnosis.foreshadowItems.forEach((item: ForeshadowItem) => {
    const statusText =
      item.status === 'resolved' ? '✅ 已回收' : item.status === 'partial' ? '⚠️ 部分回收' : '❌ 未回收';
    const note = reviewNotes[item.id] || '';
    lines.push(
      `| ${item.element} | ${item.introducedIn} | ${statusText} | ${item.resolvedIn || '—'} | ${priorityLabel[item.priority]} | ${note} |`
    );
  });
  lines.push('');

  lines.push('## 四、修改清单');
  lines.push('');

  const statusLabel: Record<string, string> = {
    todo: '待处理',
    adopted: '已采纳',
    deferred: '暂缓',
  };

  const grouped = {
    todo: [] as ChecklistItem[],
    adopted: [] as ChecklistItem[],
    deferred: [] as ChecklistItem[],
  };
  checklist.forEach((item) => {
    const st = statusMap[item.id] || 'todo';
    grouped[st].push(item);
  });

  (['todo', 'adopted', 'deferred'] as const).forEach((st) => {
    lines.push(`### ${statusLabel[st]}（${grouped[st].length}）`);
    lines.push('');
    if (grouped[st].length === 0) {
      lines.push('_无_');
    } else {
      grouped[st].forEach((item, idx) => {
        lines.push(
          `${idx + 1}. **[${priorityLabel[item.priority]}] ${categoryLabel[item.category]}** — ${item.relatedRoom}`
        );
        lines.push(`   - 问题：${item.description}`);
        lines.push(`   - 建议：${item.suggestion}`);
        if (reviewNotes[item.id]) {
          lines.push(`   - 备注：${reviewNotes[item.id]}`);
        }
        lines.push('');
      });
    }
  });

  lines.push('---');
  lines.push('');
  lines.push('_本报告由 HAUNT LAB 空间叙事评审系统自动生成_');

  return lines.join('\n');
}

export function exportReportToText(
  diagnosis: DiagnosisReport,
  checklist: ChecklistItem[],
  reviewNotes: ReviewNotesMap = {},
  statusMap: ChecklistStatusMap = {}
): string {
  const today = new Date().toLocaleDateString('zh-CN');
  const lines: string[] = [];

  lines.push('======================================');
  lines.push('   鬼屋空间叙事评审报告');
  lines.push('======================================');
  lines.push(`生成日期：${today}`);
  lines.push(`叙事指数：${diagnosis.overallScore} / 100`);
  lines.push('');
  lines.push('【评审总览】');
  lines.push(diagnosis.summary);
  lines.push('');
  lines.push(
    `统计：叙事断层 ${diagnosis.narrativeIssues.length} 项 | 节奏问题 ${diagnosis.rhythmIssues.length} 项 | 伏笔待回收 ${diagnosis.foreshadowItems.filter((f) => f.status !== 'resolved').length} 项`
  );
  lines.push('');

  lines.push('--------------------------------------');
  lines.push('一、空间叙事连贯性');
  lines.push('--------------------------------------');
  if (diagnosis.narrativeIssues.length === 0) {
    lines.push('相邻房间之间过渡自然，未发现明显叙事断层。');
  } else {
    diagnosis.narrativeIssues.forEach((issue: NarrativeIssue, idx) => {
      lines.push('');
      lines.push(`${idx + 1}. ${issue.fromRoom} → ${issue.toRoom} [${priorityLabel[issue.priority]}]`);
      lines.push(`   问题：${issue.description}`);
      issue.missingEvidence.forEach((ev) => lines.push(`     · ${ev}`));
      lines.push(`   建议：${issue.suggestion}`);
      if (reviewNotes[issue.id]) {
        lines.push(`   备注：${reviewNotes[issue.id]}`);
      }
    });
  }
  lines.push('');

  lines.push('--------------------------------------');
  lines.push('二、恐怖节奏分析');
  lines.push('--------------------------------------');
  if (diagnosis.rhythmIssues.length === 0) {
    lines.push('空间节奏把控良好，情绪曲线存在合理起伏。');
  } else {
    diagnosis.rhythmIssues.forEach((issue: RhythmIssue, idx) => {
      lines.push('');
      lines.push(`${idx + 1}. 模式：${issue.rhythmPattern} [${priorityLabel[issue.priority]}]`);
      lines.push(`   问题：${issue.description}`);
      lines.push(`   涉及：${issue.rooms.join(' → ')}`);
      lines.push(`   建议：${issue.suggestion}`);
      if (reviewNotes[issue.id]) {
        lines.push(`   备注：${reviewNotes[issue.id]}`);
      }
    });
  }
  lines.push('');

  lines.push('--------------------------------------');
  lines.push('三、伏笔回收清单');
  lines.push('--------------------------------------');
  diagnosis.foreshadowItems.forEach((item: ForeshadowItem, idx) => {
    const statusText =
      item.status === 'resolved' ? '已回收' : item.status === 'partial' ? '部分回收' : '未回收';
    lines.push(
      `${idx + 1}. [${priorityLabel[item.priority]}][${statusText}] ${item.element} @ ${item.introducedIn} → ${item.resolvedIn || '（未回收）'}`
    );
    if (reviewNotes[item.id]) {
      lines.push(`   备注：${reviewNotes[item.id]}`);
    }
  });
  lines.push('');

  lines.push('--------------------------------------');
  lines.push('四、修改清单');
  lines.push('--------------------------------------');

  const statusLabel: Record<string, string> = {
    todo: '待处理',
    adopted: '已采纳',
    deferred: '暂缓',
  };
  const grouped = {
    todo: [] as ChecklistItem[],
    adopted: [] as ChecklistItem[],
    deferred: [] as ChecklistItem[],
  };
  checklist.forEach((item) => {
    const st = statusMap[item.id] || 'todo';
    grouped[st].push(item);
  });

  (['todo', 'adopted', 'deferred'] as const).forEach((st) => {
    lines.push('');
    lines.push(`【${statusLabel[st]}】${grouped[st].length} 项`);
    grouped[st].forEach((item, idx) => {
      lines.push(
        `${idx + 1}. [${priorityLabel[item.priority]}][${categoryLabel[item.category]}] ${item.relatedRoom}`
      );
      lines.push(`   问题：${item.description}`);
      lines.push(`   建议：${item.suggestion}`);
      if (reviewNotes[item.id]) {
        lines.push(`   备注：${reviewNotes[item.id]}`);
      }
    });
  });

  lines.push('');
  lines.push('======================================');
  lines.push('本报告由 HAUNT LAB 空间叙事评审系统生成');
  lines.push('======================================');

  return lines.join('\n');
}

const categoryLabelForExport: Record<IssueCategory, string> = {
  narrative: '叙事连贯性',
  rhythm: '恐怖节奏',
  foreshadow: '伏笔回收',
};

const statusLabelForExport: Record<ChecklistStatus, string> = {
  todo: '待处理',
  adopted: '已采纳',
  deferred: '暂缓',
};

export function exportMeetingSummaryToMarkdown(
  snapshot: ReviewSnapshot,
  comparison?: SnapshotComparison | null,
  currentChecklist?: ChecklistItem[]
): string {
  const lines: string[] = [];
  const createdAt = new Date(snapshot.createdAt).toLocaleString('zh-CN');

  lines.push(`# 评审会纪要：${snapshot.meetingTitle || '未命名会议'}`);
  lines.push('');
  lines.push(`> **会议时间**：${createdAt}`);
  if (snapshot.attendees) {
    lines.push(`> **参会人**：${snapshot.attendees}`);
  }
  lines.push(`> **叙事指数**：${snapshot.overallScore} / 100`);
  lines.push(`> **问题总数**：${snapshot.totalIssueCount} · 待处理 ${snapshot.todoCount} · 已采纳 ${snapshot.adoptedCount} · 暂缓 ${snapshot.deferredCount}`);
  lines.push(`> **评审备注**：${snapshot.noteCount} 条`);
  lines.push('');

  if (snapshot.meetingConclusion) {
    lines.push('## 结论摘要');
    lines.push('');
    lines.push(snapshot.meetingConclusion);
    lines.push('');
  }

  if (comparison) {
    lines.push('## 相较上次评审的变化');
    lines.push('');
    lines.push(`- **叙事指数变化**：${comparison.scoreChange >= 0 ? '+' : ''}${comparison.scoreChange}`);
    if (comparison.newIssues.length > 0) {
      lines.push(`- **新增问题**：${comparison.newIssues.length} 项`);
    }
    if (comparison.resolvedIssues.length > 0) {
      lines.push(`- **已解决（不再出现）**：${comparison.resolvedIssues.length} 项`);
    }
    if (comparison.statusChanges.length > 0) {
      lines.push(`- **状态变更**：${comparison.statusChanges.length} 项`);
    }
    if (comparison.noteChanges.length > 0) {
      lines.push(`- **备注更新**：${comparison.noteChanges.length} 项`);
    }
    if (comparison.actionChanges.length > 0) {
      lines.push(`- **行动项变更**：${comparison.actionChanges.length} 项`);
    }
    lines.push('');

    if (comparison.newIssues.length > 0) {
      lines.push('### 新增问题');
      lines.push('');
      comparison.newIssues.forEach((it, i) => {
        lines.push(`${i + 1}. [${categoryLabelForExport[it.category]}] ${it.description}`);
      });
      lines.push('');
    }

    if (comparison.resolvedIssues.length > 0) {
      lines.push('### 已解决问题（本次蓝图中不再出现）');
      lines.push('');
      comparison.resolvedIssues.forEach((it, i) => {
        lines.push(`${i + 1}. [${categoryLabelForExport[it.category]}] ${it.description}`);
      });
      lines.push('');
    }

    if (comparison.statusChanges.length > 0) {
      lines.push('### 状态变更');
      lines.push('');
      comparison.statusChanges.forEach((it, i) => {
        lines.push(`${i + 1}. ${statusLabelForExport[it.from]} → **${statusLabelForExport[it.to]}** · ${it.description}`);
      });
      lines.push('');
    }

    if (comparison.noteChanges.length > 0) {
      lines.push('### 备注更新');
      lines.push('');
      comparison.noteChanges.forEach((it, i) => {
        lines.push(`${i + 1}. ${it.description}`);
        if (it.oldNote) lines.push(`   - 上次：${it.oldNote}`);
        if (it.newNote) lines.push(`   - 本次：${it.newNote}`);
        lines.push('');
      });
    }

    if (comparison.actionChanges.length > 0) {
      const actionLabel: Record<'assignee' | 'dueDate' | 'nextStep', string> = {
        assignee: '负责人',
        dueDate: '截止时间',
        nextStep: '下一步动作',
      };
      lines.push('### 行动项变更');
      lines.push('');
      comparison.actionChanges.forEach((it, i) => {
        lines.push(`${i + 1}. ${it.description}`);
        lines.push(`   - ${actionLabel[it.field]}：${it.oldValue || '（未填写）'} → **${it.newValue || '（已清空）'}**`);
        lines.push('');
      });
    }
  }

  lines.push('## 修改清单（按状态）');
  lines.push('');
  const todoItems = snapshot.issueRegistry.filter(
    (it) => (snapshot.checklistStatus[it.id] || 'todo') === 'todo'
  );
  const adoptedItems = snapshot.issueRegistry.filter(
    (it) => snapshot.checklistStatus[it.id] === 'adopted'
  );
  const deferredItems = snapshot.issueRegistry.filter(
    (it) => snapshot.checklistStatus[it.id] === 'deferred'
  );

  lines.push(`### 待处理（${todoItems.length}）`);
  lines.push('');
  if (todoItems.length === 0) {
    lines.push('_无_');
  } else {
    todoItems.forEach((it, i) => {
      lines.push(`${i + 1}. [${categoryLabelForExport[it.category]}] ${it.description}`);
      const note = snapshot.reviewNotes[it.id];
      if (note) lines.push(`   - 评审备注：${note}`);
      const act = snapshot.actionItems?.[it.id];
      if (act) {
        if (act.assignee) lines.push(`   - 负责人：${act.assignee}`);
        if (act.dueDate) lines.push(`   - 截止：${act.dueDate}`);
        if (act.nextStep) lines.push(`   - 下一步：${act.nextStep}`);
      }
      lines.push('');
    });
  }

  lines.push(`### 已采纳（${adoptedItems.length}）`);
  lines.push('');
  if (adoptedItems.length === 0) {
    lines.push('_无_');
  } else {
    adoptedItems.forEach((it, i) => {
      lines.push(`${i + 1}. [${categoryLabelForExport[it.category]}] ${it.description}`);
      const note = snapshot.reviewNotes[it.id];
      if (note) lines.push(`   - 评审备注：${note}`);
      const act = snapshot.actionItems?.[it.id];
      if (act) {
        if (act.assignee) lines.push(`   - 负责人：${act.assignee}`);
        if (act.dueDate) lines.push(`   - 截止：${act.dueDate}`);
        if (act.nextStep) lines.push(`   - 下一步：${act.nextStep}`);
      }
      lines.push('');
    });
  }

  lines.push(`### 暂缓（${deferredItems.length}）`);
  lines.push('');
  if (deferredItems.length === 0) {
    lines.push('_无_');
  } else {
    deferredItems.forEach((it, i) => {
      lines.push(`${i + 1}. [${categoryLabelForExport[it.category]}] ${it.description}`);
      const note = snapshot.reviewNotes[it.id];
      if (note) lines.push(`   - 评审备注：${note}`);
      const act = snapshot.actionItems?.[it.id];
      if (act) {
        if (act.assignee) lines.push(`   - 负责人：${act.assignee}`);
        if (act.dueDate) lines.push(`   - 截止：${act.dueDate}`);
        if (act.nextStep) lines.push(`   - 下一步：${act.nextStep}`);
      }
      lines.push('');
    });
  }

  const actionRows = snapshot.issueRegistry
    .map((it) => ({ item: it, action: snapshot.actionItems?.[it.id] }))
    .filter(({ action }) => action && (action.assignee || action.dueDate || action.nextStep));
  if (actionRows.length > 0) {
    lines.push('## 行动项汇总（按负责人）');
    lines.push('');
    const byAssignee = new Map<string, typeof actionRows>();
    actionRows.forEach((row) => {
      const k = (row.action?.assignee || '').trim() || '未分配';
      if (!byAssignee.has(k)) byAssignee.set(k, []);
      byAssignee.get(k)!.push(row);
    });
    Array.from(byAssignee.entries()).forEach(([assignee, rows]) => {
      lines.push(`### ${assignee}（${rows.length} 项）`);
      lines.push('');
      rows.forEach(({ item, action }, i) => {
        lines.push(`${i + 1}. ${item.description}`);
        if (action?.dueDate) lines.push(`   - 截止：${action.dueDate}`);
        if (action?.nextStep) lines.push(`   - 下一步：${action.nextStep}`);
        lines.push(`   - 状态：**${statusLabelForExport[snapshot.checklistStatus[item.id] || 'todo']}**`);
        lines.push('');
      });
    });
  }

  const issueWithNotes = snapshot.issueRegistry.filter(
    (it) => snapshot.reviewNotes[it.id] && snapshot.reviewNotes[it.id].trim().length > 0
  );
  const foreshadowWithNotes = (snapshot.foreshadowRegistry || []).filter(
    (it) => snapshot.reviewNotes[it.id] && snapshot.reviewNotes[it.id].trim().length > 0
  );
  const totalNoteCount = issueWithNotes.length + foreshadowWithNotes.length;
  if (totalNoteCount > 0) {
    lines.push('## 评审备注汇总');
    lines.push('');
    let idx = 0;
    issueWithNotes.forEach((it) => {
      idx++;
      lines.push(`${idx}. [${categoryLabelForExport[it.category]}] ${it.description}`);
      lines.push(`   - 状态：**${statusLabelForExport[snapshot.checklistStatus[it.id] || 'todo']}**`);
      lines.push(`   - 备注：${snapshot.reviewNotes[it.id]}`);
      lines.push('');
    });
    foreshadowWithNotes.forEach((it) => {
      idx++;
      const statusTag = it.status === 'resolved' ? '伏笔·已回收' : '伏笔·未回收';
      lines.push(`${idx}. [${statusTag}] ${it.element}：${it.description}`);
      lines.push(`   - 备注：${snapshot.reviewNotes[it.id]}`);
      lines.push('');
    });
  }

  if (currentChecklist && currentChecklist.length > 0) {
    lines.push('## 当前待处理（最新报告）');
    lines.push('');
    const todoNow = currentChecklist.filter(
      (it) => (snapshot.checklistStatus[it.id] || 'todo') === 'todo'
    );
    todoNow.forEach((it, i) => {
      lines.push(`${i + 1}. [${categoryLabelForExport[it.category]} / ${priorityLabel[it.priority]}] ${it.description}`);
      lines.push(`   - 关联：${it.relatedRoom}`);
      lines.push(`   - 建议：${it.suggestion}`);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push(`> 由 AI 鬼屋空间蓝图助手生成 · ${createdAt}`);

  return lines.join('\n');
}

export async function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
