import { Flame, Star, Trophy, Target } from 'lucide-react'
import Card from '../common/Card'
import { getBadgeIcon } from '../../utils/gamificationLogic'

export default function GamificationHub({ userStats, earnedBadges = [] }) {
    const streak = userStats?.currentStreak || 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Streak Card */}
            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none overflow-hidden relative">
                <div className="absolute right-[-20px] top-[-20px] opacity-20">
                    <Flame size={120} />
                </div>
                <div className="p-6 relative z-10">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <Flame size={20} />
                        <span className="font-semibold uppercase tracking-wider text-xs">Daily Streak</span>
                    </div>
                    <div className="text-5xl font-bold mb-1">{streak}</div>
                    <div className="text-sm opacity-80">Days on fire! Keep it up.</div>
                </div>
            </Card>

            {/* Badges Preview */}
            <Card className="md:col-span-2 p-6 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={20} />
                        Achievements
                    </h3>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">
                        {earnedBadges.length} Earned
                    </span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {earnedBadges.length === 0 ? (
                        <div className="text-sm text-slate-500 italic py-2">
                            Complete tasks to earn your first badge!
                        </div>
                    ) : (
                        earnedBadges.map((badge, i) => {
                            const Icon = getBadgeIcon(badge.icon_key)
                            return (
                                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1 w-20 group">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                                        <Icon size={24} />
                                    </div>
                                    <span className="text-[10px] text-center font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                                        {badge.name}
                                    </span>
                                </div>
                            )
                        })
                    )}

                    {/* Placeholder for locked badge */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 w-20 opacity-50">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-300">
                            <Lock size={20} />
                        </div>
                        <span className="text-[10px] text-center text-slate-400">Locked</span>
                    </div>
                </div>
            </Card>

            {/* Optional Leaderboard Teaser can go here */}
        </div>
    )
}

function Lock({ size }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    )
}
