import { useDraggable } from '@dnd-kit/core';
import { User, Briefcase, Globe, TrendingUp } from 'lucide-react';

export default function StudentCard({ student, compatibilityScore, isDragging = false, showScore = false }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `student-${student.id}`,
        data: {
            type: 'student',
            student
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab'
    } : {
        cursor: 'grab'
    };

    // Get project domain from metadata
    const projectDomain = student.metadata?.project_domain || 'Not specified';
    const language = student.metadata?.language || 'Not specified';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-all ${isDragging ? 'border-indigo-400 shadow-lg' : 'border-gray-200'
                }`}
        >
            <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {student.avatar_url ? (
                        <img
                            src={student.avatar_url}
                            alt={student.name}
                            className="w-12 h-12 rounded-full"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-indigo-600" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {student.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{student.email}</p>

                    {/* Project Domain */}
                    <div className="mt-2 flex items-center text-xs text-gray-600">
                        <Briefcase className="w-3 h-3 mr-1" />
                        <span className="truncate">{projectDomain}</span>
                    </div>

                    {/* Language */}
                    <div className="mt-1 flex items-center text-xs text-gray-600">
                        <Globe className="w-3 h-3 mr-1" />
                        <span>{language}</span>
                    </div>
                </div>

                {/* Compatibility Score */}
                {showScore && compatibilityScore !== undefined && (
                    <div className="flex-shrink-0">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${compatibilityScore >= 80 ? 'bg-green-100' :
                                compatibilityScore >= 60 ? 'bg-yellow-100' :
                                    'bg-red-100'
                            }`}>
                            <div className="text-center">
                                <div className={`text-sm font-bold ${compatibilityScore >= 80 ? 'text-green-700' :
                                        compatibilityScore >= 60 ? 'text-yellow-700' :
                                            'text-red-700'
                                    }`}>
                                    {Math.round(compatibilityScore)}
                                </div>
                                <div className="text-xs text-gray-500">%</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Drag Indicator */}
            {!isDragging && (
                <div className="mt-2 text-center text-xs text-gray-400">
                    Drag to assign
                </div>
            )}
        </div>
    );
}
