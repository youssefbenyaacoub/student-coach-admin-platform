/**
 * Grading Utilities
 * Helper functions for the livrable grading system
 */

import { supabase } from '../lib/supabase';

/**
 * Calculate weighted score from rubric scores
 * @param {Object} scores - Object with criterion IDs as keys and scores as values
 * @param {Object} rubric - Rubric object with criteria array
 * @returns {number} Weighted score (0-100)
 */
export function calculateWeightedScore(scores, rubric) {
    if (!scores || !rubric || !rubric.criteria_json) {
        return 0;
    }

    const criteria = Array.isArray(rubric.criteria_json)
        ? rubric.criteria_json
        : JSON.parse(rubric.criteria_json);

    let weightedScore = 0;
    let totalWeight = 0;

    criteria.forEach(criterion => {
        const score = scores[criterion.id] || 0;
        const weight = criterion.weight || 0;
        weightedScore += score * weight;
        totalWeight += weight;
    });

    // Normalize if weights don't sum to 1
    if (totalWeight > 0 && Math.abs(totalWeight - 1) > 0.01) {
        weightedScore = (weightedScore / totalWeight);
    }

    return Math.round(weightedScore * 100) / 100;
}

/**
 * Format grade status for display
 * @param {string} status - Status string
 * @returns {Object} Badge configuration {color, text, icon}
 */
export function formatGradeStatus(status) {
    const statusConfig = {
        new: {
            color: 'blue',
            text: 'New',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800',
            icon: '📝'
        },
        in_review: {
            color: 'yellow',
            text: 'In Review',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            icon: '👀'
        },
        graded: {
            color: 'green',
            text: 'Graded',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            icon: '✅'
        },
        needs_revision: {
            color: 'red',
            text: 'Needs Revision',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
            icon: '🔄'
        },
        approved: {
            color: 'purple',
            text: 'Approved',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-800',
            icon: '🎉'
        }
    };

    return statusConfig[status] || statusConfig.new;
}

/**
 * Check if user can grade a submission
 * @param {Object} submission - Submission object
 * @param {string} userId - Current user ID
 * @returns {Object} {canGrade: boolean, reason: string}
 */
export function canGradeSubmission(submission, userId) {
    if (!submission) {
        return { canGrade: false, reason: 'Submission not found' };
    }

    // Check if locked by someone else
    if (submission.locked_by && submission.locked_by !== userId) {
        const lockAge = new Date() - new Date(submission.locked_at);
        const lockTimeout = 30 * 60 * 1000; // 30 minutes

        if (lockAge < lockTimeout) {
            return {
                canGrade: false,
                reason: 'Currently being graded by another user',
                lockedBy: submission.locked_by
            };
        }
    }

    return { canGrade: true };
}

/**
 * Lock submission for grading
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object>} Result object
 */
export async function lockSubmission(submissionId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase.rpc('lock_submission_for_grading', {
            p_submission_id: submissionId,
            p_grader_id: user.id
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error locking submission:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Unlock submission
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object>} Result object
 */
export async function unlockSubmission(submissionId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase.rpc('unlock_submission', {
            p_submission_id: submissionId,
            p_grader_id: user.id
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error unlocking submission:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save grade draft to local storage
 * @param {string} submissionId - Submission ID
 * @param {Object} data - Draft data
 */
export function saveGradeDraft(submissionId, data) {
    try {
        const key = `grade_draft_${submissionId}`;
        localStorage.setItem(key, JSON.stringify({
            ...data,
            savedAt: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

/**
 * Load grade draft from local storage
 * @param {string} submissionId - Submission ID
 * @returns {Object|null} Draft data or null
 */
export function loadGradeDraft(submissionId) {
    try {
        const key = `grade_draft_${submissionId}`;
        const draft = localStorage.getItem(key);
        if (draft) {
            return JSON.parse(draft);
        }
    } catch (error) {
        console.error('Error loading draft:', error);
    }
    return null;
}

/**
 * Clear grade draft from local storage
 * @param {string} submissionId - Submission ID
 */
export function clearGradeDraft(submissionId) {
    try {
        const key = `grade_draft_${submissionId}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error clearing draft:', error);
    }
}

/**
 * Submit grade
 * @param {string} submissionId - Submission ID
 * @param {string} rubricId - Rubric ID
 * @param {Object} scores - Scores object
 * @param {string} overallFeedback - Overall feedback text
 * @param {Object} criterionFeedback - Criterion-specific feedback
 * @returns {Promise<Object>} Result object
 */
export async function submitGrade(submissionId, rubricId, scores, overallFeedback, criterionFeedback = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase.rpc('submit_grade', {
            p_submission_id: submissionId,
            p_grader_id: user.id,
            p_rubric_id: rubricId,
            p_scores_json: scores,
            p_overall_feedback: overallFeedback,
            p_criterion_feedback_json: criterionFeedback
        });

        if (error) throw error;

        // Clear draft after successful submission
        clearGradeDraft(submissionId);

        return data;
    } catch (error) {
        console.error('Error submitting grade:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Request revision
 * @param {string} submissionId - Submission ID
 * @param {string} feedback - Feedback text
 * @param {string} templateUsed - Template name (optional)
 * @param {Date} deadline - Deadline (optional)
 * @returns {Promise<Object>} Result object
 */
export async function requestRevision(submissionId, feedback, templateUsed = null, deadline = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase.rpc('request_revision', {
            p_submission_id: submissionId,
            p_requested_by: user.id,
            p_feedback: feedback,
            p_template_used: templateUsed,
            p_deadline: deadline?.toISOString()
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error requesting revision:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve and advance to next phase
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object>} Result object
 */
export async function approveAndAdvance(submissionId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase.rpc('approve_and_advance', {
            p_submission_id: submissionId,
            p_grader_id: user.id
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error approving submission:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get signed URL for PDF file
 * @param {string} filePath - File path in storage
 * @returns {Promise<string|null>} Signed URL or null
 */
export async function getSignedPdfUrl(filePath) {
    try {
        const { data, error } = await supabase.storage
            .from('livrable-submissions')
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) throw error;
        return data.signedUrl;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        return null;
    }
}

/**
 * Upload PDF submission
 * @param {File} file - PDF file
 * @param {string} studentId - Student ID
 * @param {string} submissionId - Submission ID
 * @param {number} version - Version number
 * @returns {Promise<Object>} Result object with file path
 */
export async function uploadPdfSubmission(file, studentId, submissionId, version) {
    try {
        const filePath = `${studentId}/${submissionId}/v${version}.pdf`;

        const { data, error } = await supabase.storage
            .from('livrable-submissions')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        return { success: true, filePath: data.path };
    } catch (error) {
        console.error('Error uploading PDF:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Format template variables in text
 * @param {string} template - Template text with variables
 * @param {Object} variables - Variables object
 * @returns {string} Formatted text
 */
export function formatTemplateVariables(template, variables) {
    let result = template;

    Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, variables[key] || '');
    });

    return result;
}

/**
 * Export grade report as text
 * @param {Object} submission - Submission object
 * @param {Object} grade - Grade object
 * @param {Object} rubric - Rubric object
 * @returns {string} Formatted report
 */
export function exportGradeReport(submission, grade, rubric) {
    const criteria = Array.isArray(rubric.criteria_json)
        ? rubric.criteria_json
        : JSON.parse(rubric.criteria_json);

    let report = `GRADE REPORT\n`;
    report += `${'='.repeat(50)}\n\n`;
    report += `Student: ${submission.student_name || 'N/A'}\n`;
    report += `Submission: ${submission.file_name}\n`;
    report += `Graded: ${new Date(grade.graded_at).toLocaleDateString()}\n`;
    report += `\n${'='.repeat(50)}\n\n`;

    report += `SCORES:\n`;
    report += `${'-'.repeat(50)}\n`;

    const scores = typeof grade.scores_json === 'string'
        ? JSON.parse(grade.scores_json)
        : grade.scores_json;

    criteria.forEach(criterion => {
        const score = scores[criterion.id] || 0;
        const weight = (criterion.weight * 100).toFixed(0);
        report += `${criterion.name}: ${score}/${criterion.maxScore} (Weight: ${weight}%)\n`;
    });

    report += `\nWeighted Score: ${grade.weighted_score}/100\n`;
    report += `\n${'='.repeat(50)}\n\n`;

    report += `OVERALL FEEDBACK:\n`;
    report += `${'-'.repeat(50)}\n`;
    report += `${grade.overall_feedback || 'No feedback provided'}\n`;

    return report;
}

/**
 * Validate rubric scores
 * @param {Object} scores - Scores object
 * @param {Object} rubric - Rubric object
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateRubricScores(scores, rubric) {
    const errors = [];

    if (!rubric || !rubric.criteria_json) {
        errors.push('Invalid rubric');
        return { valid: false, errors };
    }

    const criteria = Array.isArray(rubric.criteria_json)
        ? rubric.criteria_json
        : JSON.parse(rubric.criteria_json);

    criteria.forEach(criterion => {
        const score = scores[criterion.id];

        if (score === undefined || score === null || score === '') {
            errors.push(`Score required for: ${criterion.name}`);
        } else if (isNaN(score)) {
            errors.push(`Invalid score for: ${criterion.name}`);
        } else if (score < 0 || score > criterion.maxScore) {
            errors.push(`Score for ${criterion.name} must be between 0 and ${criterion.maxScore}`);
        }
    });

    return { valid: errors.length === 0, errors };
}
