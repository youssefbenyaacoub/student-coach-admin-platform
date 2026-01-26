import { motion, AnimatePresence } from 'framer-motion'
import { getBadgeIcon } from '../../utils/gamificationLogic'
import { X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Animated notification when a badge is earned
 */
export default function BadgeNotification({ badge, onClose }) {
    useEffect(() => {
        if (badge) {
            const timer = setTimeout(() => {
                onClose()
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [badge, onClose])

    if (!badge) return null

    const Icon = getBadgeIcon(badge.icon_key)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
            >
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border-2 border-yellow-400 dark:border-yellow-600">
                    <div className="p-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
                    <div className="p-4 flex items-start gap-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <Icon size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">Badge Unlocked!</h4>
                            <p className="font-semibold text-student-primary">{badge.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{badge.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
