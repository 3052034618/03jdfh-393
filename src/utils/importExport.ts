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
