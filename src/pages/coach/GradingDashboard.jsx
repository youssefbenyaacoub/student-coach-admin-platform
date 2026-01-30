import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatGradeStatus } from '../../utils/gradingUtils';
import { useNavigate } from 'react-router-dom';
import {
    Filter, Search, Calendar, User, FileText,
    ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';

export default function GradingDashboard() {
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        phase: 'all',
        dateFrom: '',
        dateTo: ''
    });

    // Sort state
    const [sortConfig, setSortConfig] = useState({
        key: 'submitted_at',
        direction: 'desc'
    });

    // Fetch submissions
    const fetchSubmissions = async () => {
        try {
            setRefreshing(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get programs where user is a coach
            const { data: coachPrograms } = await supabase
                .from('program_coaches')
                .select('program_id')
                .eq('coach_id', user.id);

            if (!coachPrograms || coachPrograms.length === 0) {
                setSubmissions([]);
                return;
            }

            const programIds = coachPrograms.map(p => p.program_id);

            // Fetch submissions with student and template info
            const { data, error } = await supabase
                .from('livrable_submissions')
                .select(`
          *,
          student:users!livrable_submissions_student_id_fkey(id, name, email, avatar_url),
          template:livrable_templates(id, name, phase, phase_name),
          program:programs(id, name),
          grade:livrable_grades(id, weighted_score, graded_at)
        `)
                .in('program_id', programIds)
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            setSubmissions(data || []);
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();

        // Subscribe to real-time updates
        const subscription = supabase
            .channel('livrable_submissions_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'livrable_submissions' },
                () => {
                    fetchSubmissions();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Filter and sort submissions
    const filteredAndSortedSubmissions = useMemo(() => {
        let result = [...submissions];

        // Apply filters
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(sub =>
                sub.student?.name?.toLowerCase().includes(searchLower) ||
                sub.template?.name?.toLowerCase().includes(searchLower) ||
                sub.file_name?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.status !== 'all') {
            result = result.filter(sub => sub.status === filters.status);
        }

        if (filters.phase !== 'all') {
            result = result.filter(sub => sub.template?.phase === parseInt(filters.phase));
        }

        if (filters.dateFrom) {
            result = result.filter(sub =>
                new Date(sub.submitted_at) >= new Date(filters.dateFrom)
            );
        }

        if (filters.dateTo) {
            result = result.filter(sub =>
                new Date(sub.submitted_at) <= new Date(filters.dateTo)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'student':
                    aVal = a.student?.name || '';
                    bVal = b.student?.name || '';
                    break;
                case 'submitted_at':
                    aVal = new Date(a.submitted_at);
                    bVal = new Date(b.submitted_at);
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                case 'phase':
                    aVal = a.template?.phase || 0;
                    bVal = b.template?.phase || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [submissions, filters, sortConfig]);

    // Handle sort
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Get unique phases for filter
    const availablePhases = useMemo(() => {
        const phases = new Set(submissions.map(s => s.template?.phase).filter(Boolean));
        return Array.from(phases).sort();
    }, [submissions]);

    // Stats
    const stats = useMemo(() => {
        return {
            total: submissions.length,
            new: submissions.filter(s => s.status === 'new').length,
            inReview: submissions.filter(s => s.status === 'in_review').length,
            needsRevision: submissions.filter(s => s.status === 'needs_revision').length,
            graded: submissions.filter(s => s.status === 'graded').length
        };
    }, [submissions]);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ?
            <ChevronUp className="w-4 h-4 inline ml-1" /> :
            <ChevronDown className="w-4 h-4 inline ml-1" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Grading Dashboard</h1>
                <p className="mt-2 text-gray-600">Review and grade student submissions</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-gray-500">Total</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-blue-50 rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-blue-600">New</div>
                    <div className="mt-2 text-3xl font-bold text-blue-900">{stats.new}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-yellow-600">In Review</div>
                    <div className="mt-2 text-3xl font-bold text-yellow-900">{stats.inReview}</div>
                </div>
                <div className="bg-red-50 rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-red-600">Needs Revision</div>
                    <div className="mt-2 text-3xl font-bold text-red-900">{stats.needsRevision}</div>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-green-600">Graded</div>
                    <div className="mt-2 text-3xl font-bold text-green-900">{stats.graded}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Filter className="w-5 h-5 mr-2" />
                        Filters
                    </h2>
                    <button
                        onClick={fetchSubmissions}
                        disabled={refreshing}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Search className="w-4 h-4 inline mr-1" />
                            Search
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Student name, deliverable..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="new">New</option>
                            <option value="in_review">In Review</option>
                            <option value="graded">Graded</option>
                            <option value="needs_revision">Needs Revision</option>
                            <option value="approved">Approved</option>
                        </select>
                    </div>

                    {/* Phase */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phase
                        </label>
                        <select
                            value={filters.phase}
                            onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">All Phases</option>
                            {availablePhases.map(phase => (
                                <option key={phase} value={phase}>Phase {phase}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            From
                        </label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            To
                        </label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Clear Filters */}
                {(filters.search || filters.status !== 'all' || filters.phase !== 'all' || filters.dateFrom || filters.dateTo) && (
                    <div className="mt-4">
                        <button
                            onClick={() => setFilters({ search: '', status: 'all', phase: 'all', dateFrom: '', dateTo: '' })}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    onClick={() => handleSort('student')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                >
                                    <User className="w-4 h-4 inline mr-1" />
                                    Student
                                    <SortIcon columnKey="student" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Deliverable
                                </th>
                                <th
                                    onClick={() => handleSort('phase')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                >
                                    Phase
                                    <SortIcon columnKey="phase" />
                                </th>
                                <th
                                    onClick={() => handleSort('submitted_at')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                >
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Submitted
                                    <SortIcon columnKey="submitted_at" />
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                >
                                    Status
                                    <SortIcon columnKey="status" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Score
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <p className="text-lg font-medium">No submissions found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedSubmissions.map((submission) => {
                                    const statusConfig = formatGradeStatus(submission.status);
                                    return (
                                        <tr
                                            key={submission.id}
                                            onClick={() => navigate(`/coach/grading/${submission.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {submission.student?.avatar_url ? (
                                                        <img
                                                            src={submission.student.avatar_url}
                                                            alt={submission.student.name}
                                                            className="w-10 h-10 rounded-full mr-3"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                                            <span className="text-indigo-600 font-medium">
                                                                {submission.student?.name?.charAt(0) || '?'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {submission.student?.name || 'Unknown'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {submission.student?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {submission.template?.name || 'Unknown'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {submission.file_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-900">
                                                    Phase {submission.template?.phase || '?'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(submission.submitted_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                                    <span className="mr-1">{statusConfig.icon}</span>
                                                    {statusConfig.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {submission.grade?.[0]?.weighted_score ? (
                                                    <span className="font-medium">
                                                        {submission.grade[0].weighted_score}/100
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/coach/grading/${submission.id}`);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Grade
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results count */}
            {filteredAndSortedSubmissions.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Showing {filteredAndSortedSubmissions.length} of {submissions.length} submissions
                </div>
            )}
        </div>
    );
}
