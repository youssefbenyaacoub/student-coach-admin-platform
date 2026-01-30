import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    lockSubmission,
    unlockSubmission,
    submitGrade,
    approveAndAdvance,
    canGradeSubmission
} from '../../utils/gradingUtils';
import { useGradingShortcuts } from '../../hooks/useGradingShortcuts';
import PDFViewerWithAnnotations from '../../components/coach/PDFViewerWithAnnotations';
import RubricScoringForm from '../../components/coach/RubricScoringForm';
import LivrableHistoryView from '../../components/coach/LivrableHistoryView';
import RevisionRequestModal from '../../components/coach/RevisionRequestModal';
import {
    ArrowLeft, FileText, User, Calendar, CheckCircle,
    RotateCcw, ThumbsUp, History, AlertCircle, Lock
} from 'lucide-react';

export default function GradingInterface() {
    const { submissionId } = useParams();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('grade'); // 'grade', 'history'
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [lockError, setLockError] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Fetch submission data
    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const { data, error } = await supabase
                    .from('livrable_submissions')
                    .select(`
            *,
            student:users!livrable_submissions_student_id_fkey(id, name, email, avatar_url),
            template:livrable_templates(id, name, phase, phase_name, rubric_id),
            program:programs(id, name),
            grade:livrable_grades(id, weighted_score, graded_at, overall_feedback),
            locked_user:users!livrable_submissions_locked_by_fkey(name)
          `)
                    .eq('id', submissionId)
                    .single();

                if (error) throw error;
                setSubmission(data);

                // Try to lock submission
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const canGrade = canGradeSubmission(data, user.id);
                    if (canGrade.canGrade) {
                        const lockResult = await lockSubmission(submissionId);
                        if (!lockResult.success) {
                            setLockError(lockResult.error);
                        }
                    } else {
                        setLockError(canGrade.reason);
                    }
                }
            } catch (error) {
                console.error('Error fetching submission:', error);
                alert('Failed to load submission');
                navigate('/coach/grading');
            } finally {
                setLoading(false);
            }
        };

        if (submissionId) {
            fetchSubmission();
        }

        // Cleanup: unlock on unmount
        return () => {
            if (submissionId) {
                unlockSubmission(submissionId);
            }
        };
    }, [submissionId, navigate]);

    // Handle grade submission
    const handleSubmitGrade = async (gradeData) => {
        setProcessing(true);
        try {
            const result = await submitGrade(
                submissionId,
                gradeData.rubricId,
                gradeData.scores,
                gradeData.overallFeedback,
                gradeData.criterionFeedback
            );

            if (result.success) {
                alert(`Grade submitted successfully! Score: ${result.weighted_score}/100`);
                navigate('/coach/grading');
            } else {
                alert('Failed to submit grade: ' + result.error);
            }
        } catch (error) {
            console.error('Error submitting grade:', error);
            alert('Failed to submit grade');
        } finally {
            setProcessing(false);
        }
    };

    // Handle revision request
    const handleRevisionRequest = () => {
        setShowRevisionModal(true);
    };

    // Handle approve and advance
    const handleApproveAndAdvance = async () => {
        if (!confirm('Approve this submission and advance student to next phase?')) {
            return;
        }

        setProcessing(true);
        try {
            const result = await approveAndAdvance(submissionId);
            if (result.success) {
                alert(result.next_phase_available
                    ? 'Submission approved! Student advanced to next phase.'
                    : 'Submission approved!');
                navigate('/coach/grading');
            } else {
                alert('Failed to approve submission: ' + result.error);
            }
        } catch (error) {
            console.error('Error approving submission:', error);
            alert('Failed to approve submission');
        } finally {
            setProcessing(false);
        }
    };

    // Keyboard shortcuts
    useGradingShortcuts({
        onRequestRevision: handleRevisionRequest,
        onApproveAdvance: handleApproveAndAdvance,
        onCancel: () => navigate('/coach/grading')
    }, !showRevisionModal);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Submission not found</h2>
                    <button
                        onClick={() => navigate('/coach/grading')}
                        className="mt-4 text-indigo-600 hover:text-indigo-700"
                    >
                        Return to dashboard
                    </button>
                </div>
            </div>
        );
    }

    const isGraded = submission.status === 'graded' || submission.status === 'approved';

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/coach/grading')}
                            className="p-2 hover:bg-gray-100 rounded-md"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {submission.template?.name || 'Grading Interface'}
                            </h1>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <User className="w-4 h-4 mr-1" />
                                    {submission.student?.name}
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {new Date(submission.submitted_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                    <FileText className="w-4 h-4 mr-1" />
                                    Version {submission.version}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                        {!lockError && !isGraded && (
                            <>
                                <button
                                    onClick={handleRevisionRequest}
                                    disabled={processing}
                                    className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Request Revision
                                </button>
                                <button
                                    onClick={handleApproveAndAdvance}
                                    disabled={processing}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    <ThumbsUp className="w-4 h-4 mr-2" />
                                    Approve & Advance
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Lock Warning */}
                {lockError && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
                        <Lock className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-yellow-800">Read-Only Mode</h3>
                            <p className="text-sm text-yellow-700 mt-1">{lockError}</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex space-x-4 mt-4 border-t pt-4">
                    <button
                        onClick={() => setActiveTab('grade')}
                        className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'grade'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Grade Submission
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'history'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <History className="w-4 h-4 mr-2" />
                        Version History
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'grade' ? (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                        {/* Left: PDF Viewer */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <PDFViewerWithAnnotations
                                fileUrl={submission.file_url}
                                submissionId={submission.id}
                                readOnly={!!lockError}
                            />
                        </div>

                        {/* Right: Grading Form */}
                        <div className="overflow-y-auto">
                            <RubricScoringForm
                                submissionId={submission.id}
                                rubricId={submission.template?.rubric_id}
                                onSubmit={handleSubmitGrade}
                                readOnly={!!lockError}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full p-6">
                        <LivrableHistoryView
                            submissionId={submission.id}
                            onVersionSelect={(data) => {
                                // Handle version selection
                                console.log('Version selected:', data);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Revision Request Modal */}
            <RevisionRequestModal
                submissionId={submission.id}
                studentName={submission.student?.name}
                deliverableName={submission.template?.name}
                isOpen={showRevisionModal}
                onClose={() => setShowRevisionModal(false)}
                onSuccess={() => {
                    alert('Revision request sent successfully!');
                    navigate('/coach/grading');
                }}
            />
        </div>
    );
}
