import { useState } from 'react'
import { ExternalLink, Video, BookOpen, FileText, HelpCircle } from 'lucide-react'
import QuizComponent from './QuizComponent'
import Card from '../common/Card'

/**
 * Smart Content Item Renderer
 * Displays appropriate component based on content type and subtype
 */
export default function ContentItemRenderer({ content, quizQuestions, onQuizSubmit, existingProgress }) {
    const [showContent, setShowContent] = useState(false)

    if (!content) return null

    const renderIcon = () => {
        switch (content.contentType) {
            case 'video':
                return <Video className="w-5 h-5" />
            case 'course':
                return <BookOpen className="w-5 h-5" />
            case 'article':
                return <FileText className="w-5 h-5" />
            default:
                return <ExternalLink className="w-5 h-5" />
        }
    }

    const renderContent = () => {
        // Quiz content
        if (content.contentSubtype === 'quiz' && quizQuestions && quizQuestions.length > 0) {
            return (
                <div className="mt-4">
                    <QuizComponent
                        questions={quizQuestions}
                        onSubmit={onQuizSubmit}
                        existingResponses={existingProgress?.quizResponses}
                        readOnly={existingProgress?.isCompleted}
                    />
                </div>
            )
        }

        // Challenge content
        if (content.contentSubtype === 'challenge') {
            return (
                <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <div className="text-center">
                        <HelpCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Interactive Challenge</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            {content.description || 'Complete this challenge to test your skills'}
                        </p>
                        <a
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-student-primary text-white rounded-lg hover:bg-student-primary/90 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open Challenge
                        </a>
                    </div>
                </div>
            )
        }

        // Video content
        if (content.contentType === 'video') {
            // Try to embed YouTube videos
            const youtubeMatch = content.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
            if (youtubeMatch) {
                return (
                    <div className="mt-4 aspect-video rounded-lg overflow-hidden bg-black">
                        <iframe
                            src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                            title={content.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    </div>
                )
            }

            // Fallback to link
            return (
                <div className="mt-4">
                    <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-student-primary hover:underline"
                    >
                        <Video className="w-4 h-4" />
                        Watch Video
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )
        }

        // Course content (embedded iframe)
        if (content.contentType === 'course') {
            return (
                <div className="mt-4">
                    <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-student-primary text-white rounded-lg hover:bg-student-primary/90 transition-colors"
                    >
                        <BookOpen className="w-4 h-4" />
                        Open Course
                        <ExternalLink className="w-4 h-4" />
                    </a>
                    {content.provider && (
                        <p className="text-xs text-slate-500 mt-2">Provider: {content.provider}</p>
                    )}
                </div>
            )
        }

        // Article or link
        return (
            <div className="mt-4">
                <a
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-student-primary hover:underline"
                >
                    {renderIcon()}
                    {content.contentType === 'article' ? 'Read Article' : 'Open Link'}
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        )
    }

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <div
                className="p-4 bg-gradient-to-r from-student-primary/10 to-student-primary/5 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:from-student-primary/15 hover:to-student-primary/10 transition-colors"
                onClick={() => setShowContent(!showContent)}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            {renderIcon()}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{content.title}</h4>
                            {content.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                    {content.description}
                                </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                {content.provider && <span>📚 {content.provider}</span>}
                                {content.durationMinutes && <span>⏱️ {content.durationMinutes} min</span>}
                                {content.difficultyLevel && (
                                    <span className={`px-2 py-0.5 rounded-full ${content.difficultyLevel === 'beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                            content.difficultyLevel === 'advanced' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        }`}>
                                        {content.difficultyLevel}
                                    </span>
                                )}
                                {content.contentSubtype === 'quiz' && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                        📝 Quiz
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {existingProgress?.isCompleted && (
                            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                                ✓ Completed
                                {existingProgress.quizScore != null && ` (${Math.round(existingProgress.quizScore)}%)`}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Body (expandable) */}
            {showContent && (
                <div className="p-4">
                    {renderContent()}
                </div>
            )}
        </Card>
    )
}
