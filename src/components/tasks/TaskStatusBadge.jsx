import StatusBadge from '../common/StatusBadge'
import { TaskStatus } from '../../models/tasks'

export default function TaskStatusBadge({ status }) {
  const s = String(status ?? TaskStatus.pending).toUpperCase()

  return <StatusBadge value={s.toLowerCase()} />
}
