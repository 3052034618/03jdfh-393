import { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  ListTodo,
  Filter,
  Link2Off,
  Activity,
  AlertTriangle,
  FileWarning,
  Clock,
  CheckCircle2,
  PauseCircle,
  LayoutGrid,
  UserRound,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import { useBlueprintStore, checklistStatusOptions } from '@/store/blueprintStore';
import type { Priority, IssueCategory, ChecklistStatus } from '@/types';
import { cn } from '@/lib/utils';

const priorityLabel: Record<Priority, string> = {
  critical: '严重',
  high: '重要',
  medium: '中等',
  low: '轻微',
};

const categoryLabel: Record<IssueCategory, string> = {
  narrative: '叙事连贯性',
  rhythm: '恐怖节奏',
  foreshadow: '伏笔回收',
};

const categoryIcon = {
  narrative: Link2Off,
  rhythm: Activity,
  foreshadow: AlertTriangle,
};

const statusConfig: Record<
  ChecklistStatus,
  { label: string; icon: typeof ListTodo; cls: string }
> = {
  todo: {
    label: '待处理',
    icon: Clock,
    cls: 'bg-accent-crimson/10 text-accent-crimsonLight border-accent-crimson/40',
  },
  adopted: {
    label: '已采纳',
    icon: CheckCircle2,
    cls: 'bg-status-low/10 text-status-low border-status-low/40',
  },
  deferred: {
    label: '暂缓',
    icon: PauseCircle,
    cls: 'bg-emotion-unease/15 text-emotion-unease border-emotion-unease/40',
  },
};

export default function ChecklistPage() {
  const {
    getChecklist,
    getAllRooms,
    checklistStatus,
    setChecklistItemStatus,
    getChecklistItemStatus,
    actionItems,
    setActionItem,
    getActionItem,
  } = useBlueprintStore();
  const allRooms = getAllRooms();
  const checklist = useMemo(() => getChecklist(), [getChecklist]);

  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ChecklistStatus | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanStatusFilter, setKanbanStatusFilter] = useState<ChecklistStatus | 'all'>('all');

  const filteredItems = useMemo(() => {
    return checklist.filter((item) => {
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      const st = getChecklistItemStatus(item.id);
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      return true;
    });
  }, [checklist, priorityFilter, categoryFilter, statusFilter, checklistStatus, getChecklistItemStatus]);

  const stats = useMemo(() => {
    let todoCount = 0;
    let adoptedCount = 0;
    let deferredCount = 0;
    checklist.forEach((it) => {
      const st = getChecklistItemStatus(it.id);
      if (st === 'todo') todoCount++;
      else if (st === 'adopted') adoptedCount++;
      else deferredCount++;
    });
    return {
      total: checklist.length,
      todo: todoCount,
      adopted: adoptedCount,
      deferred: deferredCount,
      critical: checklist.filter((i) => i.priority === 'critical').length,
      high: checklist.filter((i) => i.priority === 'high').length,
      narrative: checklist.filter((i) => i.category === 'narrative').length,
      rhythm: checklist.filter((i) => i.category === 'rhythm').length,
      foreshadow: checklist.filter((i) => i.category === 'foreshadow').length,
    };
  }, [checklist, checklistStatus, getChecklistItemStatus]);

  const handleCopy = async (itemId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleCopyFiltered = async () => {
    const todoItems = filteredItems.filter(
      (item) => getChecklistItemStatus(item.id) === 'todo'
    );
    const sourceItems = todoItems.length > 0 ? todoItems : filteredItems;
    if (sourceItems.length === 0) return;
    const text = sourceItems
      .map((item, idx) => {
        const st = getChecklistItemStatus(item.id);
        const act = getActionItem(item.id);
        const lines = [
          `[${priorityLabel[item.priority]}] ${categoryLabel[item.category]} [${statusConfig[st].label}]`,
          `${idx + 1}. ${item.description}`,
          `   关联：${item.relatedRoom}`,
          `   建议：${item.suggestion}`,
        ];
        if (act?.assignee) lines.push(`   负责人：${act.assignee}`);
        if (act?.dueDate) lines.push(`   截止：${act.dueDate}`);
        if (act?.nextStep) lines.push(`   下一步：${act.nextStep}`);
        return lines.join('\n');
      })
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  if (allRooms.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="card-panel p-12 text-center max-w-md">
          <FileWarning className="w-14 h-14 text-text-muted mx-auto mb-4 opacity-40" />
          <h3 className="font-display text-xl text-text-primary mb-2">暂无蓝图数据</h3>
          <p className="text-sm text-text-secondary">
            请先前往「蓝图录入」模块填写楼层与房间信息。
          </p>
        </div>
      </div>
    );
  }

  const todoCountInFiltered = filteredItems.filter(
    (it) => getChecklistItemStatus(it.id) === 'todo'
  ).length;

  return (
    <div className="min-h-screen overflow-y-auto">
      <div className="p-8 max-w-6xl">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-2xl text-accent-gold tracking-wide mb-2">
              修改清单
            </h2>
            <p className="text-sm text-text-secondary">
              按优先级排序的问题列表，按状态管理进度，可复制建议供团队评审使用。
            </p>
          </div>
          <button
            onClick={handleCopyFiltered}
            disabled={filteredItems.length === 0}
            className="btn-secondary text-sm inline-flex items-center gap-2 disabled:opacity-40"
          >
            {copiedId === 'all' ? (
              <>
                <Check className="w-4 h-4 text-status-low" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {todoCountInFiltered > 0
                  ? `复制待处理项 (${todoCountInFiltered})`
                  : '复制当前筛选结果'}
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="card-panel p-4">
            <div className="text-xs text-text-muted font-mono mb-1">总计</div>
            <div className="font-display text-2xl text-text-primary">{stats.total}</div>
          </div>
          <div className="card-panel p-4 border-l-2 border-l-accent-crimsonLight">
            <div className="text-xs text-text-muted font-mono mb-1">待处理</div>
            <div className="font-display text-2xl text-accent-crimsonLight">{stats.todo}</div>
          </div>
          <div className="card-panel p-4 border-l-2 border-l-status-low">
            <div className="text-xs text-text-muted font-mono mb-1">已采纳</div>
            <div className="font-display text-2xl text-status-low">{stats.adopted}</div>
          </div>
          <div className="card-panel p-4 border-l-2 border-l-emotion-unease">
            <div className="text-xs text-text-muted font-mono mb-1">暂缓</div>
            <div className="font-display text-2xl text-emotion-unease">{stats.deferred}</div>
          </div>
          <div className="card-panel p-4">
            <div className="text-xs text-text-muted font-mono mb-1">严重</div>
            <div className="font-display text-2xl text-status-critical">{stats.critical}</div>
          </div>
          <div className="card-panel p-4">
            <div className="text-xs text-text-muted font-mono mb-1">重要</div>
            <div className="font-display text-2xl text-status-high">{stats.high}</div>
          </div>
          <div className="card-panel p-4 col-span-2 md:col-span-1">
            <div className="text-xs text-text-muted font-mono mb-1">叙事/节奏/伏笔</div>
            <div className="font-mono text-lg">
              <span className="text-accent-crimsonLight">{stats.narrative}</span>
              <span className="text-text-muted"> / </span>
              <span className="text-status-high">{stats.rhythm}</span>
              <span className="text-text-muted"> / </span>
              <span className="text-status-medium">{stats.foreshadow}</span>
            </div>
          </div>
        </div>

        <div className="card-panel p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted font-mono">筛选：</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">状态</span>
            <div className="flex gap-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-2.5 py-1 text-xs border transition-all inline-flex items-center gap-1.5',
                  statusFilter === 'all'
                    ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold'
                    : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary'
                )}
              >
                <ListTodo className="w-3 h-3" />
                全部
              </button>
              {checklistStatusOptions.map((opt) => {
                const Icon = statusConfig[opt.value].icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={cn(
                      'px-2.5 py-1 text-xs border transition-all inline-flex items-center gap-1.5',
                      statusFilter === opt.value
                        ? statusConfig[opt.value].cls
                        : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-4 w-px bg-border-subtle hidden md:block" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">优先级</span>
            <div className="flex gap-1">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    'px-2.5 py-1 text-xs border transition-all',
                    priorityFilter === p
                      ? p === 'all'
                        ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold'
                        : `priority-${p}`
                      : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary'
                  )}
                >
                  {p === 'all' ? '全部' : priorityLabel[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-border-subtle hidden md:block" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">类别</span>
            <div className="flex gap-1">
              {(['all', 'narrative', 'rhythm', 'foreshadow'] as const).map((c) => {
                const Icon = c === 'all' ? ListTodo : categoryIcon[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      'px-2.5 py-1 text-xs border transition-all inline-flex items-center gap-1.5',
                      categoryFilter === c
                        ? c === 'all'
                          ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold'
                          : c === 'narrative'
                            ? 'bg-accent-crimson/10 border-accent-crimson/40 text-accent-crimsonLight'
                            : c === 'rhythm'
                              ? 'bg-status-high/10 border-status-high/40 text-status-high'
                              : 'bg-status-medium/10 border-status-medium/40 text-status-medium'
                        : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {c === 'all' ? '全部' : categoryLabel[c]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card-panel p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 inline-flex items-center gap-1.5',
                viewMode === 'list'
                  ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <ListTodo className="w-3.5 h-3.5" /> 列表视图
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'px-3 py-1.5 inline-flex items-center gap-1.5',
                viewMode === 'kanban'
                  ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 进展看板
            </button>
          </div>
          {viewMode === 'kanban' && (
            <div className="flex items-center gap-1 text-xs flex-wrap">
              <span className="text-text-muted font-mono">状态：</span>
              <button
                onClick={() => setKanbanStatusFilter('all')}
                className={cn(
                  'px-2.5 py-1 border transition-all inline-flex items-center gap-1.5',
                  kanbanStatusFilter === 'all'
                    ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold'
                    : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary'
                )}
              >
                全部
              </button>
              {checklistStatusOptions.map((opt) => {
                const Icon = statusConfig[opt.value].icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setKanbanStatusFilter(opt.value)}
                    className={cn(
                      'px-2.5 py-1 border transition-all inline-flex items-center gap-1.5',
                      kanbanStatusFilter === opt.value
                        ? statusConfig[opt.value].cls
                        : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="card-panel p-12 text-center">
            <Check className="w-12 h-12 text-status-low mx-auto mb-3 opacity-30" />
            <p className="text-text-secondary">当前筛选条件下没有需要修改的问题。</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredItems.map((item, idx) => {
              const Icon = categoryIcon[item.category];
              const st = getChecklistItemStatus(item.id);
              const StatusIcon = statusConfig[st].icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'card-panel p-5 animate-slideUp transition-opacity',
                    st === 'adopted' && 'opacity-60'
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center border border-border-strong bg-bg-tertiary text-text-muted font-mono text-xs">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'tag gap-1',
                              item.category === 'narrative'
                                ? 'bg-accent-crimson/10 text-accent-crimsonLight border-accent-crimson/40'
                                : item.category === 'rhythm'
                                  ? 'bg-status-high/10 text-status-high border-status-high/40'
                                  : 'bg-status-medium/10 text-status-medium border-status-medium/40'
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {categoryLabel[item.category]}
                          </span>
                          <span className={cn('tag', `priority-${item.priority}`)}>
                            {priorityLabel[item.priority]}
                          </span>
                          <span
                            className={cn('tag gap-1', statusConfig[st].cls)}
                            title="当前处理状态"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[st].label}
                          </span>
                          {item.relatedRoom && (
                            <span className="tag bg-bg-tertiary text-text-secondary border-border-strong font-mono">
                              {item.relatedRoom}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex gap-1 mr-2">
                            {checklistStatusOptions.map((opt) => {
                              const SIcon = statusConfig[opt.value].icon;
                              const isActive = st === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setChecklistItemStatus(item.id, opt.value)}
                                  title={`标记为「${opt.label}」`}
                                  className={cn(
                                    'px-2 py-1 text-[10px] font-mono border transition-all inline-flex items-center gap-1',
                                    isActive
                                      ? statusConfig[opt.value].cls
                                      : 'bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-strong'
                                  )}
                                >
                                  <SIcon className="w-3 h-3" />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => {
                              const act = getActionItem(item.id);
                              const lines = [
                                `[${priorityLabel[item.priority]}] ${categoryLabel[item.category]} [${statusConfig[st].label}]`,
                                item.description,
                                `关联：${item.relatedRoom}`,
                                `建议：${item.suggestion}`,
                              ];
                              if (act?.assignee) lines.push(`负责人：${act.assignee}`);
                              if (act?.dueDate) lines.push(`截止：${act.dueDate}`);
                              if (act?.nextStep) lines.push(`下一步：${act.nextStep}`);
                              handleCopy(item.id, lines.join('\n'));
                            }}
                            className="p-1.5 text-text-muted hover:text-accent-gold transition-colors"
                            title="复制此条建议（含负责人和截止时间）"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-4 h-4 text-status-low" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p
                        className={cn(
                          'text-sm mb-3 leading-relaxed',
                          st === 'adopted'
                            ? 'text-text-secondary line-through decoration-border-strong'
                            : 'text-text-primary'
                        )}
                      >
                        {item.description}
                      </p>

                      <div className="pl-3 border-l-2 border-accent-gold/30 mb-3">
                        <p className="text-xs">
                          <span className="text-accent-gold font-mono mr-2">修改建议 →</span>
                          <span className="text-text-secondary leading-relaxed">
                            {item.suggestion}
                          </span>
                        </p>
                      </div>

                      <div className="pl-3 border-l-2 border-border-strong">
                        <p className="text-[11px] text-text-muted font-mono mb-2 flex items-center gap-1">
                          <ListTodo className="w-3 h-3" />
                          行动项（可选）
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          <div className="md:col-span-4">
                            <label className="text-[10px] text-text-muted font-mono mb-1 block flex items-center gap-1">
                              <UserRound className="w-2.5 h-2.5" /> 负责人
                            </label>
                            <input
                              type="text"
                              value={getActionItem(item.id).assignee || ''}
                              onChange={(e) => setActionItem(item.id, { assignee: e.target.value })}
                              placeholder="如：王工"
                              className="input-field w-full !py-1.5 text-xs"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="text-[10px] text-text-muted font-mono mb-1 block flex items-center gap-1">
                              <CalendarDays className="w-2.5 h-2.5" /> 截止时间
                            </label>
                            <input
                              type="text"
                              value={getActionItem(item.id).dueDate || ''}
                              onChange={(e) => setActionItem(item.id, { dueDate: e.target.value })}
                              placeholder="如：2026-06-25"
                              className="input-field w-full !py-1.5 text-xs"
                            />
                          </div>
                          <div className="md:col-span-5">
                            <label className="text-[10px] text-text-muted font-mono mb-1 block flex items-center gap-1">
                              <ListTodo className="w-2.5 h-2.5" /> 下一步动作
                            </label>
                            <input
                              type="text"
                              value={getActionItem(item.id).nextStep || ''}
                              onChange={(e) => setActionItem(item.id, { nextStep: e.target.value })}
                              placeholder="如：和场景组确认洗衣房尺寸"
                              className="input-field w-full !py-1.5 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
            {(() => {
              const byAssignee = new Map<string, typeof filteredItems>();
              filteredItems.forEach((it) => {
                const st = getChecklistItemStatus(it.id);
                if (kanbanStatusFilter !== 'all' && st !== kanbanStatusFilter) return;
                const k = (getActionItem(it.id).assignee || '').trim() || '未分配';
                if (!byAssignee.has(k)) byAssignee.set(k, []);
                byAssignee.get(k)!.push(it);
              });
              const statuses = kanbanStatusFilter === 'all'
                ? (['todo', 'adopted', 'deferred'] as const)
                : [kanbanStatusFilter] as const;
              return Array.from(byAssignee.entries()).map(([assignee, items]) => (
                <div key={assignee} className="card-panel p-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-accent-gold" />
                    {assignee}
                    <span className="font-mono text-xs text-text-muted">· {items.length} 项</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {statuses.map((st) => {
                      const list = items.filter((it) => getChecklistItemStatus(it.id) === st);
                      const SIcon = statusConfig[st].icon;
                      return (
                        <div key={st} className="bg-bg-tertiary/20 border border-border-subtle p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn('tag text-[10px] gap-1', statusConfig[st].cls)}>
                              <SIcon className="w-3 h-3" />
                              {statusConfig[st].label}
                            </span>
                            <span className="font-mono text-xs text-text-muted">{list.length}</span>
                          </div>
                          {list.length === 0 ? (
                            <p className="text-[11px] text-text-muted text-center py-4 opacity-60">暂无</p>
                          ) : (
                            <ul className="space-y-2">
                              {list.map((item) => {
                                const act = getActionItem(item.id);
                                const Icon = categoryIcon[item.category];
                                return (
                                  <li key={item.id} className={cn(
                                    'p-2.5 bg-bg-secondary border border-border-subtle text-xs',
                                    st === 'adopted' && 'opacity-60'
                                  )}>
                                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                      <span className={cn(
                                        'tag gap-1 text-[10px]',
                                        item.category === 'narrative'
                                          ? 'bg-accent-crimson/10 text-accent-crimsonLight border-accent-crimson/40'
                                          : item.category === 'rhythm'
                                            ? 'bg-status-high/10 text-status-high border-status-high/40'
                                            : 'bg-status-medium/10 text-status-medium border-status-medium/40'
                                      )}>
                                        <Icon className="w-2.5 h-2.5" />
                                        {categoryLabel[item.category]}
                                      </span>
                                      <span className={cn('tag text-[10px]', `priority-${item.priority}`)}>
                                        {priorityLabel[item.priority]}
                                      </span>
                                    </div>
                                    <p className={cn(
                                      'text-text-secondary leading-relaxed mb-1.5',
                                      st === 'adopted' && 'line-through'
                                    )}>
                                      {item.description}
                                    </p>
                                    <div className="space-y-1 text-[10px] text-text-muted font-mono">
                                      {act?.dueDate && (
                                        <div className="flex items-center gap-1">
                                          <CalendarDays className="w-2.5 h-2.5" />
                                          截止：{act.dueDate}
                                        </div>
                                      )}
                                      {act?.nextStep && (
                                        <div className="flex items-start gap-1">
                                          <ChevronRight className="w-2.5 h-2.5 mt-0.5" />
                                          <span className="break-words">下一步：{act.nextStep}</span>
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
