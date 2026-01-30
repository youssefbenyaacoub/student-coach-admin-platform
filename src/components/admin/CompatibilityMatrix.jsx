import { useState, useEffect } from 'react';
import { calculateAllCompatibilityScores } from '../../utils/assignmentUtils';
import { ArrowUpDown, Info } from 'lucide-react';

export default function CompatibilityMatrix({ students, referents, onAssign }) {
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState(null); // { studentId, ascending }
    const [hoveredCell, setHoveredCell] = useState(null);

    // Calculate all compatibility scores
    useEffect(() => {
        const calculateScores = async () => {
            setLoading(true);
            const allScores = {};

            for (const student of students) {
                const studentScores = await calculateAllCompatibilityScores(student, referents);
                allScores[student.id] = studentScores;
            }

            setScores(allScores);
            setLoading(false);
        };

        if (students.length > 0 && referents.length > 0) {
            calculateScores();
        }
    }, [students, referents]);

    // Get color for score
    const getScoreColor = (score) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        if (score >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getScoreTextColor = (score) => {
        if (score >= 80) return 'text-green-900';
        if (score >= 60) return 'text-yellow-900';
        if (score >= 40) return 'text-orange-900';
        return 'text-red-900';
    };

    // Sort referents by score for a student
    const getSortedReferents = (studentId) => {
        if (!sortBy || sortBy.studentId !== studentId) {
            return referents;
        }

        return [...referents].sort((a, b) => {
            const scoreA = scores[studentId]?.[a.id] || 0;
            const scoreB = scores[studentId]?.[b.id] || 0;
            return sortBy.ascending ? scoreA - scoreB : scoreB - scoreA;
        });
    };

    // Handle sort toggle
    const toggleSort = (studentId) => {
        if (sortBy?.studentId === studentId) {
            setSortBy({ studentId, ascending: !sortBy.ascending });
        } else {
            setSortBy({ studentId, ascending: false }); // Start with descending (best matches first)
        }
    };

    // Handle cell click
    const handleCellClick = (studentId, referentId) => {
        if (onAssign) {
            onAssign(studentId, referentId);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Compatibility Matrix</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Click a cell to assign student to referent
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Info className="w-4 h-4" />
                    <span>Higher scores = Better match</span>
                </div>
            </div>

            {/* Matrix */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                Student
                            </th>
                            {referents.map((referent) => (
                                <th
                                    key={referent.id}
                                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                                >
                                    <div className="truncate" title={referent.name}>
                                        {referent.name}
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Best Match
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => {
                            const studentScores = scores[student.id] || {};
                            const sortedReferents = getSortedReferents(student.id);
                            const bestScore = Math.max(...Object.values(studentScores));
                            const bestReferentId = Object.keys(studentScores).find(
                                id => studentScores[id] === bestScore
                            );

                            return (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    {/* Student Name */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                        <div className="flex items-center space-x-2">
                                            <span className="truncate max-w-[150px]" title={student.name}>
                                                {student.name}
                                            </span>
                                            <button
                                                onClick={() => toggleSort(student.id)}
                                                className="p-1 hover:bg-gray-100 rounded"
                                                title="Sort by score"
                                            >
                                                <ArrowUpDown className="w-3 h-3 text-gray-400" />
                                            </button>
                                        </div>
                                    </td>

                                    {/* Score Cells */}
                                    {sortedReferents.map((referent) => {
                                        const score = studentScores[referent.id] || 0;
                                        const isBest = referent.id === bestReferentId;
                                        const isHovered = hoveredCell?.studentId === student.id &&
                                            hoveredCell?.referentId === referent.id;

                                        return (
                                            <td
                                                key={referent.id}
                                                className="px-4 py-3 text-center cursor-pointer transition-all"
                                                onClick={() => handleCellClick(student.id, referent.id)}
                                                onMouseEnter={() => setHoveredCell({ studentId: student.id, referentId: referent.id })}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            >
                                                <div
                                                    className={`inline-flex items-center justify-center w-16 h-8 rounded font-semibold text-sm transition-all ${isHovered ? 'scale-110 shadow-lg' : ''
                                                        } ${isBest ? 'ring-2 ring-indigo-500' : ''
                                                        }`}
                                                    style={{
                                                        backgroundColor: `rgba(${score >= 80 ? '34, 197, 94' :
                                                                score >= 60 ? '234, 179, 8' :
                                                                    score >= 40 ? '251, 146, 60' :
                                                                        '239, 68, 68'
                                                            }, ${0.1 + (score / 100) * 0.7})`,
                                                        color: score >= 80 ? 'rgb(34, 197, 94)' :
                                                            score >= 60 ? 'rgb(234, 179, 8)' :
                                                                score >= 40 ? 'rgb(251, 146, 60)' :
                                                                    'rgb(239, 68, 68)'
                                                    }}
                                                >
                                                    {Math.round(score)}
                                                </div>
                                            </td>
                                        );
                                    })}

                                    {/* Best Match Indicator */}
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(bestScore)} bg-opacity-20 ${getScoreTextColor(bestScore)}`}>
                                                {Math.round(bestScore)}%
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 bg-opacity-50 rounded mr-2"></div>
                    <span className="text-gray-600">Excellent (80-100)</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 bg-opacity-50 rounded mr-2"></div>
                    <span className="text-gray-600">Good (60-79)</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-500 bg-opacity-50 rounded mr-2"></div>
                    <span className="text-gray-600">Fair (40-59)</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 bg-opacity-50 rounded mr-2"></div>
                    <span className="text-gray-600">Poor (0-39)</span>
                </div>
            </div>
        </div>
    );
}
