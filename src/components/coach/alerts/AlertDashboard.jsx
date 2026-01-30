import { useState, useMemo } from 'react'
import { AlertTriangle, Filter, Search, Settings } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useData } from '../../../hooks/useData'
import StudentAlertCard from './StudentAlertCard'
import AlertRulesManager from './AlertRulesManager'
import ActivityTimeline from './ActivityTimeline'

export default function AlertDashboard() {
    const { currentUser } = useAuth()
    const { data } = useData()
    const [filterSeverity, setFilterSeverity] = useState('all') // 'all', 'high', 'medium', 'low'
    const [showRulesManager, setShowRulesManager] = useState(false)
    const [selectedStudentId, setSelectedStudentId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Mocking generated alerts for now (until we interpret the SQL logic or fetch from backend)
    // In a real scenario, we'd fetch from 'generated_alerts' table.
    // Here we can compute them on the fly similar to CoachDashboard logic but more specialized.

    const alerts = useMemo(() => {
        if (!data?.users || !currentUser) return []

        // In a real app, fetch these from 'generated_alerts' table
        // For this implementation, we will simulate the alerts based on data + some randomization for demo
        // or calculate strictly from the requirements (Inactivity > 7 days)

        const myStudents = (data.users || []).filter(u => u.role === 'student') // Filter properly in real app

        return myStudents.map(student => {
            // Calculate inactivity
            // Assume student.updated_at is last active for now
            const lastActive = new Date(student.updated_at || student.created_at)
            const daysInactive = Math.floor((new Date() - lastActive) / (1000 * 60 * 60 * 24))

            const studentAlerts = []

            if (daysInactive > 7) {
                studentAlerts.push({
                    id: `alert-${student.id}-inactivity`,
                    type: 'inactivity',
                    severity: daysInactive > 14 ? 'high' : 'medium',
                    message: `Inactive for ${daysInactive} days`,
                    date: new Date()
                })
            }

            // Check overdue deliverables
            const overdueCount = (data.deliverables || [])
                .filter(d => d.assignedStudentIds && d.assignedStudentIds.includes(student.id) && new Date(d.dueDate) < new Date())
                .length

            if (overdueCount > 0) {
                studentAlerts.push({
                    id: `alert-${student.id}-overdue`,
                    type: 'submission',
                    severity: 'high',
                    message: `${overdueCount} overdue deliverables`,
                    date: new Date()
                })
            }

            return {
                student,
                alerts: studentAlerts,
                maxSeverity: studentAlerts.some(a => a.severity === 'high') ? 'high' :
                    studentAlerts.some(a => a.severity === 'medium') ? 'medium' :
                        studentAlerts.length > 0 ? 'low' : null
            }
        }).filter(item => item.alerts.length > 0)
            .filter(item => {
                if (filterSeverity === 'all') return true
                return item.maxSeverity === filterSeverity
            })
            .filter(item => {
                if (!searchQuery) return true
                return item.student.name.toLowerCase().includes(searchQuery.toLowerCase())
            })
            .sort((a, b) => {
                const severityScore = { high: 3, medium: 2, low: 1, null: 0 }
                return severityScore[b.maxSeverity] - severityScore[a.maxSeverity]
            })

    }, [data, currentUser, filterSeverity, searchQuery])

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">

            {/* Header Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Alert Dashboard</h1>
                    <p className="text-slate-500">Monitor student risks and activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowRulesManager(!showRulesManager)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        Configure Rules
                    </button>
                </div>
            </div>

            {showRulesManager && (
                <div className="mb-6 animate-in slide-in-from-top-4 fade-in">
                    <AlertRulesManager onClose={() => setShowRulesManager(false)} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-0">

                {/* Left: Student List */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm transition-all outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 text-sm">
                            {['all', 'high', 'medium'].map(sev => (
                                <button
                                    key={sev}
                                    onClick={() => setFilterSeverity(sev)}
                                    className={`px-3 py-1.5 rounded-full capitalize text-xs font-semibold border transition-colors
                             ${filterSeverity === sev
                                            ? (sev === 'high' ? 'bg-red-50 text-red-700 border-red-200' : sev === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-800 text-white border-slate-800')
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {sev}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {alerts.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 text-sm">
                                No alerts found.
                            </div>
                        ) : (
                            alerts.map(({ student, alerts, maxSeverity }) => (
                                <StudentAlertCard
                                    key={student.id}
                                    student={student}
                                    alerts={alerts}
                                    severity={maxSeverity}
                                    isSelected={selectedStudentId === student.id}
                                    onClick={() => setSelectedStudentId(student.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Detailed View */}
                <div className="md:col-span-8 lg:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                    {selectedStudentId ? (
                        <ActivityTimeline studentId={selectedStudentId} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <AlertTriangle className="h-8 w-8 text-slate-300" />
                            </div>
                            <p>Select a student to view detailed activity timeline</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
