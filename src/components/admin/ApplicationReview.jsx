import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { CheckCircle, XCircle, Clock, Star } from 'lucide-react'

export default function ApplicationReview({ cohortId }) {
    const [applications, setApplications] = useState([])
    const [selectedApp, setSelectedApp] = useState(null)
    const [filter, setFilter] = useState('submitted')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchApplications()
    }, [cohortId, filter])

    const fetchApplications = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('cohort_applications')
            .select('*, users(full_name, email)')
            .eq('cohort_id', cohortId)
            .eq('status', filter)
            .order('submitted_at', { ascending: false })

        if (!error) setApplications(data || [])
        setLoading(false)
    }

    const updateApplicationStatus = async (applicationId, newStatus) => {
        const { error } = await supabase
            .from('cohort_applications')
            .update({
                status: newStatus,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', applicationId)

        if (!error) {
            fetchApplications()
            setSelectedApp(null)
        }
    }

    const submitEvaluation = async (applicationId, scores, recommendation) => {
        const { error } = await supabase.rpc('evaluate_application', {
            p_application_id: applicationId,
            p_scores: scores,
            p_recommendation: recommendation
        })

        if (!error) {
            updateApplicationStatus(applicationId, 'under_review')
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Application Review</h1>

            <div className="flex gap-2 mb-6">
                {['submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12">Loading applications...</div>
            ) : applications.length === 0 ? (
                <Card className="p-12 text-center text-slate-500">
                    No applications with status "{filter}"
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                        {applications.map(app => (
                            <ApplicationCard
                                key={app.id}
                                application={app}
                                isSelected={selectedApp?.id === app.id}
                                onClick={() => setSelectedApp(app)}
                            />
                        ))}
                    </div>

                    <div className="lg:col-span-2">
                        {selectedApp ? (
                            <ApplicationDetail
                                application={selectedApp}
                                onAccept={() => updateApplicationStatus(selectedApp.id, 'accepted')}
                                onReject={() => updateApplicationStatus(selectedApp.id, 'rejected')}
                                onWaitlist={() => updateApplicationStatus(selectedApp.id, 'waitlisted')}
                                onEvaluate={submitEvaluation}
                            />
                        ) : (
                            <Card className="p-12 text-center text-slate-500">
                                Select an application to review
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function ApplicationCard({ application, isSelected, onClick }) {
    return (
        <Card
            className={`p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                }`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        {application.users?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {application.users?.email}
                    </p>
                </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">
                Submitted {new Date(application.submitted_at).toLocaleDateString()}
            </div>
        </Card>
    )
}

function ApplicationDetail({ application, onAccept, onReject, onWaitlist, onEvaluate }) {
    const [scores, setScores] = useState({
        innovation: 0,
        feasibility: 0,
        passion: 0,
        fit: 0
    })
    const [recommendation, setRecommendation] = useState('maybe')

    const handleEvaluate = () => {
        onEvaluate(application.id, scores, recommendation)
    }

    return (
        <Card className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {application.users?.full_name}
                </h2>
                <p className="text-slate-600 dark:text-slate-400">{application.users?.email}</p>
            </div>

            <div className="space-y-6 mb-8">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Application Responses</h3>
                    <div className="space-y-4">
                        {Object.entries(application.responses || {}).map(([key, value]) => (
                            <div key={key} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-slate-900 dark:text-white">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Evaluation Rubric</h3>
                    <div className="space-y-3">
                        {Object.keys(scores).map(criterion => (
                            <div key={criterion}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                        {criterion}
                                    </span>
                                    <span className="text-sm font-bold text-blue-600">{scores[criterion]}/10</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={scores[criterion]}
                                    onChange={(e) => setScores({ ...scores, [criterion]: parseInt(e.target.value) })}
                                    className="w-full"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recommendation</h3>
                    <div className="flex gap-2">
                        {['strong_accept', 'accept', 'maybe', 'reject'].map(rec => (
                            <button
                                key={rec}
                                onClick={() => setRecommendation(rec)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${recommendation === rec
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                            >
                                {rec.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
                <Button onClick={handleEvaluate} variant="secondary" className="flex-1">
                    <Star size={16} className="mr-2" /> Save Evaluation
                </Button>
                <Button onClick={onAccept} className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle size={16} className="mr-2" /> Accept
                </Button>
                <Button onClick={onWaitlist} variant="secondary" className="flex-1">
                    <Clock size={16} className="mr-2" /> Waitlist
                </Button>
                <Button onClick={onReject} className="flex-1 bg-red-600 hover:bg-red-700">
                    <XCircle size={16} className="mr-2" /> Reject
                </Button>
            </div>
        </Card>
    )
}
