import { supabase } from '../lib/supabase';

/**
 * Assignment System Utilities
 * Functions for matching students with referents, calculating compatibility scores,
 * managing workload, and handling bulk assignments.
 */

// ========================================
// COMPATIBILITY SCORING
// ========================================

/**
 * Calculate compatibility score between student and referent
 * @param {Object} student - Student object with metadata
 * @param {Object} referent - Referent object with expertise
 * @param {Object} weights - Scoring weights (optional)
 * @returns {number} Compatibility score (0-100)
 */
export async function calculateCompatibilityScore(student, referent, weights = null) {
    try {
        const { data, error } = await supabase.rpc('calculate_compatibility_score', {
            p_student_id: student.id,
            p_referent_id: referent.id,
            p_weights: weights
        });

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Error calculating compatibility score:', error);
        return 0;
    }
}

/**
 * Calculate compatibility scores for a student against all referents
 * @param {Object} student - Student object
 * @param {Array} referents - Array of referent objects
 * @param {Object} weights - Scoring weights (optional)
 * @returns {Object} Map of referent_id to score
 */
export async function calculateAllCompatibilityScores(student, referents, weights = null) {
    const scores = {};

    await Promise.all(
        referents.map(async (referent) => {
            const score = await calculateCompatibilityScore(student, referent, weights);
            scores[referent.id] = score;
        })
    );

    return scores;
}

// ========================================
// WORKLOAD MANAGEMENT
// ========================================

/**
 * Get referent workload information
 * @param {string} referentId - Referent UUID
 * @param {string} programId - Program UUID (optional)
 * @returns {Object} Workload information
 */
export async function getReferentWorkload(referentId, programId = null) {
    try {
        const { data, error } = await supabase.rpc('get_referent_workload', {
            p_referent_id: referentId,
            p_program_id: programId
        });

        if (error) throw error;
        return data || {
            current_students: 0,
            max_students: 10,
            available_capacity: 10,
            capacity_percentage: 0,
            is_overloaded: false,
            is_at_capacity: false
        };
    } catch (error) {
        console.error('Error getting referent workload:', error);
        return null;
    }
}

/**
 * Get workload for all referents in a program
 * @param {Array} referents - Array of referent objects
 * @param {string} programId - Program UUID
 * @returns {Object} Map of referent_id to workload
 */
export async function getAllReferentWorkloads(referents, programId) {
    const workloads = {};

    await Promise.all(
        referents.map(async (referent) => {
            const workload = await getReferentWorkload(referent.id, programId);
            workloads[referent.id] = workload;
        })
    );

    return workloads;
}

/**
 * Get workload status color
 * @param {number} capacityPercentage - Capacity percentage (0-100+)
 * @returns {string} Color class
 */
export function getWorkloadColor(capacityPercentage) {
    if (capacityPercentage >= 100) return 'text-red-600 bg-red-100';
    if (capacityPercentage >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
}

// ========================================
// ASSIGNMENT VALIDATION
// ========================================

/**
 * Validate an assignment
 * @param {string} studentId - Student UUID
 * @param {string} referentId - Referent UUID
 * @param {string} programId - Program UUID
 * @returns {Object} Validation result
 */
export async function validateAssignment(studentId, referentId, programId) {
    try {
        const { data, error } = await supabase.rpc('validate_assignment', {
            p_student_id: studentId,
            p_referent_id: referentId,
            p_program_id: programId
        });

        if (error) throw error;
        return data || { valid: false, error: 'Unknown error' };
    } catch (error) {
        console.error('Error validating assignment:', error);
        return { valid: false, error: error.message };
    }
}

// ========================================
// BULK ASSIGNMENT OPERATIONS
// ========================================

/**
 * Bulk assign students to referents
 * @param {Array} assignments - Array of {student_id, referent_id, program_id}
 * @returns {Object} Result with success count and errors
 */
export async function bulkAssignStudents(assignments) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('bulk_assign_students', {
            p_assignments: assignments,
            p_admin_id: user.id
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error bulk assigning students:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Auto-assign students based on compatibility algorithm
 * @param {string} programId - Program UUID
 * @returns {Object} Result with assignment count
 */
export async function autoAssignStudents(programId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('auto_assign_students', {
            p_program_id: programId,
            p_admin_id: user.id
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error auto-assigning students:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Assign single student to referent
 * @param {string} studentId - Student UUID
 * @param {string} referentId - Referent UUID
 * @param {string} programId - Program UUID
 * @returns {Object} Result
 */
export async function assignStudent(studentId, referentId, programId) {
    return bulkAssignStudents([{ student_id: studentId, referent_id: referentId, program_id: programId }]);
}

/**
 * Unassign student from referent
 * @param {string} studentId - Student UUID
 * @param {string} programId - Program UUID
 * @returns {Object} Result
 */
export async function unassignStudent(studentId, programId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Update program_participants to remove coach
        const { error: updateError } = await supabase
            .from('program_participants')
            .update({ coach_id: null, updated_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .eq('program_id', programId);

        if (updateError) throw updateError;

        // Log to assignment history
        const { error: historyError } = await supabase
            .from('assignment_history')
            .update({ unassigned_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .eq('program_id', programId)
            .is('unassigned_at', null);

        if (historyError) throw historyError;

        return { success: true };
    } catch (error) {
        console.error('Error unassigning student:', error);
        return { success: false, error: error.message };
    }
}

// ========================================
// DRAFT MANAGEMENT
// ========================================

/**
 * Save assignment draft
 * @param {string} draftName - Name for the draft
 * @param {Array} assignments - Array of assignments
 * @param {string} programId - Program UUID
 * @returns {Object} Result with draft ID
 */
export async function saveAssignmentDraft(draftName, assignments, programId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('assignment_drafts')
            .insert({
                admin_id: user.id,
                draft_name: draftName,
                program_id: programId,
                assignments_json: assignments
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, draft: data };
    } catch (error) {
        console.error('Error saving draft:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Load assignment draft
 * @param {string} draftId - Draft UUID
 * @returns {Object} Draft data
 */
export async function loadAssignmentDraft(draftId) {
    try {
        const { data, error } = await supabase
            .from('assignment_drafts')
            .select('*')
            .eq('id', draftId)
            .single();

        if (error) throw error;
        return { success: true, draft: data };
    } catch (error) {
        console.error('Error loading draft:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all drafts for current user
 * @param {string} programId - Program UUID (optional)
 * @returns {Array} Array of drafts
 */
export async function getAssignmentDrafts(programId = null) {
    try {
        let query = supabase
            .from('assignment_drafts')
            .select('*')
            .order('updated_at', { ascending: false });

        if (programId) {
            query = query.eq('program_id', programId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting drafts:', error);
        return [];
    }
}

/**
 * Delete assignment draft
 * @param {string} draftId - Draft UUID
 * @returns {Object} Result
 */
export async function deleteAssignmentDraft(draftId) {
    try {
        const { error } = await supabase
            .from('assignment_drafts')
            .delete()
            .eq('id', draftId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting draft:', error);
        return { success: false, error: error.message };
    }
}

// ========================================
// EXPORT FUNCTIONALITY
// ========================================

/**
 * Export assignments to CSV
 * @param {Array} assignments - Array of assignment objects
 * @returns {string} CSV string
 */
export function exportAssignmentsToCSV(assignments) {
    const headers = ['Student Name', 'Student Email', 'Referent Name', 'Referent Email', 'Program', 'Assigned Date', 'Compatibility Score'];
    const rows = assignments.map(a => [
        a.student?.name || '',
        a.student?.email || '',
        a.referent?.name || '',
        a.referent?.email || '',
        a.program?.name || '',
        a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '',
        a.compatibility_score || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV string
 * @param {string} filename - Filename
 */
export function downloadCSV(csvContent, filename = 'assignments.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export assignments to PDF
 * Requires jspdf and jspdf-autotable packages
 * @param {Array} assignments - Array of assignment objects
 * @param {string} programName - Program name
 */
export async function exportAssignmentsToPDF(assignments, programName) {
    try {
        // Dynamic import to avoid loading if not needed
        const { jsPDF } = await import('jspdf');
        await import('jspdf-autotable');

        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text(`Assignment Report: ${programName}`, 14, 22);

        // Date
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        // Table
        const tableData = assignments.map(a => [
            a.student?.name || '',
            a.referent?.name || '',
            a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '',
            a.compatibility_score ? `${a.compatibility_score}%` : ''
        ]);

        doc.autoTable({
            startY: 35,
            head: [['Student', 'Referent', 'Assigned Date', 'Score']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] } // Indigo
        });

        // Save
        doc.save(`assignments-${programName.toLowerCase().replace(/\s+/g, '-')}.pdf`);

        return { success: true };
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        return { success: false, error: error.message };
    }
}

// ========================================
// UNDO/REDO MANAGEMENT
// ========================================

class UndoRedoManager {
    constructor(maxStackSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = maxStackSize;
    }

    /**
     * Push new state to undo stack
     * @param {Object} state - Current state
     */
    pushState(state) {
        this.undoStack.push(JSON.parse(JSON.stringify(state)));
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    }

    /**
     * Undo last action
     * @param {Object} currentState - Current state
     * @returns {Object|null} Previous state
     */
    undo(currentState) {
        if (this.undoStack.length === 0) return null;

        this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
        return this.undoStack.pop();
    }

    /**
     * Redo last undone action
     * @param {Object} currentState - Current state
     * @returns {Object|null} Next state
     */
    redo(currentState) {
        if (this.redoStack.length === 0) return null;

        this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
        return this.redoStack.pop();
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all stacks
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export const undoRedoManager = new UndoRedoManager();

// ========================================
// ASSIGNMENT HISTORY
// ========================================

/**
 * Get assignment history for a student
 * @param {string} studentId - Student UUID
 * @param {string} programId - Program UUID (optional)
 * @returns {Array} Assignment history
 */
export async function getAssignmentHistory(studentId, programId = null) {
    try {
        let query = supabase
            .from('assignment_history')
            .select(`
        *,
        student:users!assignment_history_student_id_fkey(name, email),
        referent:users!assignment_history_referent_id_fkey(name, email),
        program:programs(name),
        assigned_by_user:users!assignment_history_assigned_by_fkey(name)
      `)
            .eq('student_id', studentId)
            .order('assigned_at', { ascending: false });

        if (programId) {
            query = query.eq('program_id', programId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting assignment history:', error);
        return [];
    }
}
