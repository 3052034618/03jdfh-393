import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  Link2Off,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Target,
  FileWarning,
  Download,
  FileText,
  FileCode,
  MessageSquarePlus,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save,
  History,
  Trash2,
  Clock,
  X,
  GitCompare,
  Plus,
  Users,
  BookOpen,
  FileCheck2,
  PlusCircle,
  MinusCircle,
  Tag,
  Edit,
  User,
  CalendarDays,
  ListTodo,
  Shuffle,
  UserRound,
  ListChecks,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useBlueprintStore, categoryLabelForSnapshot } from '@/store/blueprintStore';
import { getEmotionCurve, emotionLabel, spaceTypeLabel } from '@/utils/diagnosis';
import type { Priority, ForeshadowStatus, ReviewSnapshot, ChecklistStatus, SnapshotComparison, IssueActionItem } from '@/types';
import { cn } from '@/lib/utils';
import EmotionCurveChart from '@/components/EmotionCurveChart';
import {
  exportReportToMarkdown,
  exportReportToText,
  downloadFile,
  exportMeetingSummaryToMarkdown,
} from '@/utils/importExport';

const priorityLabel: Record<Priority, string> = {
  critical: '严重',
  high: '重要',
  medium: '中等',
  low: '轻微',
};

const foreshadowStatusLabel: Record<ForeshadowStatus, string> = {
  resolved: '已回收',
  unresolved: '未回收',
  partial: '部分回收',
};

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn('tag', `priority-${priority}`)}>{priorityLabel[priority]}</span>;
}

function StatusBadge({ status }: { status: ForeshadowStatus }) {
  const config = {
    resolved: { cls: 'priority-low', icon: CheckCircle2 },
    partial: { cls: 'priority-medium', icon: CircleHelp },
    unresolved: { cls: 'priority-high', icon: CircleAlert },
  };
  const { cls, icon: Icon } = config[status];
  return (
    <span className={cn('tag gap-1', cls)}>
      <Icon className="w-3 h-3" />
      {foreshadowStatusLabel[status]}
    </span>
  );
}

function ReviewNoteField({
  issueId,
  note,
  onNoteChange,
}: {
  issueId: string;
  note: string;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [expanded, setExpanded] = useState(note.length > 0);

  return (
    <div className="mt-3 pt-3 border-t border-border-subtle">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-accent-gold hover:text-accent-goldLight transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {note.length > 0 ? (
          <>
            <MessageSquare className="w-3.5 h-3.5" />
            评审备注（已填写）
          </>
        ) : (
          <>
            <MessageSquarePlus className="w-3.5 h-3.5" />
            添加评审备注
          </>
        )}
      </button>
      {expanded && (
        <textarea
          value={note}
          onChange={(e) => onNoteChange(issueId, e.target.value)}
          placeholder="导演组处理意见：例如「已安排在结局前插入洗衣房过渡空间」「下期迭代补完玩偶线索」"
          rows={2}
          className="mt-2 w-full input-field resize-none text-xs leading-relaxed"
          style={{ borderColor: note.length > 0 ? 'rgba(201, 169, 98, 0.35)' : undefined }}
        />
      )}
    </div>
  );
}

function ComparisonPanel({
  comparison,
  statusColorCls,
  statusLabelShort,
}: {
  comparison: SnapshotComparison | null;
  statusColorCls: Record<ChecklistStatus, string>;
  statusLabelShort: Record<ChecklistStatus, string>;
}) {
  const actionFieldLabel: Record<'assignee' | 'dueDate' | 'nextStep', string> = {
    assignee: '负责人',
    dueDate: '截止时间',
    nextStep: '下一步动作',
  };
  if (!comparison) {
    return <p className="text-center py-8 text-sm text-text-muted">无法生成对比数据。</p>;
  }

  const totalChanges =
    comparison.newIssues.length +
    comparison.resolvedIssues.length +
    comparison.statusChanges.length +
    comparison.noteChanges.length +
    comparison.actionChanges.length;

  if (totalChanges === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-10 h-10 text-status-low mx-auto mb-3 opacity-50" />
        <p className="text-sm text-status-low">与上次评审相比无任何变化。</p>
        <p className="text-xs text-text-muted mt-1">蓝图结构、处理状态、评审备注均保持一致。</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-status-low/5 border border-status-low/20">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <GitCompare className="w-3 h-3" /> 指数变化
          </p>
          <p className={cn(
            'text-2xl font-display font-bold',
            comparison.scoreChange >= 0 ? 'text-status-low' : 'text-accent-crimsonLight'
          )}>
            {comparison.scoreChange >= 0 ? '+' : ''}
            {comparison.scoreChange}
          </p>
        </div>
        <div className="p-3 bg-accent-crimson/5 border border-accent-crimson/30">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <PlusCircle className="w-3 h-3" /> 新增问题
          </p>
          <p className="text-2xl font-mono text-accent-crimsonLight font-bold">{comparison.newIssues.length}</p>
        </div>
        <div className="p-3 bg-status-low/5 border border-status-low/20">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <MinusCircle className="w-3 h-3" /> 已解决
          </p>
          <p className="text-2xl font-mono text-status-low font-bold">{comparison.resolvedIssues.length}</p>
        </div>
        <div className="p-3 bg-accent-gold/5 border border-accent-gold/30">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> 状态/备注
          </p>
          <p className="text-2xl font-mono text-accent-gold font-bold">
            {comparison.statusChanges.length + comparison.noteChanges.length}
          </p>
        </div>
        <div className="p-3 bg-bg-tertiary/50 border border-border-strong">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
            <ListTodo className="w-3 h-3" /> 行动项变更
          </p>
          <p className="text-2xl font-mono text-text-primary font-bold">
            {comparison.actionChanges.length}
          </p>
        </div>
      </div>

      {comparison.newIssues.length > 0 && (
        <div className="card-panel p-4 border-l-4 border-accent-crimson/60">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-accent-crimsonLight" />
            新增问题 · {comparison.newIssues.length}
          </h4>
          <ul className="space-y-2">
            {comparison.newIssues.map((it, i) => (
              <li key={it.id} className="p-3 bg-accent-crimson/5 border border-accent-crimson/20">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-text-muted w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30 mr-2">
                      {categoryLabelForSnapshot[it.category]}
                    </span>
                    <span className="text-sm text-text-secondary">{it.description}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.resolvedIssues.length > 0 && (
        <div className="card-panel p-4 border-l-4 border-status-low/60">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <MinusCircle className="w-4 h-4 text-status-low" />
            已解决（不再出现在当前报告） · {comparison.resolvedIssues.length}
          </h4>
          <ul className="space-y-2">
            {comparison.resolvedIssues.map((it, i) => (
              <li key={it.id} className="p-3 bg-status-low/5 border border-status-low/20 opacity-80">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-text-muted w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30 mr-2">
                      {categoryLabelForSnapshot[it.category]}
                    </span>
                    <span className="text-sm text-text-secondary line-through">{it.description}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.statusChanges.length > 0 && (
        <div className="card-panel p-4 border-l-4 border-accent-gold/60">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-accent-gold" />
            处理状态变更 · {comparison.statusChanges.length}
          </h4>
          <ul className="space-y-2">
            {comparison.statusChanges.map((it, i) => (
              <li key={it.id} className="p-3 bg-bg-tertiary/30 border border-border-subtle">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-text-muted w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary mb-1.5">{it.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={cn('tag text-[10px]', statusColorCls[it.from])}>
                        {statusLabelShort[it.from]}
                      </span>
                      <ArrowRight className="w-3 h-3 text-accent-gold shrink-0" />
                      <span className={cn('tag text-[10px]', statusColorCls[it.to])}>
                        {statusLabelShort[it.to]}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.noteChanges.length > 0 && (
        <div className="card-panel p-4 border-l-4 border-accent-gold/60">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Edit className="w-4 h-4 text-accent-gold" />
            评审备注更新 · {comparison.noteChanges.length}
          </h4>
          <ul className="space-y-3">
            {comparison.noteChanges.map((it, i) => (
              <li key={it.id} className="p-3 bg-bg-tertiary/30 border border-border-subtle">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-text-muted w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary mb-2">{it.description}</p>
                    {it.oldNote && (
                      <div className="mb-1.5">
                        <p className="text-[10px] text-text-muted font-mono mb-0.5">上次备注：</p>
                        <p className="text-xs text-text-secondary bg-bg-tertiary/70 px-2 py-1 border-l-2 border-border-strong">
                          {it.oldNote}
                        </p>
                      </div>
                    )}
                    {it.newNote ? (
                      <div>
                        <p className="text-[10px] text-accent-gold font-mono mb-0.5">本次备注：</p>
                        <p className="text-xs text-text-secondary bg-accent-gold/5 px-2 py-1 border-l-2 border-accent-gold/50">
                          {it.newNote}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-status-low">✓ 备注已清空</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.actionChanges.length > 0 && (
        <div className="card-panel p-4 border-l-4 border-border-strong">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-text-primary" />
            行动项变更 · {comparison.actionChanges.length}
          </h4>
          <ul className="space-y-2">
            {comparison.actionChanges.map((it, i) => (
              <li key={`${it.id}-${it.field}-${i}`} className="p-3 bg-bg-tertiary/30 border border-border-subtle">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-text-muted w-6 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary mb-1.5">{it.description}</p>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30">
                        {actionFieldLabel[it.field]}
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 bg-bg-tertiary text-text-secondary',
                        !it.oldValue && 'italic opacity-60'
                      )}>
                        {it.oldValue || '（未填写）'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-accent-gold shrink-0" />
                      <span className={cn(
                        'px-2 py-0.5 bg-accent-gold/10 text-accent-gold',
                        !it.newValue && 'italic'
                      )}>
                        {it.newValue || '（已清空）'}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DiagnosisPage() {
  const {
    getAllRooms,
    getDiagnosis,
    getChecklist,
    reviewNotes,
    setReviewNote,
    checklistStatus,
    actionItems,
    setActionItem,
    getActionItem,
    reviewSnapshots,
    saveReviewSnapshot,
    deleteReviewSnapshot,
    compareSnapshot,
    compareTwoSnapshots,
  } = useBlueprintStore();
  const allRooms = getAllRooms();
  const diagnosis = useMemo(() => getDiagnosis(), [getDiagnosis]);
  const checklist = useMemo(() => getChecklist(), [getChecklist]);
  const emotionPoints = useMemo(() => getEmotionCurve(allRooms), [allRooms]);

  const [showSnapshots, setShowSnapshots] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<ReviewSnapshot | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveAttendees, setSaveAttendees] = useState('');
  const [saveConclusion, setSaveConclusion] = useState('');
  const [snapshotDetailTab, setSnapshotDetailTab] = useState<'overview' | 'notes' | 'checklist' | 'compare' | 'actions'>('overview');
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'vs-current' | 'vs-snapshot'>('vs-current');
  const [compareWithId, setCompareWithId] = useState<string>('');
  const [saveActionsTab, setSaveActionsTab] = useState<'todo' | 'all'>('todo');

  const statusLabelShort: Record<ChecklistStatus, string> = {
    todo: '待处理',
    adopted: '已采纳',
    deferred: '暂缓',
  };
  const statusColorCls: Record<ChecklistStatus, string> = {
    todo: 'tag bg-accent-crimson/10 text-accent-crimsonLight border-accent-crimson/30',
    adopted: 'tag bg-status-low/10 text-status-low border-status-low/30',
    deferred: 'tag bg-status-medium/10 text-status-medium border-status-medium/30',
  };

  const scoreColor =
    diagnosis.overallScore >= 85
      ? '#5a8a6b'
      : diagnosis.overallScore >= 70
        ? '#c9a962'
        : diagnosis.overallScore >= 50
          ? '#d97a3a'
          : '#c93d4f';

  const handleSaveSnapshot = () => {
    setSaveTitle(`第 ${reviewSnapshots.length + 1} 次评审 · ${new Date().toLocaleDateString('zh-CN')}`);
    setSaveAttendees('');
    setSaveConclusion('');
    setShowSaveDialog(true);
  };

  const confirmSaveSnapshot = () => {
    const snap = saveReviewSnapshot({
      meetingTitle: saveTitle,
      attendees: saveAttendees,
      meetingConclusion: saveConclusion,
    });
    setLastSavedId(snap.id);
    setShowSaveDialog(false);
    setShowSnapshots(true);
    setTimeout(() => setLastSavedId(null), 3000);
  };

  const handleExportMarkdown = () => {
    const md = exportReportToMarkdown(diagnosis, checklist, reviewNotes, checklistStatus);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(md, `haunted-report-${date}.md`, 'text/markdown');
  };

  const handleExportText = () => {
    const txt = exportReportToText(diagnosis, checklist, reviewNotes, checklistStatus);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(txt, `haunted-report-${date}.txt`, 'text/plain');
  };

  const handleExportMeetingSummary = (snap: ReviewSnapshot) => {
    const comparison = compareSnapshot(snap.id);
    const md = exportMeetingSummaryToMarkdown(snap, comparison, checklist);
    const stamp = new Date(snap.createdAt).toISOString().slice(0, 10);
    const safeTitle = (snap.meetingTitle || 'meeting-notes').replace(/[\\/:*?"<>|]/g, '-');
    downloadFile(md, `会议纪要-${stamp}-${safeTitle}.md`, 'text/markdown');
  };

  if (allRooms.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="card-panel p-12 text-center max-w-md">
          <FileWarning className="w-14 h-14 text-text-muted mx-auto mb-4 opacity-40" />
          <h3 className="font-display text-xl text-text-primary mb-2">暂无蓝图数据</h3>
          <p className="text-sm text-text-secondary">
            请先前往「蓝图录入」模块填写楼层与房间信息，系统将自动生成空间叙事诊断报告。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto">
      <div className="p-8 max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-2xl text-accent-gold tracking-wide mb-2">
              诊断报告
            </h2>
            <p className="text-sm text-text-secondary">
              基于录入的空间蓝图，从叙事连贯性、恐怖节奏、伏笔回收三个维度进行专业评审。
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSaveSnapshot}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              保存版本
            </button>
            <button
              onClick={() => setShowSnapshots(!showSnapshots)}
              className={cn(
                'btn-secondary text-xs inline-flex items-center gap-1.5',
                showSnapshots && 'border-accent-gold/50 text-accent-gold'
              )}
            >
              <History className="w-3.5 h-3.5" />
              历史版本
              {reviewSnapshots.length > 0 && (
                <span className="ml-0.5 bg-accent-gold/20 text-accent-gold px-1.5 py-0 text-[10px] font-bold">
                  {reviewSnapshots.length}
                </span>
              )}
            </button>
            <button
              onClick={handleExportMarkdown}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              导出 Markdown
            </button>
            <button
              onClick={handleExportText}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              导出文本
            </button>
          </div>
        </div>

        <div className="card-panel p-6 mb-8 flex items-center gap-8 animate-fadeIn">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#23232b" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={`${diagnosis.overallScore * 2.64} 264`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-bold" style={{ color: scoreColor }}>
                {diagnosis.overallScore}
              </span>
              <span className="text-[10px] text-text-muted font-mono tracking-widest">
                叙事指数
              </span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-display text-lg text-text-primary mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-gold" />
              评审总览
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              {diagnosis.summary}
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <Link2Off className="w-3.5 h-3.5 text-accent-crimsonLight" />
                <span className="text-text-muted">叙事断层：</span>
                <span className="text-text-primary">{diagnosis.narrativeIssues.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-status-high" />
                <span className="text-text-muted">节奏问题：</span>
                <span className="text-text-primary">{diagnosis.rhythmIssues.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-status-medium" />
                <span className="text-text-muted">伏笔待回收：</span>
                <span className="text-text-primary">
                  {diagnosis.foreshadowItems.filter((f) => f.status !== 'resolved').length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-text-muted">评审备注：</span>
                <span className="text-text-primary">
                  {Object.values(reviewNotes).filter((n) => n.trim().length > 0).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showSnapshots && (
          <div className="card-panel p-6 mb-8 animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title flex items-center gap-2">
                <History className="w-5 h-5" />
                评审会版本记录
              </h3>
              <span className="text-xs text-text-muted font-mono">
                最多保留 50 条
              </span>
            </div>
            {reviewSnapshots.length === 0 ? (
              <div className="py-6 text-center text-text-muted text-sm">
                尚未保存过评审版本。点击上方「保存版本」记录当前报告快照。
              </div>
            ) : (
              <div className="space-y-3">
                {reviewSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className={cn(
                      'p-4 bg-bg-tertiary/50 border flex items-start gap-4 hover:border-accent-gold/30 transition-colors',
                      lastSavedId === snap.id
                        ? 'border-accent-gold/60 bg-accent-gold/5 shadow-[0_0_0_1px_rgba(201,169,98,0.4)]'
                        : 'border-border-subtle'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span className="text-sm text-text-primary font-mono">
                          {new Date(snap.createdAt).toLocaleString('zh-CN')}
                        </span>
                        {snap.meetingTitle && (
                          <span className="text-sm font-medium text-accent-gold flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {snap.meetingTitle}
                          </span>
                        )}
                        {lastSavedId === snap.id && (
                          <span className="text-[10px] bg-accent-gold/20 text-accent-gold px-1.5 py-0.5 font-mono">
                            刚保存
                          </span>
                        )}
                      </div>
                      {snap.attendees && (
                        <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {snap.attendees}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-text-muted font-mono mt-1">
                        <span>指数 {snap.overallScore}</span>
                        <span>叙事 {snap.narrativeCount}</span>
                        <span>节奏 {snap.rhythmCount}</span>
                        <span>伏笔待回收 {snap.foreshadowUnresolvedCount}</span>
                        <span className="text-accent-gold">备注 {snap.noteCount}</span>
                        <span className="text-accent-crimsonLight">待处理 {snap.todoCount}</span>
                        <span className="text-status-low">已采纳 {snap.adoptedCount}</span>
                        <span className="text-status-medium">暂缓 {snap.deferredCount}</span>
                      </div>
                      {snap.meetingConclusion && (
                        <p className="text-xs text-text-secondary mt-2 bg-bg-tertiary/60 px-2 py-1 border-l-2 border-accent-gold/40">
                          {snap.meetingConclusion.length > 120
                            ? snap.meetingConclusion.slice(0, 120) + '…'
                            : snap.meetingConclusion}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => {
                          setViewingSnapshot(snap);
                          setSnapshotDetailTab('overview');
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleExportMeetingSummary(snap)}
                        className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        title="导出会议纪要 Markdown"
                      >
                        <FileCode className="w-3 h-3" />
                        纪要
                      </button>
                      <button
                        onClick={() => {
                          setViewingSnapshot(snap);
                          setSnapshotDetailTab('compare');
                        }}
                        className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        title="与当前报告对比"
                      >
                        <GitCompare className="w-3 h-3" />
                        对比
                      </button>
                      <button
                        onClick={() => deleteReviewSnapshot(snap.id)}
                        className="p-1.5 text-text-muted hover:text-accent-crimsonLight transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showSaveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-bg-secondary border border-border-strong w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-slideUp">
              <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                <h3 className="font-display text-lg text-accent-gold flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存评审会版本
                </h3>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-muted font-mono mb-1.5 block flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      会议标题
                    </label>
                    <input
                      type="text"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="如：第3次叙事评审会 · 洗衣房方案定稿"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted font-mono mb-1.5 block flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      参会人
                    </label>
                    <input
                      type="text"
                      value={saveAttendees}
                      onChange={(e) => setSaveAttendees(e.target.value)}
                      placeholder="如：编剧组老张、场景王工、导演组小李"
                      className="input-field w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted font-mono mb-1.5 block flex items-center gap-1">
                    <FileCheck2 className="w-3 h-3" />
                    结论摘要
                  </label>
                  <textarea
                    value={saveConclusion}
                    onChange={(e) => setSaveConclusion(e.target.value)}
                    placeholder="本次会议结论与决策要点…"
                    rows={3}
                    className="input-field w-full resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h4 className="text-sm text-text-primary font-medium flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-accent-gold" />
                      行动项跟进（可选）
                    </h4>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() => setSaveActionsTab('todo')}
                        className={cn(
                          'px-3 py-1',
                          saveActionsTab === 'todo'
                            ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                            : 'text-text-muted hover:text-text-secondary'
                        )}
                      >
                        待处理（{checklist.filter((it) => (checklistStatus[it.id] || 'todo') === 'todo').length}）
                      </button>
                      <button
                        onClick={() => setSaveActionsTab('all')}
                        className={cn(
                          'px-3 py-1',
                          saveActionsTab === 'all'
                            ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                            : 'text-text-muted hover:text-text-secondary'
                        )}
                      >
                        全部（{checklist.length}）
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[36vh] overflow-y-auto pr-1">
                    {checklist
                      .filter((it) => saveActionsTab === 'all' || (checklistStatus[it.id] || 'todo') === 'todo')
                      .map((it, i) => {
                        const act = getActionItem(it.id);
                        return (
                          <div
                            key={it.id}
                            className="p-3 bg-bg-tertiary/30 border border-border-subtle"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs font-mono text-text-muted w-5 shrink-0 mt-0.5">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30">
                                    {categoryLabelForSnapshot[it.category]}
                                  </span>
                                  <span className={cn('tag text-[10px]', statusColorCls[checklistStatus[it.id] || 'todo'])}>
                                    {statusLabelShort[checklistStatus[it.id] || 'todo']}
                                  </span>
                                </div>
                                <p className="text-xs text-text-secondary leading-relaxed">{it.description}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pl-7">
                              <div className="md:col-span-4">
                                <label className="text-[10px] text-text-muted font-mono mb-1 block flex items-center gap-1">
                                  <UserRound className="w-2.5 h-2.5" /> 负责人
                                </label>
                                <input
                                  type="text"
                                  value={act.assignee || ''}
                                  onChange={(e) => setActionItem(it.id, { assignee: e.target.value })}
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
                                  value={act.dueDate || ''}
                                  onChange={(e) => setActionItem(it.id, { dueDate: e.target.value })}
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
                                  value={act.nextStep || ''}
                                  onChange={(e) => setActionItem(it.id, { nextStep: e.target.value })}
                                  placeholder="如：和场景组确认洗衣房尺寸"
                                  className="input-field w-full !py-1.5 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {checklist.filter((it) => saveActionsTab === 'all' || (checklistStatus[it.id] || 'todo') === 'todo').length === 0 && (
                      <p className="text-center py-6 text-xs text-text-muted">当前筛选下无问题。</p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-text-muted font-mono p-3 bg-bg-tertiary/40 border border-border-subtle flex items-center justify-between flex-wrap gap-2">
                  <span>
                    将记录：叙事指数 {diagnosis.overallScore} · 问题 {checklist.length} 项 · 备注 {Object.values(reviewNotes).filter(n => n.trim()).length} 条
                  </span>
                  <span>
                    行动项已填 {Object.values(actionItems).filter(a => a.assignee || a.dueDate || a.nextStep).length} 条
                  </span>
                </div>
              </div>
              <div className="p-5 border-t border-border-subtle flex gap-3 justify-end">
                <button onClick={() => setShowSaveDialog(false)} className="btn-secondary">
                  取消
                </button>
                <button onClick={confirmSaveSnapshot} className="btn-primary inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  确认保存
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-bg-secondary border border-border-strong w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-border-subtle flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg text-accent-gold flex items-center gap-2 flex-wrap">
                    <Clock className="w-4 h-4" />
                    版本详情
                    {viewingSnapshot.meetingTitle && (
                      <span className="text-text-primary text-base normal-case">· {viewingSnapshot.meetingTitle}</span>
                    )}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 font-mono">
                    {new Date(viewingSnapshot.createdAt).toLocaleString('zh-CN')}
                    {viewingSnapshot.attendees && ` · 参会：${viewingSnapshot.attendees}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExportMeetingSummary(viewingSnapshot)}
                    className="btn-secondary text-xs inline-flex items-center gap-1"
                  >
                    <FileCode className="w-3 h-3" />
                    导出纪要
                  </button>
                  <button
                    onClick={() => setViewingSnapshot(null)}
                    className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-5 pt-4 flex gap-1 border-b border-border-subtle flex-wrap">
                {(['overview', 'actions', 'notes', 'checklist', 'compare'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSnapshotDetailTab(tab)}
                    className={cn(
                      'px-4 py-2 text-xs font-mono border-b-2 -mb-px transition-colors',
                      snapshotDetailTab === tab
                        ? 'border-accent-gold text-accent-gold'
                        : 'border-transparent text-text-muted hover:text-text-secondary'
                    )}
                  >
                    {tab === 'overview' && '📊 总览'}
                    {tab === 'actions' && `🎯 行动项 (${Object.values(viewingSnapshot.actionItems || {}).filter(a => a.assignee || a.dueDate || a.nextStep).length})`}
                    {tab === 'notes' && `📝 评审备注 (${viewingSnapshot.noteCount})`}
                    {tab === 'checklist' && `✅ 修改清单 (${viewingSnapshot.totalIssueCount})`}
                    {tab === 'compare' && (compareMode === 'vs-current' ? '⚖️ 对比当前' : '⚖️ 版本对比')}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {snapshotDetailTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="card-panel p-4">
                        <p className="text-xs text-text-muted mb-1">叙事指数</p>
                        <p className={cn(
                          'text-3xl font-display font-bold',
                          viewingSnapshot.overallScore >= 70 ? 'text-status-low' : 'text-accent-crimsonLight'
                        )}>
                          {viewingSnapshot.overallScore}
                        </p>
                      </div>
                      <div className="card-panel p-4">
                        <p className="text-xs text-text-muted mb-1">总问题数</p>
                        <p className="text-3xl font-display font-bold text-text-primary">
                          {viewingSnapshot.totalIssueCount}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="card-panel p-3 text-center">
                        <p className="text-xs text-text-muted mb-1">叙事断层</p>
                        <p className="text-lg font-mono text-accent-crimsonLight">{viewingSnapshot.narrativeCount}</p>
                      </div>
                      <div className="card-panel p-3 text-center">
                        <p className="text-xs text-text-muted mb-1">节奏问题</p>
                        <p className="text-lg font-mono text-status-high">{viewingSnapshot.rhythmCount}</p>
                      </div>
                      <div className="card-panel p-3 text-center">
                        <p className="text-xs text-text-muted mb-1">伏笔待回收</p>
                        <p className="text-lg font-mono text-status-medium">{viewingSnapshot.foreshadowUnresolvedCount}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 border-l-2 border-accent-crimson bg-accent-crimson/5">
                        <p className="text-xs text-text-muted mb-0.5">待处理</p>
                        <p className="text-xl font-mono text-accent-crimsonLight">{viewingSnapshot.todoCount}</p>
                      </div>
                      <div className="p-4 border-l-2 border-status-low bg-status-low/5">
                        <p className="text-xs text-text-muted mb-0.5">已采纳</p>
                        <p className="text-xl font-mono text-status-low">{viewingSnapshot.adoptedCount}</p>
                      </div>
                      <div className="p-4 border-l-2 border-status-medium bg-status-medium/5">
                        <p className="text-xs text-text-muted mb-0.5">暂缓</p>
                        <p className="text-xl font-mono text-status-medium">{viewingSnapshot.deferredCount}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-bg-tertiary/30 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-0.5 flex items-center gap-1"><UserRound className="w-3 h-3" /> 已分配</p>
                        <p className="text-xl font-mono text-text-primary">
                          {Object.values(viewingSnapshot.actionItems || {}).filter(a => a.assignee).length}
                        </p>
                      </div>
                      <div className="p-4 bg-bg-tertiary/30 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-0.5 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> 有截止时间</p>
                        <p className="text-xl font-mono text-text-primary">
                          {Object.values(viewingSnapshot.actionItems || {}).filter(a => a.dueDate).length}
                        </p>
                      </div>
                      <div className="p-4 bg-bg-tertiary/30 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-0.5 flex items-center gap-1"><ListTodo className="w-3 h-3" /> 已有下一步</p>
                        <p className="text-xl font-mono text-text-primary">
                          {Object.values(viewingSnapshot.actionItems || {}).filter(a => a.nextStep).length}
                        </p>
                      </div>
                    </div>
                    {viewingSnapshot.meetingConclusion && (
                      <div className="card-panel p-4 border-l-4 border-accent-gold/60">
                        <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
                          <FileCheck2 className="w-3 h-3" /> 会议结论
                        </p>
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {viewingSnapshot.meetingConclusion}
                        </p>
                      </div>
                    )}
                    <div className="card-panel p-4">
                      <p className="text-xs text-text-muted mb-2">AI 评审小结（当次）</p>
                      <p className="text-sm text-text-secondary leading-relaxed">{viewingSnapshot.summary}</p>
                    </div>
                  </>
                )}

                {snapshotDetailTab === 'actions' && (
                  <div className="space-y-3">
                    {(() => {
                      const list = viewingSnapshot.issueRegistry
                        .map((it) => ({ item: it, action: viewingSnapshot.actionItems?.[it.id] }))
                        .filter(({ action }) => action && (action.assignee || action.dueDate || action.nextStep));
                      if (list.length === 0) {
                        return <p className="text-center py-8 text-sm text-text-muted">本次评审未登记行动项。</p>;
                      }
                      const byAssignee = new Map<string, typeof list>();
                      list.forEach((row) => {
                        const k = row.action?.assignee?.trim() || '未分配';
                        if (!byAssignee.has(k)) byAssignee.set(k, []);
                        byAssignee.get(k)!.push(row);
                      });
                      return Array.from(byAssignee.entries()).map(([assignee, rows]) => (
                        <div key={assignee} className="card-panel p-4">
                          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                            <UserRound className="w-4 h-4 text-accent-gold" />
                            {assignee}
                            <span className="font-mono text-xs text-text-muted">· {rows.length} 项</span>
                          </h4>
                          <ul className="space-y-2">
                            {rows.map(({ item, action }, i) => (
                              <li key={item.id} className="p-3 bg-bg-tertiary/30 border border-border-subtle">
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="text-xs font-mono text-text-muted w-5 shrink-0 mt-0.5">{i + 1}.</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                      <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30">
                                        {categoryLabelForSnapshot[item.category]}
                                      </span>
                                      <span className={cn('tag text-[10px]', statusColorCls[viewingSnapshot.checklistStatus[item.id] || 'todo'])}>
                                        {statusLabelShort[viewingSnapshot.checklistStatus[item.id] || 'todo']}
                                      </span>
                                    </div>
                                    <p className="text-xs text-text-secondary leading-relaxed mb-2">{item.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      {action?.dueDate && (
                                        <div className="flex items-center gap-1.5 text-text-secondary">
                                          <CalendarDays className="w-3 h-3 text-accent-gold shrink-0" />
                                          <span>截止：{action.dueDate}</span>
                                        </div>
                                      )}
                                      {action?.nextStep && (
                                        <div className="flex items-start gap-1.5 text-text-secondary md:col-span-2">
                                          <ListTodo className="w-3 h-3 text-accent-gold shrink-0 mt-0.5" />
                                          <span>下一步：{action.nextStep}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {snapshotDetailTab === 'notes' && (
                  <div className="space-y-3">
                    {(() => {
                      const issueNotes = viewingSnapshot.issueRegistry
                        .filter((it) => viewingSnapshot.reviewNotes[it.id]?.trim().length > 0)
                        .map((it) => ({ type: 'issue' as const, id: it.id, description: it.description, category: it.category, status: viewingSnapshot.checklistStatus[it.id] || 'todo' as ChecklistStatus }));
                      const foreshadowNotes = (viewingSnapshot.foreshadowRegistry || [])
                        .filter((it) => viewingSnapshot.reviewNotes[it.id]?.trim().length > 0)
                        .map((it) => ({ type: 'foreshadow' as const, id: it.id, description: `【伏笔${it.status === 'resolved' ? '·已回收' : '·未回收'}】${it.element}：${it.description}`, status: 'todo' as ChecklistStatus }));
                      const all = [...issueNotes, ...foreshadowNotes];
                      if (all.length === 0) {
                        return <p className="text-center py-8 text-sm text-text-muted">本次评审未填写任何备注。</p>;
                      }
                      return all.map((it, i) => (
                        <div key={it.id} className="card-panel p-4">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs text-accent-gold font-mono">#{i + 1}</span>
                            {it.type === 'foreshadow' ? (
                              <span className="tag text-[10px] bg-accent-crimson/10 text-accent-crimsonLight border-accent-crimson/30">伏笔相关</span>
                            ) : (
                              <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30">
                                {categoryLabelForSnapshot[it.category]}
                              </span>
                            )}
                            {it.type === 'issue' && (
                              <span className={cn('tag text-[10px]', statusColorCls[it.status])}>
                                {statusLabelShort[it.status]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-primary mb-2 leading-relaxed">{it.description}</p>
                          <div className="pl-3 border-l-2 border-accent-gold/40 bg-accent-gold/5 py-2 pr-3">
                            <p className="text-[10px] text-accent-gold font-mono mb-1 flex items-center gap-1">
                              <Edit className="w-2.5 h-2.5" /> 评审备注
                            </p>
                            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                              {viewingSnapshot.reviewNotes[it.id]}
                            </p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {snapshotDetailTab === 'checklist' && (
                  <div className="space-y-4">
                    {(['todo', 'adopted', 'deferred'] as const).map((st) => {
                      const items = viewingSnapshot.issueRegistry.filter(
                        (it) => (viewingSnapshot.checklistStatus[it.id] || 'todo') === st
                      );
                      return (
                        <div key={st} className="card-panel p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                              <span className={cn('tag text-[10px]', statusColorCls[st])}>
                                {statusLabelShort[st]}
                              </span>
                              <span className="font-mono text-xs text-text-muted">共 {items.length} 项</span>
                            </h4>
                          </div>
                          {items.length === 0 ? (
                            <p className="text-center py-4 text-xs text-text-muted">无。</p>
                          ) : (
                            <ul className="space-y-2">
                              {items.map((it, i) => {
                                const act = viewingSnapshot.actionItems?.[it.id];
                                const hasAction = act && (act.assignee || act.dueDate || act.nextStep);
                                return (
                                  <li
                                    key={it.id}
                                    className={cn(
                                      'p-3 bg-bg-tertiary/30 border border-border-subtle text-sm flex items-start gap-3',
                                      st === 'adopted' && 'opacity-60'
                                    )}
                                  >
                                    <span className="text-xs font-mono text-text-muted w-6 shrink-0">{i + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="tag text-[10px] bg-accent-gold/10 text-accent-gold border-accent-gold/30">
                                          {categoryLabelForSnapshot[it.category]}
                                        </span>
                                      </div>
                                      <p className={cn(
                                        'text-text-secondary text-xs leading-relaxed',
                                        st === 'adopted' && 'line-through'
                                      )}>
                                        {it.description}
                                      </p>
                                      {viewingSnapshot.reviewNotes[it.id]?.trim() && (
                                        <p className="text-[10px] text-accent-gold mt-1 pl-2 border-l border-accent-gold/40">
                                          备注：{viewingSnapshot.reviewNotes[it.id]}
                                        </p>
                                      )}
                                      {hasAction && (
                                        <div className="mt-2 p-2 bg-bg-tertiary/50 border border-border-subtle text-[11px] space-y-1">
                                          {act?.assignee && (
                                            <div className="flex items-center gap-1.5 text-text-secondary">
                                              <UserRound className="w-3 h-3 text-accent-gold shrink-0" />
                                              <span>负责人：{act.assignee}</span>
                                            </div>
                                          )}
                                          {act?.dueDate && (
                                            <div className="flex items-center gap-1.5 text-text-secondary">
                                              <CalendarDays className="w-3 h-3 text-accent-gold shrink-0" />
                                              <span>截止：{act.dueDate}</span>
                                            </div>
                                          )}
                                          {act?.nextStep && (
                                            <div className="flex items-start gap-1.5 text-text-secondary">
                                              <ListTodo className="w-3 h-3 text-accent-gold shrink-0 mt-0.5" />
                                              <span>下一步：{act.nextStep}</span>
                                            </div>
                                          )}
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
                )}

                {snapshotDetailTab === 'compare' && (
                  <div className="space-y-4">
                    <div className="card-panel p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1 text-xs flex-wrap">
                          <button
                            onClick={() => setCompareMode('vs-current')}
                            className={cn(
                              'px-3 py-1.5',
                              compareMode === 'vs-current'
                                ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                                : 'text-text-muted hover:text-text-secondary'
                            )}
                          >
                            与当前对比
                          </button>
                          <button
                            onClick={() => { setCompareMode('vs-snapshot'); if (!compareWithId && reviewSnapshots.length > 0) setCompareWithId(reviewSnapshots[0].id); }}
                            className={cn(
                              'px-3 py-1.5',
                              compareMode === 'vs-snapshot'
                                ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                                : 'text-text-muted hover:text-text-secondary'
                            )}
                          >
                            与历史版本对比
                          </button>
                        </div>
                        {compareMode === 'vs-snapshot' && (
                          <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                            <span className="text-text-muted font-mono shrink-0">基线版本：</span>
                            <select
                              value={compareWithId}
                              onChange={(e) => setCompareWithId(e.target.value)}
                              className="input-field !py-1.5 text-xs flex-1 min-w-0"
                            >
                              {reviewSnapshots
                                .filter((s) => s.id !== viewingSnapshot.id)
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.meetingTitle} · {new Date(s.createdAt).toLocaleString('zh-CN')}
                                  </option>
                                ))}
                              {reviewSnapshots.filter((s) => s.id !== viewingSnapshot.id).length === 0 && (
                                <option value="">（无可对比版本）</option>
                              )}
                            </select>
                          </div>
                        )}
                      </div>
                      {compareMode === 'vs-snapshot' && (
                        <div className="mt-3 text-[11px] text-text-muted font-mono flex items-center gap-2 flex-wrap">
                          <RefreshCw className="w-3 h-3 text-accent-gold" />
                          对比方向：
                          <span className="text-accent-gold">
                            {compareWithId && reviewSnapshots.find(s => s.id === compareWithId)?.meetingTitle || '未选择'}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-accent-gold">{viewingSnapshot.meetingTitle}</span>
                          <span className="text-text-secondary">（变化：新增/解决/状态流转/备注/行动项）</span>
                        </div>
                      )}
                    </div>
                    <ComparisonPanel
                      comparison={
                        compareMode === 'vs-current'
                          ? compareSnapshot(viewingSnapshot.id)
                          : (compareWithId ? compareTwoSnapshots(compareWithId, viewingSnapshot.id) : null)
                      }
                      statusColorCls={statusColorCls}
                      statusLabelShort={statusLabelShort}
                    />
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border-subtle flex justify-end gap-3">
                <button
                  onClick={() => handleExportMeetingSummary(viewingSnapshot)}
                  className="btn-secondary inline-flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  导出会议纪要
                </button>
                <button
                  onClick={() => setViewingSnapshot(null)}
                  className="btn-primary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <section className="card-panel p-6 animate-slideUp">
            <h3 className="section-title flex items-center gap-2">
              <Link2Off className="w-5 h-5" />
              空间叙事连贯性
            </h3>

            {diagnosis.narrativeIssues.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-status-low opacity-40" />
                相邻房间之间过渡自然，未发现明显叙事断层。
              </div>
            ) : (
              <div className="space-y-4">
                {diagnosis.narrativeIssues.map((issue, idx) => (
                  <div
                    key={issue.id}
                    className="p-4 bg-bg-tertiary/50 border border-border-subtle animate-slideUp"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-text-secondary font-mono">{issue.fromRoom}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-accent-crimsonLight" />
                        <span className="text-text-primary font-medium">{issue.toRoom}</span>
                      </div>
                      <PriorityBadge priority={issue.priority} />
                    </div>
                    <p className="text-sm text-text-primary mb-2">{issue.description}</p>
                    <ul className="space-y-1 mb-3">
                      {issue.missingEvidence.map((ev, i) => (
                        <li
                          key={i}
                          className="text-xs text-text-secondary flex items-start gap-1.5"
                        >
                          <span className="text-accent-crimsonLight mt-0.5">·</span>
                          {ev}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-3 border-t border-border-subtle">
                      <p className="text-xs">
                        <span className="text-accent-gold font-mono mr-2">建议 →</span>
                        <span className="text-text-secondary">{issue.suggestion}</span>
                      </p>
                    </div>
                    <ReviewNoteField
                      issueId={issue.id}
                      note={reviewNotes[issue.id] || ''}
                      onNoteChange={setReviewNote}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card-panel p-6 animate-slideUp" style={{ animationDelay: '80ms' }}>
            <h3 className="section-title flex items-center gap-2">
              <Activity className="w-5 h-5" />
              恐怖节奏分析
            </h3>

            <div className="mb-6">
              <h4 className="text-sm text-text-secondary mb-3 font-mono tracking-wider">
                情绪起伏曲线
              </h4>
              <EmotionCurveChart points={emotionPoints} />
            </div>

            <div className="mb-6">
              <h4 className="text-sm text-text-secondary mb-3 font-mono tracking-wider">
                空间序列一览
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {allRooms.map((room, idx) => {
                  const emotion = emotionLabel[room.emotionState];
                  return (
                    <div key={room.id} className="flex items-center text-xs">
                      <div className={cn('px-2 py-1 border tag', `tag-${room.emotionState}`)}>
                        <span className="text-text-muted font-mono mr-1">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {room.name}
                        <span className="ml-1.5 opacity-70">· {spaceTypeLabel[room.spaceType]}</span>
                        <span className="ml-1.5 opacity-70">· {emotion}</span>
                      </div>
                      {idx < allRooms.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-text-muted mx-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {diagnosis.rhythmIssues.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-status-low opacity-40" />
                空间节奏把控良好，情绪曲线存在合理起伏。
              </div>
            ) : (
              <div className="space-y-4">
                {diagnosis.rhythmIssues.map((issue, idx) => (
                  <div
                    key={issue.id}
                    className="p-4 bg-bg-tertiary/50 border border-border-subtle animate-slideUp"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="tag bg-bg-secondary text-text-muted border-border-strong font-mono">
                          模式：{issue.rhythmPattern}
                        </span>
                      </div>
                      <PriorityBadge priority={issue.priority} />
                    </div>
                    <p className="text-sm text-text-primary mb-2">{issue.description}</p>
                    <p className="text-xs text-text-secondary mb-2">
                      涉及房间：
                      <span className="text-text-primary">{issue.rooms.join(' → ')}</span>
                    </p>
                    <div className="pt-3 border-t border-border-subtle">
                      <p className="text-xs">
                        <span className="text-accent-gold font-mono mr-2">建议 →</span>
                        <span className="text-text-secondary">{issue.suggestion}</span>
                      </p>
                    </div>
                    <ReviewNoteField
                      issueId={issue.id}
                      note={reviewNotes[issue.id] || ''}
                      onNoteChange={setReviewNote}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card-panel p-6 animate-slideUp" style={{ animationDelay: '160ms' }}>
            <h3 className="section-title flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              伏笔回收清单
            </h3>

            {diagnosis.foreshadowItems.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">
                <CircleHelp className="w-10 h-10 mx-auto mb-2 text-status-low opacity-40" />
                未检测到明显伏笔元素，请在房间中填入具体物件与事件描述。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left">
                      <th className="pb-3 pr-4 text-xs font-mono text-text-muted tracking-wider whitespace-nowrap">
                        伏笔元素
                      </th>
                      <th className="pb-3 pr-4 text-xs font-mono text-text-muted tracking-wider whitespace-nowrap">
                        首次出现
                      </th>
                      <th className="pb-3 pr-4 text-xs font-mono text-text-muted tracking-wider whitespace-nowrap">
                        回收状态
                      </th>
                      <th className="pb-3 pr-4 text-xs font-mono text-text-muted tracking-wider whitespace-nowrap">
                        回收位置
                      </th>
                      <th className="pb-3 pr-4 text-xs font-mono text-text-muted tracking-wider whitespace-nowrap">
                        优先级
                      </th>
                      <th className="pb-3 text-xs font-mono text-text-muted tracking-wider whitespace-nowrap">
                        评审备注
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosis.foreshadowItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-b border-border-subtle/50 animate-fadeIn align-top"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <td className="py-3 pr-4">
                          <span className="text-text-primary font-medium">{item.element}</span>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                          {item.introducedIn}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                          {item.resolvedIn || '—'}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="py-3">
                          <textarea
                            value={reviewNotes[item.id] || ''}
                            onChange={(e) => setReviewNote(item.id, e.target.value)}
                            placeholder="导演组意见..."
                            rows={1}
                            className="w-full input-field resize-none text-xs leading-relaxed min-h-[30px]"
                            style={{
                              borderColor:
                                (reviewNotes[item.id] || '').length > 0
                                  ? 'rgba(201, 169, 98, 0.35)'
                                  : undefined,
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
