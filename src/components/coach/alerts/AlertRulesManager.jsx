import { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

export default function AlertRulesManager({ onClose }) {
    const { currentUser } = useAuth()
    const [rules, setRules] = useState([
        { type: 'inactivity', threshold_days: 7, is_active: true },
        { type: 'no_submission', threshold_days: 5, is_active: true },
        { type: 'deadline_approaching', threshold_days: 3, is_active: false }
    ])
    const [loading, setLoading] = useState(false)

    // TODO: Fetch existing rules from Supabase on mount

    const handleSave = async () => {
        setLoading(true)
        try {
            // upsert rules to 'alert_rules' table
            // const { error } = await supabase.from('alert_rules').upsert(
            //    rules.map(r => ({ ...r, coach_id: currentUser.id }))
            // )
            await new Promise(r => setTimeout(r, 800)) // Mock delay
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Alert Configuration</h3>
                    <p className="text-sm text-slate-500">Define when you want to be notified.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="space-y-4">
                {rules.map((rule, idx) => (
                    <div key={rule.type} className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-slate-700 capitalize">
                                    {rule.type.replace('_', ' ')}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={rule.is_active}
                                        onChange={e => {
                                            const newRules = [...rules]
                                            newRules[idx].is_active = e.target.checked
                                            setRules(newRules)
                                        }}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-slate-500">
                                Trigger when condition is met.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">Threshold:</span>
                            <div className="relative w-20">
                                <input
                                    type="number"
                                    min="1"
                                    value={rule.threshold_days}
                                    onChange={e => {
                                        const newRules = [...rules]
                                        newRules[idx].threshold_days = parseInt(e.target.value) || 0
                                        setRules(newRules)
                                    }}
                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">days</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    )
}
