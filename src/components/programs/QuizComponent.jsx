import { useState, useMemo } from 'react'
import { CheckCircle, XCircle, HelpCircle, Send } from 'lucide-react'
import Card from '../common/Card'
import Button from '../common/Button'

/**
 * Quiz Component for interactive assessments
 */
export default function QuizComponent({ questions, onSubmit, existingResponses, readOnly = false }) {
    const [responses, setResponses] = useState(existingResponses || {})
    const [submitted, setSubmitted] = useState(readOnly || !!existingResponses)
    const [showExplanations, setShowExplanations] = useState(readOnly)

    const handleAnswerChange = (questionId, answer) => {
        if (submitted) return
        setResponses((prev) => ({
            ...prev,
            [questionId]: answer,
        }))
    }

    const handleSubmit = () => {
        setSubmitted(true)
        setShowExplanations(true)
        if (onSubmit) {
            onSubmit(responses)
        }
    }

    const score = useMemo(() => {
        if (!submitted) return null

        let correct = 0
        let total = 0

        questions.forEach((q) => {
            total++
            const userAnswer = responses[q.id]
            const correctAnswer = q.correctAnswer

            // Check if answer is correct based on question type
            if (q.questionType === 'multiple_choice') {
                if (Array.isArray(correctAnswer)) {
                    // Multiple correct answers
                    const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer])
                    const correctSet = new Set(correctAnswer)
                    if (userSet.size === correctSet.size && [...userSet].every((a) => correctSet.has(a))) {
                        correct++
                    }
                } else {
                    if (userAnswer === correctAnswer) correct++
                }
            } else if (q.questionType === 'true_false') {
                if (userAnswer === correctAnswer) correct++
            } else if (q.questionType === 'short_answer') {
                // Case-insensitive comparison
                if (String(userAnswer || '').toLowerCase().trim() === String(correctAnswer || '').toLowerCase().trim()) {
                    correct++
                }
            }
        })

        return {
            correct,
            total,
            percentage: Math.round((correct / total) * 100),
            passed: (correct / total) >= 0.7,
        }
    }, [submitted, responses, questions])

    const isAnswerCorrect = (question) => {
        if (!submitted) return null

        const userAnswer = responses[question.id]
        const correctAnswer = question.correctAnswer

        if (question.questionType === 'multiple_choice') {
            if (Array.isArray(correctAnswer)) {
                const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer])
                const correctSet = new Set(correctAnswer)
                return userSet.size === correctSet.size && [...userSet].every((a) => correctSet.has(a))
            }
            return userAnswer === correctAnswer
        } else if (question.questionType === 'true_false') {
            return userAnswer === correctAnswer
        } else if (question.questionType === 'short_answer') {
            return String(userAnswer || '').toLowerCase().trim() === String(correctAnswer || '').toLowerCase().trim()
        }

        return false
    }

    if (!questions || questions.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No quiz questions available</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Score Display (if submitted) */}
            {submitted && score && (
                <Card className={`p-6 ${score.passed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {score.passed ? '✅ Quiz Passed!' : '📝 Quiz Completed'}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                You scored {score.correct} out of {score.total} ({score.percentage}%)
                            </p>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white">
                            {score.percentage}%
                        </div>
                    </div>
                </Card>
            )}

            {/* Questions */}
            <div className="space-y-4">
                {questions.map((question, idx) => {
                    const isCorrect = isAnswerCorrect(question)
                    const userAnswer = responses[question.id]

                    return (
                        <Card key={question.id} className="p-6">
                            {/* Question Header */}
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-student-primary/10 rounded-full flex items-center justify-center text-student-primary font-bold text-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900 dark:text-white">{question.questionText}</h4>
                                    {submitted && (
                                        <div className="mt-2 flex items-center gap-2">
                                            {isCorrect ? (
                                                <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Correct
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    Incorrect
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Answer Options */}
                            <div className="ml-11 space-y-2">
                                {question.questionType === 'multiple_choice' && (
                                    <div className="space-y-2">
                                        {question.options.map((option, optIdx) => {
                                            const isSelected = Array.isArray(userAnswer) ? userAnswer.includes(optIdx) : userAnswer === optIdx
                                            const isCorrectOption = Array.isArray(question.correctAnswer)
                                                ? question.correctAnswer.includes(optIdx)
                                                : question.correctAnswer === optIdx

                                            return (
                                                <label
                                                    key={optIdx}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${submitted
                                                            ? isCorrectOption
                                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                                : isSelected
                                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                                    : 'border-slate-200 dark:border-slate-700'
                                                            : isSelected
                                                                ? 'border-student-primary bg-student-primary/5'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-student-primary/50'
                                                        }`}
                                                >
                                                    <input
                                                        type={Array.isArray(question.correctAnswer) ? 'checkbox' : 'radio'}
                                                        name={`question-${question.id}`}
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            if (Array.isArray(question.correctAnswer)) {
                                                                // Multiple selection
                                                                const current = Array.isArray(userAnswer) ? userAnswer : []
                                                                const updated = current.includes(optIdx)
                                                                    ? current.filter((i) => i !== optIdx)
                                                                    : [...current, optIdx]
                                                                handleAnswerChange(question.id, updated)
                                                            } else {
                                                                // Single selection
                                                                handleAnswerChange(question.id, optIdx)
                                                            }
                                                        }}
                                                        disabled={submitted}
                                                        className="w-4 h-4 text-student-primary"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{option}</span>
                                                    {submitted && isCorrectOption && (
                                                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                                                    )}
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}

                                {question.questionType === 'true_false' && (
                                    <div className="flex gap-4">
                                        {[true, false].map((value) => (
                                            <label
                                                key={String(value)}
                                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${submitted
                                                        ? question.correctAnswer === value
                                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                            : userAnswer === value
                                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                                : 'border-slate-200 dark:border-slate-700'
                                                        : userAnswer === value
                                                            ? 'border-student-primary bg-student-primary/5'
                                                            : 'border-slate-200 dark:border-slate-700 hover:border-student-primary/50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${question.id}`}
                                                    checked={userAnswer === value}
                                                    onChange={() => handleAnswerChange(question.id, value)}
                                                    disabled={submitted}
                                                    className="w-4 h-4 text-student-primary"
                                                />
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {value ? 'True' : 'False'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {question.questionType === 'short_answer' && (
                                    <input
                                        type="text"
                                        value={userAnswer || ''}
                                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                        disabled={submitted}
                                        placeholder="Type your answer..."
                                        className={`w-full px-4 py-2 border-2 rounded-lg ${submitted
                                                ? isCorrect
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-slate-300 dark:border-slate-600 focus:border-student-primary'
                                            } dark:bg-slate-800 dark:text-white`}
                                    />
                                )}
                            </div>

                            {/* Explanation (shown after submission) */}
                            {submitted && showExplanations && question.explanation && (
                                <div className="ml-11 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        <strong className="text-blue-600 dark:text-blue-400">Explanation:</strong> {question.explanation}
                                    </p>
                                </div>
                            )}
                        </Card>
                    )
                })}
            </div>

            {/* Submit Button */}
            {!submitted && (
                <div className="flex justify-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={Object.keys(responses).length !== questions.length}
                        className="px-8"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Quiz
                    </Button>
                </div>
            )}
        </div>
    )
}
