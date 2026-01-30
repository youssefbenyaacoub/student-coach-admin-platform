import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatGradeStatus } from '../../utils/gradingUtils';
import { Clock, FileText, ChevronRight, GitCompare } from 'lucide-react';

export default function LivrableHistoryView({ submissionId, onVersionSelect }) {
    const [versions, setVersions] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [compareMode, setCompareMode] = useState(false);
    const [compareVersions, setCompareVersions] = useState([null, null]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVersionHistory = async () => {
            try {
                // Get current submission
                const { data: currentSubmission } = await supabase
                    .from('livrable_submissions')
                    .select('*')
                    .eq('id', submissionId)
                    .single();

                if (!currentSubmission) return;

                // Get all versions for this student and template
                const { data: allVersions, error } = await supabase
                    .from('livrable_submissions')
                    .select(`
            *,
            grade:livrable_grades(id, weighted_score, graded_at, overall_feedback),
            revision_request:revision_requests(id, feedback, created_at, status)
          `)
                    .eq('student_id', currentSubmission.student_id)
                    .eq('template_id', currentSubmission.template_id)
                    .order('version', { ascending: false });

                if (error) throw error;

                setVersions(allVersions || []);
                setSelectedVersion(allVersions?.[0] || null);
            } catch (error) {
                console.error('Error fetching version history:', error);
            } finally {
                setLoading(false);
            }
        };

        if (submissionId) {
            fetchVersionHistory();
        }
    }, [submissionId]);

    const handleVersionClick = (version) => {
        if (compareMode) {
            // In compare mode, select two versions
            if (!compareVersions[0]) {
                setCompareVersions([version, null]);
            } else if (!compareVersions[1] && version.id !== compareVersions[0].id) {
                setCompareVersions([compareVersions[0], version]);
                if (onVersionSelect) {
                    onVersionSelect({ compare: true, versions: [compareVersions[0], version] });
                }
            }
        } else {
            // Normal mode, just select one version
            setSelectedVersion(version);
            if (onVersionSelect) {
                onVersionSelect({ compare: false, version });
            }
        }
    };

    const toggleCompareMode = () => {
        setCompareMode(!compareMode);
        setCompareVersions([null, null]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Version History</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {versions.length} version{versions.length !== 1 ? 's' : ''} submitted
                        </p>
                    </div>
                    <button
                        onClick={toggleCompareMode}
                        className={`flex items-center px-4 py-2 rounded-md ${compareMode
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <GitCompare className="w-4 h-4 mr-2" />
                        {compareMode ? 'Exit Compare' : 'Compare Versions'}
                    </button>
                </div>

                {compareMode && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                            Select two versions to compare.
                            {compareVersions[0] && !compareVersions[1] && ' Select a second version.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="p-6">
                {versions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No version history available</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {versions.map((version, index) => {
                            const statusConfig = formatGradeStatus(version.status);
                            const isSelected = selectedVersion?.id === version.id;
                            const isCompareSelected = compareVersions.some(v => v?.id === version.id);
                            const isLatest = index === 0;

                            return (
                                <div
                                    key={version.id}
                                    onClick={() => handleVersionClick(version)}
                                    className={`relative pl-8 pb-4 cursor-pointer transition-all ${isSelected || isCompareSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                        } rounded-lg p-4 border-2 ${isSelected || isCompareSelected ? 'border-indigo-300' : 'border-transparent'
                                        }`}
                                >
                                    {/* Timeline Line */}
                                    {index < versions.length - 1 && (
                                        <div className="absolute left-7 top-12 bottom-0 w-0.5 bg-gray-300" />
                                    )}

                                    {/* Timeline Dot */}
                                    <div className={`absolute left-4 top-6 w-4 h-4 rounded-full border-2 ${isSelected || isCompareSelected
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'bg-white border-gray-300'
                                        }`} />

                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Version {version.version}
                                                </h3>
                                                {isLatest && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                        Latest
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                                    {statusConfig.icon} {statusConfig.text}
                                                </span>
                                            </div>

                                            <div className="space-y-1 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Submitted: {new Date(version.submitted_at).toLocaleString()}
                                                </div>
                                                <div className="flex items-center">
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    {version.file_name}
                                                </div>
                                            </div>

                                            {/* Grade Info */}
                                            {version.grade && version.grade.length > 0 && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-gray-700">Grade</span>
                                                        <span className="text-lg font-bold text-indigo-600">
                                                            {version.grade[0].weighted_score}/100
                                                        </span>
                                                    </div>
                                                    {version.grade[0].overall_feedback && (
                                                        <p className="text-sm text-gray-600 mt-2">
                                                            {version.grade[0].overall_feedback.substring(0, 150)}
                                                            {version.grade[0].overall_feedback.length > 150 && '...'}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Graded: {new Date(version.grade[0].graded_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Revision Request Info */}
                                            {version.revision_request && version.revision_request.length > 0 && (
                                                <div className="mt-3 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                                                    <div className="flex items-center mb-2">
                                                        <span className="text-sm font-medium text-yellow-800">
                                                            Revision Requested
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-yellow-700">
                                                        {version.revision_request[0].feedback.substring(0, 150)}
                                                        {version.revision_request[0].feedback.length > 150 && '...'}
                                                    </p>
                                                    <p className="text-xs text-yellow-600 mt-2">
                                                        {new Date(version.revision_request[0].created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <ChevronRight className={`w-5 h-5 ml-4 ${isSelected || isCompareSelected ? 'text-indigo-600' : 'text-gray-400'
                                            }`} />
                                    </div>

                                    {/* Compare Selection Indicator */}
                                    {compareMode && isCompareSelected && (
                                        <div className="absolute top-2 right-2">
                                            <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full">
                                                {compareVersions[0]?.id === version.id ? '1' : '2'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Compare View Info */}
            {compareMode && compareVersions[0] && compareVersions[1] && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Comparing:</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded border border-gray-200">
                            <div className="font-medium text-gray-900">Version {compareVersions[0].version}</div>
                            <div className="text-gray-600 text-xs mt-1">
                                {new Date(compareVersions[0].submitted_at).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded border border-gray-200">
                            <div className="font-medium text-gray-900">Version {compareVersions[1].version}</div>
                            <div className="text-gray-600 text-xs mt-1">
                                {new Date(compareVersions[1].submitted_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
