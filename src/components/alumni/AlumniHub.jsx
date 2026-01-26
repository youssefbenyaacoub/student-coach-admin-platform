import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { Users, Briefcase, Award, TrendingUp, MessageCircle } from 'lucide-react'

export default function AlumniHub() {
    const [alumni, setAlumni] = useState([])
    const [jobs, setJobs] = useState([])
    const [stories, setStories] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAlumni()
        fetchJobs()
        fetchStories()
    }, [filter])

    const fetchAlumni = async () => {
        setLoading(true)
        let query = supabase
            .from('alumni_profiles')
            .select('*, users(full_name, avatar_url)')
            .order('graduated_at', { ascending: false })

        if (filter === 'mentors') {
            query = query.eq('available_for_mentoring', true)
        } else if (filter === 'speakers') {
            query = query.eq('available_for_speaking', true)
        }

        const { data, error } = await query
        if (!error) setAlumni(data || [])
        setLoading(false)
    }

    const fetchJobs = async () => {
        const { data } = await supabase
            .from('job_board')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5)

        setJobs(data || [])
    }

    const fetchStories = async () => {
        const { data } = await supabase
            .from('success_stories')
            .select('*, users(full_name, avatar_url)')
            .eq('is_published', true)
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(3)

        setStories(data || [])
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Alumni Network</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Connect with graduates and access exclusive opportunities
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={Users} label="Alumni" value={alumni.length} color="blue" />
                <StatCard icon={Briefcase} label="Active Jobs" value={jobs.length} color="green" />
                <StatCard icon={Award} label="Success Stories" value={stories.length} color="purple" />
                <StatCard icon={TrendingUp} label="Total Funding" value="$2.5M" color="orange" />
            </div>

            {/* Success Stories */}
            {stories.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Success Stories</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {stories.map(story => (
                            <StoryCard key={story.id} story={story} />
                        ))}
                    </div>
                </div>
            )}

            {/* Job Board */}
            {jobs.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Job Board</h2>
                        <Button variant="secondary" size="sm">View All</Button>
                    </div>
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                </div>
            )}

            {/* Alumni Directory */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Alumni Directory</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('mentors')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'mentors'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            Mentors
                        </button>
                        <button
                            onClick={() => setFilter('speakers')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'speakers'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            Speakers
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alumni.map(alum => (
                            <AlumniCard key={alum.user_id} alumni={alum} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    }

    return (
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
                </div>
            </div>
        </Card>
    )
}

function AlumniCard({ alumni }) {
    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {alumni.users?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">{alumni.users?.full_name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{alumni.current_role}</p>
                    <p className="text-xs text-slate-500">{alumni.current_company}</p>
                </div>
            </div>

            {alumni.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {alumni.bio}
                </p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
                {alumni.available_for_mentoring && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                        Mentor
                    </span>
                )}
                {alumni.available_for_speaking && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                        Speaker
                    </span>
                )}
                {alumni.company_stage && (
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                        {alumni.company_stage}
                    </span>
                )}
            </div>

            <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1">
                    View Profile
                </Button>
                <Button size="sm" className="flex-1">
                    <MessageCircle size={14} className="mr-1" /> Connect
                </Button>
            </div>
        </Card>
    )
}

function StoryCard({ story }) {
    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
                <Award className="text-yellow-500 mb-2" size={32} />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{story.title}</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                {story.story}
            </p>
            <Button size="sm" variant="secondary" className="w-full">
                Read More
            </Button>
        </Card>
    )
}

function JobCard({ job }) {
    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{job.job_title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{job.company_name}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                    {job.job_type?.replace('_', ' ')}
                </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                {job.job_description}
            </p>
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{job.location}</span>
                <Button size="sm">Apply</Button>
            </div>
        </Card>
    )
}
