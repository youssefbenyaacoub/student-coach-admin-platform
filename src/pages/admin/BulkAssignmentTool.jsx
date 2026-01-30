import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    TouchSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { supabase } from '../../lib/supabase';
import {
    assignStudent,
    unassignStudent,
    autoAssignStudents,
    getAllReferentWorkloads,
    saveAssignmentDraft,
    getAssignmentDrafts,
    loadAssignmentDraft,
    deleteAssignmentDraft,
    exportAssignmentsToCSV,
    exportAssignmentsToPDF,
    downloadCSV,
    undoRedoManager
} from '../../utils/assignmentUtils';
import StudentCard from '../../components/admin/StudentCard';
import ReferentCard from '../../components/admin/ReferentCard';
import WorkloadChart from '../../components/admin/WorkloadChart';
import CompatibilityMatrix from '../../components/admin/CompatibilityMatrix';
import {
    Wand2,
    Save,
    Download,
    Undo2,
    Redo2,
    BarChart3,
    Grid3x3,
    Users,
    Loader2,
    FolderOpen,
    Trash2
} from 'lucide-react';

export default function BulkAssignmentTool() {
    const { programId } = useParams();

    const [program, setProgram] = useState(null);
    const [students, setStudents] = useState([]);
    const [referents, setReferents] = useState([]);
    const [workloads, setWorkloads] = useState({});
    const [assignments, setAssignments] = useState({});
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [activeStudent, setActiveStudent] = useState(null);
    const [activeView, setActiveView] = useState('drag'); // 'drag', 'chart', 'matrix'
    const [drafts, setDrafts] = useState([]);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [draftName, setDraftName] = useState('');

    // DND Kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        }),
        useSensor(KeyboardSensor),
        useSensor(TouchSensor)
    );

    // Load program, students, and referents
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load program
                const { data: programData } = await supabase
                    .from('programs')
                    .select('*')
                    .eq('id', programId)
                    .single();

                setProgram(programData);

                // Load students in program
                const { data: studentsData } = await supabase
                    .from('program_participants')
                    .select(`
            student_id,
            coach_id,
            student:users!program_participants_student_id_fkey(*)
          `)
                    .eq('program_id', programId);

                const studentsList = studentsData.map(p => ({
                    ...p.student,
                    currentCoachId: p.coach_id
                }));
                setStudents(studentsList);

                // Build assignments map
                const assignmentsMap = {};
                studentsData.forEach(p => {
                    if (p.coach_id) {
                        if (!assignmentsMap[p.coach_id]) {
                            assignmentsMap[p.coach_id] = [];
                        }
                        assignmentsMap[p.coach_id].push(p.student);
                    }
                });
                setAssignments(assignmentsMap);

                // Load referents (coaches) in program
                const { data: referentsData } = await supabase
                    .from('program_coaches')
                    .select(`
            coach_id,
            coach:users!program_coaches_coach_id_fkey(*),
            expertise:referent_expertise(*)
          `)
                    .eq('program_id', programId);

                const referentsList = referentsData.map(p => ({
                    ...p.coach,
                    expertise: p.expertise
                }));
                setReferents(referentsList);

                // Load workloads
                const workloadsData = await getAllReferentWorkloads(referentsList, programId);
                setWorkloads(workloadsData);

                // Load drafts
                const draftsData = await getAssignmentDrafts(programId);
                setDrafts(draftsData);

                // Initialize undo/redo with current state
                undoRedoManager.clear();
                undoRedoManager.pushState({ assignments: assignmentsMap });

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (programId) {
            loadData();
        }
    }, [programId]);

    // Subscribe to real-time updates
    useEffect(() => {
        const channel = supabase
            .channel(`assignments_${programId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'program_participants', filter: `program_id=eq.${programId}` },
                () => {
                    // Reload data on changes
                    window.location.reload();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [programId]);

    // Handle drag start
    const handleDragStart = (event) => {
        const { active } = event;
        const student = students.find(s => `student-${s.id}` === active.id);
        setActiveStudent(student);
    };

    // Handle drag end
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveStudent(null);

        if (!over) return;

        const studentId = active.id.replace('student-', '');
        const referentId = over.id.replace('referent-', '');

        // Don't assign if dropped on same referent
        const student = students.find(s => s.id === studentId);
        if (student?.currentCoachId === referentId) return;

        // Save state for undo
        undoRedoManager.pushState({ assignments });

        // Perform assignment
        setProcessing(true);
        const result = await assignStudent(studentId, referentId, programId);

        if (result.success) {
            // Update local state
            const updatedAssignments = { ...assignments };

            // Remove from old referent
            Object.keys(updatedAssignments).forEach(refId => {
                updatedAssignments[refId] = updatedAssignments[refId].filter(s => s.id !== studentId);
            });

            // Add to new referent
            if (!updatedAssignments[referentId]) {
                updatedAssignments[referentId] = [];
            }
            updatedAssignments[referentId].push(student);

            setAssignments(updatedAssignments);

            // Update student's current coach
            setStudents(students.map(s =>
                s.id === studentId ? { ...s, currentCoachId: referentId } : s
            ));

            // Reload workloads
            const workloadsData = await getAllReferentWorkloads(referents, programId);
            setWorkloads(workloadsData);
        } else {
            alert('Failed to assign student: ' + result.error);
        }

        setProcessing(false);
    };

    // Handle remove student from referent
    const handleRemoveStudent = async (studentId) => {
        if (!confirm('Remove this assignment?')) return;

        // Save state for undo
        undoRedoManager.pushState({ assignments });

        setProcessing(true);
        const result = await unassignStudent(studentId, programId);

        if (result.success) {
            // Update local state
            const updatedAssignments = { ...assignments };
            Object.keys(updatedAssignments).forEach(refId => {
                updatedAssignments[refId] = updatedAssignments[refId].filter(s => s.id !== studentId);
            });
            setAssignments(updatedAssignments);

            // Update student's current coach
            setStudents(students.map(s =>
                s.id === studentId ? { ...s, currentCoachId: null } : s
            ));

            // Reload workloads
            const workloadsData = await getAllReferentWorkloads(referents, programId);
            setWorkloads(workloadsData);
        }

        setProcessing(false);
    };

    // Handle auto-assign
    const handleAutoAssign = async () => {
        if (!confirm('Automatically assign all unassigned students based on compatibility scores?')) return;

        // Save state for undo
        undoRedoManager.pushState({ assignments });

        setProcessing(true);
        const result = await autoAssignStudents(programId);

        if (result.success) {
            alert(`Successfully assigned ${result.assigned_count} students!`);
            window.location.reload();
        } else {
            alert('Failed to auto-assign: ' + result.error);
        }

        setProcessing(false);
    };

    // Handle save draft
    const handleSaveDraft = async () => {
        if (!draftName.trim()) {
            alert('Please enter a draft name');
            return;
        }

        const result = await saveAssignmentDraft(draftName, assignments, programId);
        if (result.success) {
            alert('Draft saved successfully!');
            setDraftName('');
            setShowDraftModal(false);
            const draftsData = await getAssignmentDrafts(programId);
            setDrafts(draftsData);
        } else {
            alert('Failed to save draft: ' + result.error);
        }
    };

    // Handle load draft
    const handleLoadDraft = async (draftId) => {
        const result = await loadAssignmentDraft(draftId);
        if (result.success) {
            setAssignments(result.draft.assignments_json);
            setShowDraftModal(false);
            alert('Draft loaded successfully!');
        }
    };

    // Handle delete draft
    const handleDeleteDraft = async (draftId) => {
        if (!confirm('Delete this draft?')) return;

        const result = await deleteAssignmentDraft(draftId);
        if (result.success) {
            const draftsData = await getAssignmentDrafts(programId);
            setDrafts(draftsData);
        }
    };

    // Handle export
    const handleExport = async (format) => {
        const assignmentsList = Object.entries(assignments).flatMap(([referentId, students]) =>
            students.map(student => ({
                student,
                referent: referents.find(r => r.id === referentId),
                program,
                assigned_at: new Date().toISOString()
            }))
        );

        if (format === 'csv') {
            const csv = exportAssignmentsToCSV(assignmentsList);
            downloadCSV(csv, `assignments-${program.name}.csv`);
        } else if (format === 'pdf') {
            await exportAssignmentsToPDF(assignmentsList, program.name);
        }
    };

    // Handle undo
    const handleUndo = () => {
        const previousState = undoRedoManager.undo({ assignments });
        if (previousState) {
            setAssignments(previousState.assignments);
        }
    };

    // Handle redo
    const handleRedo = () => {
        const nextState = undoRedoManager.redo({ assignments });
        if (nextState) {
            setAssignments(nextState.assignments);
        }
    };

    // Get unassigned students
    const unassignedStudents = students.filter(s => !s.currentCoachId);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bulk Assignment Tool</h1>
                        <p className="text-sm text-gray-600 mt-1">{program?.name}</p>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleAutoAssign}
                            disabled={processing || unassignedStudents.length === 0}
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                            <Wand2 className="w-4 h-4 mr-2" />
                            Auto-Assign
                        </button>

                        <button
                            onClick={() => setShowDraftModal(true)}
                            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Draft
                        </button>

                        <div className="relative group">
                            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden group-hover:block z-10">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Export as CSV
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Export as PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-1 border-l pl-2">
                            <button
                                onClick={handleUndo}
                                disabled={!undoRedoManager.canUndo()}
                                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                                title="Undo"
                            >
                                <Undo2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={!undoRedoManager.canRedo()}
                                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                                title="Redo"
                            >
                                <Redo2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex space-x-4 mt-4">
                    <button
                        onClick={() => setActiveView('drag')}
                        className={`flex items-center px-4 py-2 rounded-md ${activeView === 'drag' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Drag & Drop
                    </button>
                    <button
                        onClick={() => setActiveView('chart')}
                        className={`flex items-center px-4 py-2 rounded-md ${activeView === 'chart' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Workload Chart
                    </button>
                    <button
                        onClick={() => setActiveView('matrix')}
                        className={`flex items-center px-4 py-2 rounded-md ${activeView === 'matrix' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Grid3x3 className="w-4 h-4 mr-2" />
                        Compatibility Matrix
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-6">
                {activeView === 'drag' && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                            {/* Unassigned Students */}
                            <div className="bg-white rounded-lg shadow p-4 overflow-y-auto">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Unassigned Students ({unassignedStudents.length})
                                </h2>
                                <div className="space-y-3">
                                    {unassignedStudents.map(student => (
                                        <StudentCard key={student.id} student={student} />
                                    ))}
                                    {unassignedStudents.length === 0 && (
                                        <p className="text-center text-gray-500 py-8">
                                            All students assigned!
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Referents */}
                            <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 overflow-y-auto">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Referents ({referents.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {referents.map(referent => (
                                        <ReferentCard
                                            key={referent.id}
                                            referent={referent}
                                            workload={workloads[referent.id]}
                                            assignedStudents={assignments[referent.id] || []}
                                            onRemoveStudent={handleRemoveStudent}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DragOverlay>
                            {activeStudent && <StudentCard student={activeStudent} isDragging />}
                        </DragOverlay>
                    </DndContext>
                )}

                {activeView === 'chart' && (
                    <WorkloadChart referents={referents} workloads={workloads} chartType="bar" />
                )}

                {activeView === 'matrix' && (
                    <CompatibilityMatrix
                        students={students}
                        referents={referents}
                        onAssign={(studentId, referentId) => {
                            handleDragEnd({
                                active: { id: `student-${studentId}` },
                                over: { id: `referent-${referentId}` }
                            });
                        }}
                    />
                )}
            </div>

            {/* Processing Overlay */}
            {processing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-gray-900">Processing...</span>
                    </div>
                </div>
            )}

            {/* Draft Modal */}
            {showDraftModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Save/Load Draft</h3>

                        {/* Save New Draft */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Save Current Assignments
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={draftName}
                                    onChange={(e) => setDraftName(e.target.value)}
                                    placeholder="Draft name..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <button
                                    onClick={handleSaveDraft}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Load Existing Draft */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Load Existing Draft
                            </label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {drafts.map(draft => (
                                    <div key={draft.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{draft.draft_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(draft.updated_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleLoadDraft(draft.id)}
                                                className="p-2 hover:bg-gray-200 rounded"
                                                title="Load"
                                            >
                                                <FolderOpen className="w-4 h-4 text-indigo-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDraft(draft.id)}
                                                className="p-2 hover:bg-red-100 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {drafts.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No saved drafts</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setShowDraftModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
