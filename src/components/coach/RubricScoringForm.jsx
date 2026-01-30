import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { calculateWeightedScore, validateRubricScores, saveGradeDraft, loadGradeDraft } from '../../utils/gradingUtils';
import { Save, Send, AlertCircle, CheckCircle } from 'lucide-react';

export default function RubricScoringForm({
    submissionId,
    rubricId,
    onSubmit,
    readOnly = false
}) {
    const [rubric, setRubric] = useState(null);
    const [scores, setScores] = useState({});
    const [criterionFeedback, setCriterionFeedback] = useState({});
    const [overallFeedback, setOverallFeedback] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState([]);
    const [lastSaved, setLastSaved] = useState(null);

    // Load rubric
    useEffect(() => {
        const fetchRubric = async () => {
            try {
                const { data, error } = await supabase
                    .from('grading_rubrics')
                    .select('*')
                    .eq('id', rubricId)
                    .single();

                if (error) throw error;
                setRubric(data);

                // Initialize scores
                const criteria = Array.isArray(data.criteria_json)
                    ? data.criteria_json
                    : JSON.parse(data.criteria_json);

                const initialScores = {};
                criteria.forEach(c => {
                    initialScores[c.id] = '';
                });
                setScores(initialScores);
            } catch (error) {
                console.error('Error fetching rubric:', error);
            } finally {
                setLoading(false);
            }
        };

        if (rubricId) {
            fetchRubric();
        }
    }, [rubricId]);

    // Load existing grade or draft
    useEffect(() => {
        const loadExistingData = async () => {
            // First try to load existing grade
            try {
                const { data: existingGrade } = await supabase
                    .from('livrable_grades')
                    .select('*')
                    .eq('submission_id', submissionId)
                    .single();

                if (existingGrade) {
                    const scoresData = typeof existingGrade.scores_json === 'string'
                        ? JSON.parse(existingGrade.scores_json)
                        : existingGrade.scores_json;

                    const feedbackData = typeof existingGrade.criterion_feedback_json === 'string'
                        ? JSON.parse(existingGrade.criterion_feedback_json)
                        : existingGrade.criterion_feedback_json;

                    setScores(scoresData);
                    setCriterionFeedback(feedbackData || {});
                    setOverallFeedback(existingGrade.overall_feedback || '');
                    return;
                }
            } catch (error) {
                // No existing grade, try draft
            }

            // Load draft from local storage
            const draft = loadGradeDraft(submissionId);
            if (draft) {
                setScores(draft.scores || {});
                setCriterionFeedback(draft.criterionFeedback || {});
                setOverallFeedback(draft.overallFeedback || '');
                setLastSaved(new Date(draft.savedAt));
            }
        };

        if (submissionId && rubric) {
            loadExistingData();
        }
    }, [submissionId, rubric]);

    // Auto-save draft
    useEffect(() => {
        if (!submissionId || readOnly) return;

        const timer = setTimeout(() => {
            saveGradeDraft(submissionId, {
                scores,
                criterionFeedback,
                overallFeedback
            });
            setLastSaved(new Date());
        }, 2000); // Auto-save after 2 seconds of inactivity

        return () => clearTimeout(timer);
    }, [scores, criterionFeedback, overallFeedback, submissionId, readOnly]);

    // Calculate weighted score
    const weightedScore = useMemo(() => {
        if (!rubric) return 0;
        return calculateWeightedScore(scores, rubric);
    }, [scores, rubric]);

    // Get criteria
    const criteria = useMemo(() => {
        if (!rubric) return [];
        return Array.isArray(rubric.criteria_json)
            ? rubric.criteria_json
            : JSON.parse(rubric.criteria_json);
    }, [rubric]);

    // Handle score change
    const handleScoreChange = (criterionId, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        setScores(prev => ({ ...prev, [criterionId]: numValue }));
    };

    // Handle feedback change
    const handleFeedbackChange = (criterionId, value) => {
        setCriterionFeedback(prev => ({ ...prev, [criterionId]: value }));
    };

    // Validate and submit
    const handleSubmit = async () => {
        // Validate scores
        const validation = validateRubricScores(scores, rubric);
        if (!validation.valid) {
            setErrors(validation.errors);
            return;
        }

        setErrors([]);
        setSaving(true);

        try {
            if (onSubmit) {
                await onSubmit({
                    rubricId,
                    scores,
                    overallFeedback,
                    criterionFeedback
                });
            }
        } catch (error) {
            console.error('Error submitting grade:', error);
            alert('Failed to submit grade');
        } finally {
            setSaving(false);
        }
    };

    // Manual save draft
    const handleSaveDraft = () => {
        saveGradeDraft(submissionId, {
            scores,
            criterionFeedback,
            overallFeedback
        });
        setLastSaved(new Date());
    };

    // Get score color
    const getScoreColor = (score, maxScore) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!rubric) {
        return (
            <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No rubric found for this submission</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{rubric.name}</h2>
                        {rubric.description && (
                            <p className="mt-1 text-gray-600">{rubric.description}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Weighted Score</div>
                        <div className={`text-4xl font-bold ${getScoreColor(weightedScore, 100)}`}>
                            {weightedScore.toFixed(1)}
                            <span className="text-2xl text-gray-400">/100</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${weightedScore}%` }}
                        />
                    </div>
                </div>

                {/* Last Saved */}
                {lastSaved && !readOnly && (
                    <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                        Draft saved {lastSaved.toLocaleTimeString()}
                    </div>
                )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                {errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Criteria */}
            <div className="space-y-4">
                {criteria.map((criterion, index) => {
                    const score = scores[criterion.id];
                    const feedback = criterionFeedback[criterion.id] || '';
                    const weight = criterion.weight * 100;

                    return (
                        <div key={criterion.id} className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {index + 1}. {criterion.name}
                                    </h3>
                                    {criterion.description && (
                                        <p className="mt-1 text-sm text-gray-600">{criterion.description}</p>
                                    )}
                                    <div className="mt-2 text-sm text-gray-500">
                                        Weight: {weight.toFixed(0)}% • Max Score: {criterion.maxScore}
                                    </div>
                                </div>
                            </div>

                            {/* Score Input */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Score (0-{criterion.maxScore})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={criterion.maxScore}
                                        step="0.5"
                                        value={score}
                                        onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                                        disabled={readOnly}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-lg font-medium disabled:bg-gray-100"
                                        placeholder="Enter score"
                                    />
                                    {score !== '' && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-gray-600">Contribution to final score:</span>
                                                <span className={`font-medium ${getScoreColor(score, criterion.maxScore)}`}>
                                                    {(score * criterion.weight).toFixed(1)} points
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${(score / criterion.maxScore) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Feedback (optional)
                                    </label>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => handleFeedbackChange(criterion.id, e.target.value)}
                                        disabled={readOnly}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                        rows="3"
                                        placeholder="Specific feedback for this criterion..."
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Overall Feedback */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Feedback</h3>
                <textarea
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    disabled={readOnly}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    rows="6"
                    placeholder="Provide comprehensive feedback on the overall submission..."
                />
                <p className="mt-2 text-sm text-gray-500">
                    This feedback will be shared with the student along with the scores.
                </p>
            </div>

            {/* Actions */}
            {!readOnly && (
                <div className="flex items-center justify-between bg-white rounded-lg shadow p-6">
                    <button
                        onClick={handleSaveDraft}
                        className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Draft
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Submit Grade
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
