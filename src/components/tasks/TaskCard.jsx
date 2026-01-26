import { Calendar, Link2, FileText, CheckSquare, Type } from 'lucide-react'
import Card from '../common/Card'
import { TaskType, taskTypeLabel, taskStatusLabel } from '../../models/tasks'
import { formatDateTime } from '../../utils/time'
import TaskStatusBadge from './TaskStatusBadge'

const ICONS = {
  [TaskType.text]: Type,
  [TaskType.file]: FileText,
  [TaskType.link]: Link2,
  [TaskType.checklist]: CheckSquare,
}

export default function TaskCard({
  task,
  primaryAction,
  secondaryAction,
  children,
}) {
  const Icon = ICONS[String(task?.taskType ?? '').toUpperCase()] ?? CheckSquare

  return (
    <Card
      title={
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-heading font-bold text-slate-900 truncate">{task?.title}</div>
            <div className="text-xs text-slate-500">
              {taskTypeLabel(task?.taskType)} • {taskStatusLabel(task?.status)}
            </div>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={task?.status} />
          {primaryAction}
          {secondaryAction}
        </div>
      }
    >
      <div className="space-y-3">
        {task?.description ? (
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</div>
        ) : (
          <div className="text-sm text-slate-500">No description.</div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {task?.deadline ? (
            <div className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Deadline: {formatDateTime(task.deadline)}</span>
            </div>
          ) : null}
          {task?.createdAt ? <span>Created: {formatDateTime(task.createdAt)}</span> : null}
        </div>

        {children}
      </div>
    </Card>
  )
}
