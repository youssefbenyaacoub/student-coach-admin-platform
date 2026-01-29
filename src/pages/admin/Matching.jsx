import { useState, useMemo } from 'react'
import { Users, UserPlus, Check, ChevronRight, Search, Shield, Filter } from 'lucide-react'
import Card from '../../components/common/Card'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../utils/cn'

export default function AdminMatching() {
    const { data, matchStudentCoach } = useData()
    const { push } = useToast()

    const [selectedProgramId, setSelectedProgramId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [busy, setBusy] = useState(false)

    const programs = useMemo(() => data?.programs ?? [], [data?.programs])
    const users = useMemo(() => data?.users ?? [], [data?.users])

    const selectedProgram = useMemo(() =>
        programs.find(p => p.id === selectedProgramId),
        [programs, selectedProgramId])

    const programCoaches = useMemo(() => {
        if (!selectedProgram) return []
        return users.filter(u => selectedProgram.coachIds.includes(u.id))
    }, [selectedProgram, users])

    const students = useMemo(() => {
        if (!selectedProgram) return []
        return selectedProgram.participants.map(p => {
            const student = users.find(u => u.id === p.studentId)
            const coach = users.find(u => u.id === p.coachId)
            return {
                ...p,
                studentName: student?.name ?? 'Unknown Student',
                studentEmail: student?.email ?? '',
                coachName: coach?.name ?? 'Not Assigned',
                coachId: p.coachId
            }
        })
    }, [selectedProgram, users])

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students
        const lower = searchTerm.toLowerCase()
        return students.filter(s =>
            s.studentName.toLowerCase().includes(lower) ||
            s.studentEmail.toLowerCase().includes(lower) ||
            s.coachName.toLowerCase().includes(lower)
        )
    }, [students, searchTerm])

    const handleMatch = async (studentId, coachId) => {
        if (!selectedProgramId) return
        setBusy(true)
        try {
            await matchStudentCoach({
                programId: selectedProgramId,
                studentId,
                coachId
            })
            push({ type: 'success', title: 'Matched', message: 'Coach successfully assigned to student.' })
        } catch (e) {
            push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to match student and coach.' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Coach Matching</h1>
                    <p className="mt-2 text-lg text-slate-500 font-medium">Assign coaches to students within programs.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                    <Filter className="h-4 w-4 ml-3 text-slate-400" />
                    <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-8 py-2 dark:text-slate-200"
                    >
                        <option value="">Select a program...</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedProgramId ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                    <div className="bg-slate-100 p-4 rounded-full mb-4 dark:bg-slate-800">
                        <Users className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Start by selecting a program</h3>
                    <p className="text-slate-500 mt-2 max-w-xs text-center font-medium">Choose a program from the dropdown above to view students and assign coaches.</p>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students by name or coach..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all shadow-sm dark:bg-slate-800 dark:border-slate-700"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                                No students found matching your search.
                            </div>
                        ) : (
                            filteredStudents.map(student => (
                                <Card key={student.studentId} className="overflow-visible">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-2">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                                {student.studentName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white">{student.studentName}</h4>
                                                <p className="text-sm text-slate-500 font-medium">{student.studentEmail}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-8">
                                            <div className="flex items-center gap-3 min-w-[200px]">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Coach</p>
                                                    <p className={cn(
                                                        "text-sm font-bold",
                                                        student.coachId ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                                                    )}>
                                                        {student.coachName}
                                                    </p>
                                                </div>
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all",
                                                    student.coachId
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400"
                                                        : "bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                                                )}>
                                                    {student.coachId ? student.coachName.charAt(0) : '?'}
                                                </div>
                                            </div>

                                            <div className="h-12 w-px bg-slate-100 dark:bg-slate-700 hidden lg:block"></div>

                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="relative flex-1 sm:flex-none">
                                                    <select
                                                        disabled={busy}
                                                        onChange={(e) => handleMatch(student.studentId, e.target.value)}
                                                        className="w-full sm:w-56 appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 shadow-sm"
                                                        value={student.coachId || ''}
                                                    >
                                                        <option value="">Assign Coach...</option>
                                                        {programCoaches.map(coach => (
                                                            <option key={coach.id} value={coach.id}>
                                                                {coach.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90" />
                                                </div>
                                                {student.coachId && (
                                                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
