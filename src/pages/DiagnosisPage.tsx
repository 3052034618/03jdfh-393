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
} from 'lucide-react';
import { useBlueprintStore } from '@/store/blueprintStore';
import { getEmotionCurve, emotionLabel, spaceTypeLabel } from '@/utils/diagnosis';
import type { Priority, ForeshadowStatus } from '@/types';
import { cn } from '@/lib/utils';
import EmotionCurveChart from '@/components/EmotionCurveChart';
import {
  exportReportToMarkdown,
  exportReportToText,
  downloadFile,
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

export default function DiagnosisPage() {
  const {
    getAllRooms,
    getDiagnosis,
    getChecklist,
    reviewNotes,
    setReviewNote,
    checklistStatus,
  } = useBlueprintStore();
  const allRooms = getAllRooms();
  const diagnosis = useMemo(() => getDiagnosis(), [getDiagnosis]);
  const checklist = useMemo(() => getChecklist(), [getChecklist]);
  const emotionPoints = useMemo(() => getEmotionCurve(allRooms), [allRooms]);

  const scoreColor =
    diagnosis.overallScore >= 85
      ? '#5a8a6b'
      : diagnosis.overallScore >= 70
        ? '#c9a962'
        : diagnosis.overallScore >= 50
          ? '#d97a3a'
          : '#c93d4f';

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
          <div className="flex gap-2">
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
