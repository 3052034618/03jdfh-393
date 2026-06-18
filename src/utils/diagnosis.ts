import {
  Room,
  NarrativeIssue,
  RhythmIssue,
  ForeshadowItem,
  ChecklistItem,
  EmotionState,
  EmotionPoint,
  Priority,
  DiagnosisReport,
} from '@/types';

const emotionValue: Record<EmotionState, number> = {
  relief: 0,
  unease: 2,
  doubt: 3,
  oppression: 5,
};

const emotionLabel: Record<EmotionState, string> = {
  unease: '不安',
  doubt: '怀疑',
  oppression: '压迫',
  relief: '释然',
};

const spaceTypeLabel: Record<string, string> = {
  narrow: '狭窄空间',
  normal: '常规空间',
  wide: '开阔空间',
  corridor: '走廊',
  staircase: '楼梯间',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getAllRoomsOrdered(floors: { rooms: Room[] }[]): Room[] {
  const allRooms: Room[] = [];
  floors.forEach((floor) => {
    const sorted = [...floor.rooms].sort((a, b) => a.order - b.order);
    allRooms.push(...sorted);
  });
  return allRooms;
}

export function analyzeNarrative(rooms: Room[]): NarrativeIssue[] {
  const issues: NarrativeIssue[] = [];

  for (let i = 0; i < rooms.length - 1; i++) {
    const current = rooms[i];
    const next = rooms[i + 1];
    const currentValue = emotionValue[current.emotionState];
    const nextValue = emotionValue[next.emotionState];
    const emotionJump = Math.abs(nextValue - currentValue);

    const missingEvidence: string[] = [];

    const currentObjects = new Set(current.visibleObjects.map((o) => o.trim()));
    const nextObjects = new Set(next.visibleObjects.map((o) => o.trim()));
    let hasConnectingObject = false;
    for (const obj of currentObjects) {
      if (nextObjects.has(obj) && obj.length > 0) {
        hasConnectingObject = true;
        break;
      }
    }

    if (!hasConnectingObject && current.visibleObjects.length > 0 && next.visibleObjects.length > 0) {
      missingEvidence.push('两房间之间缺乏共同物件作为叙事线索');
    }

    if (emotionJump >= 4) {
      missingEvidence.push(
        `心理状态从「${emotionLabel[current.emotionState]}」骤变为「${emotionLabel[next.emotionState]}」，跳跃幅度过大`
      );
    }

    if (current.name.includes('结局') || next.name.includes('结局')) {
      if (i < rooms.length - 2 && next.name.includes('结局')) {
        missingEvidence.push('结局空间前置，叙事尚未铺垫充分');
      }
    }

    if (next.name.includes('密室') && (current.name.includes('祠堂') || current.name.includes('入口'))) {
      missingEvidence.push('从核心叙事空间直接进入结局密室，缺少过渡与证据链');
    }

    if (missingEvidence.length > 0) {
      const priority: Priority = emotionJump >= 4 ? 'critical' : missingEvidence.length >= 2 ? 'high' : 'medium';

      issues.push({
        id: generateId(),
        fromRoom: current.name,
        toRoom: next.name,
        fromRoomId: current.id,
        toRoomId: next.id,
        description: `「${current.name}」→「${next.name}」的空间过渡存在叙事断层`,
        suggestion: `建议在两个房间之间增加 1-2 个过渡空间，或在「${next.name}」中补充承接「${current.name}」的物件与线索，让心理状态变化更加自然。`,
        missingEvidence,
        priority,
      });
    }
  }

  return issues;
}

export function analyzeRhythm(rooms: Room[]): RhythmIssue[] {
  const issues: RhythmIssue[] = [];

  let narrowStreak: Room[] = [];
  let oppressionStreak: Room[] = [];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];

    if (room.spaceType === 'narrow' || room.spaceType === 'corridor') {
      narrowStreak.push(room);
    } else {
      if (narrowStreak.length >= 3) {
        issues.push({
          id: generateId(),
          rooms: narrowStreak.map((r) => r.name),
          roomIds: narrowStreak.map((r) => r.id),
          description: `连续 ${narrowStreak.length} 个狭窄/走廊空间，易造成玩家空间疲劳与感官麻木`,
          suggestion: `建议在第 2-3 个房间后插入一个开阔或静态空间（如洗衣房改为窥视等待），形成「压迫—释放—再压迫」的节奏呼吸。`,
          rhythmPattern: '窄→窄→窄→窄',
          priority: narrowStreak.length >= 4 ? 'critical' : 'high',
        });
      }
      narrowStreak = [];
    }

    if (room.emotionState === 'oppression') {
      oppressionStreak.push(room);
    } else {
      if (oppressionStreak.length >= 3) {
        issues.push({
          id: generateId(),
          rooms: oppressionStreak.map((r) => r.name),
          roomIds: oppressionStreak.map((r) => r.id),
          description: `连续 ${oppressionStreak.length} 个房间保持高强度压迫感，玩家感官阈值会迅速上升，后续恐怖效果递减`,
          suggestion: `强烈建议在连续压迫中插入 1 个「不安」或「释然」状态的缓冲空间，使用静态恐惧（如窥视、声音、残留痕迹）替代即时追逐。`,
          rhythmPattern: '压迫→压迫→压迫',
          priority: oppressionStreak.length >= 4 ? 'critical' : 'high',
        });
      }
      oppressionStreak = [];
    }
  }

  if (narrowStreak.length >= 3) {
    issues.push({
      id: generateId(),
      rooms: narrowStreak.map((r) => r.name),
      roomIds: narrowStreak.map((r) => r.id),
      description: `连续 ${narrowStreak.length} 个狭窄/走廊空间，易造成玩家空间疲劳与感官麻木`,
      suggestion: `建议在序列中间插入一个开阔空间作为节奏呼吸点。`,
      rhythmPattern: '窄→窄→窄',
      priority: narrowStreak.length >= 4 ? 'critical' : 'high',
    });
  }

  if (oppressionStreak.length >= 3) {
    issues.push({
      id: generateId(),
      rooms: oppressionStreak.map((r) => r.name),
      roomIds: oppressionStreak.map((r) => r.id),
      description: `连续 ${oppressionStreak.length} 个房间保持高强度压迫感，玩家感官阈值会迅速上升`,
      suggestion: `插入缓冲空间，使用静态恐惧替代即时追逐。`,
      rhythmPattern: '压迫→压迫→压迫',
      priority: oppressionStreak.length >= 4 ? 'critical' : 'high',
    });
  }

  let alternationCount = 0;
  for (let i = 1; i < rooms.length; i++) {
    if (rooms[i].emotionState !== rooms[i - 1].emotionState) {
      alternationCount++;
    }
  }
  if (rooms.length > 5 && alternationCount < Math.floor(rooms.length / 3)) {
    issues.push({
      id: generateId(),
      rooms: rooms.map((r) => r.name),
      roomIds: rooms.map((r) => r.id),
      description: `整体心理状态变化过于平缓，缺乏起伏曲线，玩家容易陷入审美疲劳`,
      suggestion: `建议设计一条清晰的情绪弧线：引入不安 → 制造怀疑 → 逐步压迫 → 短暂释然 → 终极压迫 → 结局释然。`,
      rhythmPattern: '情绪平坦',
      priority: 'medium',
    });
  }

  return issues;
}

const foreshadowKeywords = ['玩偶', '娃娃', '女童', '笑声', '墙洞', '血迹', '日记', '照片', '钥匙', '门', '镜子', '面具', '头发', '脚印', '蜡烛', '铃铛', '哭声', '手机', '录音', '符号', '戒指', '鞋子'];

export function analyzeForeshadow(rooms: Room[]): ForeshadowItem[] {
  const items: ForeshadowItem[] = [];
  const foundElements: Map<string, { room: Room; description: string }[]> = new Map();

  rooms.forEach((room) => {
    const allText = [room.mainEvent, ...room.visibleObjects].join(' ');
    foreshadowKeywords.forEach((keyword) => {
      if (allText.includes(keyword)) {
        if (!foundElements.has(keyword)) {
          foundElements.set(keyword, []);
        }
        let desc = '';
        if (room.mainEvent.includes(keyword)) {
          desc = `事件：${room.mainEvent}`;
        } else {
          const obj = room.visibleObjects.find((o) => o.includes(keyword));
          desc = `物件：${obj}`;
        }
        foundElements.get(keyword)!.push({ room, description: desc });
      }
    });

    room.visibleObjects.forEach((obj) => {
      const trimmed = obj.trim();
      if (trimmed.length >= 2 && !foreshadowKeywords.includes(trimmed)) {
        if (!foundElements.has(trimmed)) {
          foundElements.set(trimmed, []);
        }
        foundElements.get(trimmed)!.push({ room, description: `物件：${trimmed}` });
      }
    });
  });

  foundElements.forEach((occurrences, element) => {
    if (occurrences.length === 0) return;

    const firstOccurrence = occurrences[0];
    const lastOccurrence = occurrences[occurrences.length - 1];
    const firstIndex = rooms.findIndex((r) => r.id === firstOccurrence.room.id);
    const lastIndex = rooms.findIndex((r) => r.id === lastOccurrence.room.id);

    let status: 'resolved' | 'unresolved' | 'partial' = 'unresolved';
    let priority: Priority = 'medium';
    let description = `在「${firstOccurrence.room.name}」首次出现：${firstOccurrence.description}`;

    if (occurrences.length === 1) {
      if (firstIndex >= rooms.length - 2) {
        status = 'resolved';
        priority = 'low';
        description += '（出现位置靠后，无需回收）';
      } else {
        status = 'unresolved';
        priority = firstIndex < Math.floor(rooms.length / 2) ? 'high' : 'medium';
        description += '，后续房间中未再出现或得到解释';
      }
    } else if (occurrences.length >= 2) {
      if (lastIndex >= rooms.length - 2 || lastOccurrence.description.includes('解释') || lastOccurrence.description.includes('揭露') || lastOccurrence.description.includes('真相')) {
        status = 'resolved';
        priority = 'low';
        description += `，在「${lastOccurrence.room.name}」得到回收：${lastOccurrence.description}`;
      } else if (lastIndex - firstIndex >= 2) {
        status = 'partial';
        priority = 'medium';
        description += `，在「${lastOccurrence.room.name}」再次出现但未给出明确解释`;
      } else {
        status = 'partial';
        priority = 'low';
        description += `，在「${lastOccurrence.room.name}」再次出现`;
      }
    }

    items.push({
      id: generateId(),
      element,
      introducedIn: firstOccurrence.room.name,
      introducedInId: firstOccurrence.room.id,
      resolvedIn: status === 'unresolved' ? null : lastOccurrence.room.name,
      resolvedInId: status === 'unresolved' ? null : lastOccurrence.room.id,
      status,
      description,
      priority,
    });
  });

  items.sort((a, b) => {
    const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return items;
}

export function getEmotionCurve(rooms: Room[]): EmotionPoint[] {
  return rooms.map((room, index) => ({
    roomName: room.name,
    roomId: room.id,
    emotion: room.emotionState,
    value: emotionValue[room.emotionState],
    index,
  }));
}

export function buildChecklist(
  narrativeIssues: NarrativeIssue[],
  rhythmIssues: RhythmIssue[],
  foreshadowItems: ForeshadowItem[]
): ChecklistItem[] {
  const list: ChecklistItem[] = [];

  narrativeIssues.forEach((issue) => {
    list.push({
      id: issue.id,
      category: 'narrative',
      priority: issue.priority,
      description: issue.description,
      suggestion: issue.suggestion,
      relatedRoom: `${issue.fromRoom} → ${issue.toRoom}`,
      relatedRoomId: issue.fromRoomId,
    });
  });

  rhythmIssues.forEach((issue) => {
    list.push({
      id: issue.id,
      category: 'rhythm',
      priority: issue.priority,
      description: issue.description,
      suggestion: issue.suggestion,
      relatedRoom: issue.rooms.join(' → '),
      relatedRoomId: issue.roomIds[0] || null,
    });
  });

  foreshadowItems
    .filter((f) => f.status !== 'resolved')
    .forEach((item) => {
      list.push({
        id: item.id,
        category: 'foreshadow',
        priority: item.priority,
        description: `伏笔「${item.element}」${item.status === 'unresolved' ? '完全未回收' : '回收不完整'}：${item.description}`,
        suggestion: `建议在后续房间（尤其是结局前 1-2 个空间）为「${item.element}」设计明确的解释、呼应或反转。`,
        relatedRoom: item.introducedIn,
        relatedRoomId: item.introducedInId,
      });
    });

  const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return list;
}

export function generateDiagnosis(
  narrativeIssues: NarrativeIssue[],
  rhythmIssues: RhythmIssue[],
  foreshadowItems: ForeshadowItem[]
): DiagnosisReport {
  const unresolvedCount = foreshadowItems.filter((f) => f.status === 'unresolved').length;
  const partialCount = foreshadowItems.filter((f) => f.status === 'partial').length;

  const criticalCount =
    narrativeIssues.filter((i) => i.priority === 'critical').length +
    rhythmIssues.filter((i) => i.priority === 'critical').length +
    foreshadowItems.filter((i) => i.priority === 'critical').length;

  const highCount =
    narrativeIssues.filter((i) => i.priority === 'high').length +
    rhythmIssues.filter((i) => i.priority === 'high').length +
    foreshadowItems.filter((i) => i.priority === 'high').length;

  let score = 100;
  score -= criticalCount * 10;
  score -= highCount * 5;
  score -= narrativeIssues.length * 2;
  score -= rhythmIssues.length * 3;
  score -= unresolvedCount * 3;
  score -= partialCount * 1;
  score = Math.max(0, Math.min(100, score));

  let summary = '';
  if (score >= 85) {
    summary = '整体叙事结构完整，空间节奏把控良好，仅有少量细节可进一步打磨。';
  } else if (score >= 70) {
    summary = '蓝图基础扎实，但在叙事过渡或伏笔回收上存在若干疏漏，建议针对性调整。';
  } else if (score >= 50) {
    summary = '空间叙事存在较明显的断层与节奏问题，需要系统性梳理情绪曲线与证据链。';
  } else {
    summary = '蓝图存在关键叙事缺失，建议在评审前重新设计空间序列与线索布局。';
  }

  return {
    narrativeIssues,
    rhythmIssues,
    foreshadowItems,
    overallScore: score,
    summary,
  };
}

export { emotionLabel, spaceTypeLabel };
