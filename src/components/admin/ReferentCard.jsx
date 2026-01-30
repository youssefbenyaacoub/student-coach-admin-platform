import { useDroppable } from '@dnd-kit/core';
import { User, Users, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { getWorkloadColor } from '../../utils/assignmentUtils';

export default function ReferentCard({
    referent,
    workload,
    assignedStudents = [],
    onRemoveStudent,
    isOver = false
}) {
    const { setNodeRef } = useDroppable({
        id: `referent-${referent.id}`,
        data: {
            type: 'referent',
            referent
        }
    });

    const currentStudents = workload?.current_students || 0;
    const maxStudents = workload?.max_students || 10;
    const capacityPercentage = workload?.capacity_percentage || 0;
    const isOverloaded = workload?.is_overloaded || false;
    const isAtCapacity = workload?.is_at_capacity || false;

    // Get expertise domains
    const domains = referent.expertise?.domains || [];
    const languages = referent.expertise?.languages || [];

    return (
        <div
            ref={setNodeRef}
            className={`bg-white rounded-lg border-2 p-4 transition-all ${isOver ? 'border-indigo-500 bg-indigo-50 shadow-lg' :
                    isOverloaded ? 'border-red-300' :
                        isAtCapacity ? 'border-yellow-300' :
                            'border-gray-200'
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {referent.avatar_url ? (
                            <img
                                src={referent.avatar_url}
                                alt={referent.name}
                                className="w-12 h-12 rounded-full"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-purple-600" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {referent.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{referent.email}</p>

                        {/* Expertise Domains */}
                        {domains.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {domains.slice(0, 3).map((domain, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
                                    >
                                        {domain}
                                    </span>
                                ))}
                                {domains.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                        +{domains.length - 3} more
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Languages */}
                        {languages.length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                                🌐 {languages.join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Capacity Status Icon */}
                <div className="flex-shrink-0 ml-2">
                    {isOverloaded ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : isAtCapacity ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                </div>
            </div>

            {/* Workload Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        Workload
                    </span>
                    <span className={`font-medium ${getWorkloadColor(capacityPercentage).split(' ')[0]}`}>
                        {currentStudents}/{maxStudents}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${capacityPercentage >= 100 ? 'bg-red-500' :
                                capacityPercentage >= 80 ? 'bg-yellow-500' :
                                    'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    />
                </div>
                {isOverloaded && (
                    <p className="text-xs text-red-600 mt-1">
                        ⚠️ Overloaded by {currentStudents - maxStudents} student{currentStudents - maxStudents > 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Assigned Students List */}
            <div className="border-t border-gray-200 pt-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Assigned Students ({assignedStudents.length})
                </h4>
                {assignedStudents.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">
                        No students assigned yet
                    </p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {assignedStudents.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    {student.avatar_url ? (
                                        <img
                                            src={student.avatar_url}
                                            alt={student.name}
                                            className="w-6 h-6 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="w-3 h-3 text-gray-500" />
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-700 truncate">
                                        {student.name}
                                    </span>
                                </div>
                                {onRemoveStudent && (
                                    <button
                                        onClick={() => onRemoveStudent(student.id)}
                                        className="flex-shrink-0 ml-2 p-1 hover:bg-red-100 rounded transition-colors"
                                        title="Remove assignment"
                                    >
                                        <X className="w-3 h-3 text-red-600" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Drop Zone Indicator */}
            {isOver && (
                <div className="mt-3 text-center text-sm font-medium text-indigo-600">
                    Drop to assign
                </div>
            )}
        </div>
    );
}
