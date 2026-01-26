import { useState } from 'react'
import { Plus, Trash2, Save, X } from 'lucide-react'
import Card from '../common/Card'
import Button from '../common/Button'
import Modal from '../common/Modal'

/**
 * Conditional Rules Editor for Admin
 * Visual editor for creating branching logic rules
 */
export default function ConditionalRulesEditor({ templateId, existingRules, onSave, onDelete }) {
    const [rules, setRules] = useState(existingRules || [])
    const [editingRule, setEditingRule] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const eventTypes = [
        { value: 'task_failed', label: 'Task Failed (Rejected)' },
        { value: 'task_approved', label: 'Task Approved' },
        { value: 'quality_below_threshold', label: 'Quality Below Threshold' },
        { value: 'quality_above_threshold', label: 'Quality Above Threshold' },
    ]

    const actionTypes = [
        { value: 'inject_tasks', label: 'Inject Additional Tasks' },
        { value: 'skip_tasks', label: 'Skip Tasks' },
        { value: 'change_difficulty', label: 'Change Difficulty Level' },
        { value: 'send_notification', label: 'Send Notification' },
        { value: 'advance_stage', label: 'Advance to Next Stage' },
    ]

    const handleAddRule = () => {
        setEditingRule({
            id: null,
            ruleName: '',
            description: '',
            isActive: true,
            triggerCondition: {
                event: 'task_failed',
                taskType: '',
                stageName: '',
                qualityThreshold: 0.7,
            },
            actionType: 'inject_tasks',
            actionConfig: {
                tasks: [],
            },
            priority: 0,
        })
        setIsModalOpen(true)
    }

    const handleEditRule = (rule) => {
        setEditingRule({ ...rule })
        setIsModalOpen(true)
    }

    const handleSaveRule = () => {
        if (editingRule.id) {
            // Update existing
            setRules(rules.map((r) => (r.id === editingRule.id ? editingRule : r)))
        } else {
            // Add new
            setRules([...rules, { ...editingRule, id: `temp-${Date.now()}` }])
        }
        setIsModalOpen(false)
        setEditingRule(null)

        if (onSave) {
            onSave(editingRule)
        }
    }

    const handleDeleteRule = (ruleId) => {
        setRules(rules.filter((r) => r.id !== ruleId))
        if (onDelete) {
            onDelete(ruleId)
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Conditional Branching Rules</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Define automatic actions based on student performance
                    </p>
                </div>
                <Button onClick={handleAddRule} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                </Button>
            </div>

            {/* Rules List */}
            {rules.length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                    <p>No conditional rules defined yet.</p>
                    <p className="text-sm mt-2">Add rules to enable adaptive branching based on student performance.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <Card key={rule.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-semibold text-slate-900 dark:text-white">{rule.ruleName}</h4>
                                        {!rule.isActive && (
                                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    {rule.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{rule.description}</p>
                                    )}
                                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
                                            When: {eventTypes.find((e) => e.value === rule.triggerCondition.event)?.label}
                                        </span>
                                        <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">
                                            Then: {actionTypes.find((a) => a.value === rule.actionType)?.label}
                                        </span>
                                        {rule.priority > 0 && (
                                            <span className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded">
                                                Priority: {rule.priority}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditRule(rule)}
                                        className="p-2 text-slate-600 hover:text-student-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingRule && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setEditingRule(null)
                    }}
                    title={editingRule.id ? 'Edit Conditional Rule' : 'Create Conditional Rule'}
                    size="large"
                >
                    <div className="space-y-4">
                        {/* Rule Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Rule Name *
                            </label>
                            <input
                                type="text"
                                value={editingRule.ruleName}
                                onChange={(e) => setEditingRule({ ...editingRule, ruleName: e.target.value })}
                                placeholder="e.g., Inject remediation tasks on MVP failure"
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={editingRule.description}
                                onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                                placeholder="Explain what this rule does..."
                                rows={2}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        {/* Trigger Condition */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Trigger Condition (When)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Event Type *
                                    </label>
                                    <select
                                        value={editingRule.triggerCondition.event}
                                        onChange={(e) =>
                                            setEditingRule({
                                                ...editingRule,
                                                triggerCondition: { ...editingRule.triggerCondition, event: e.target.value },
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                                    >
                                        {eventTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {(editingRule.triggerCondition.event === 'quality_below_threshold' ||
                                    editingRule.triggerCondition.event === 'quality_above_threshold') && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Quality Threshold
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={editingRule.triggerCondition.qualityThreshold || 0.7}
                                                onChange={(e) =>
                                                    setEditingRule({
                                                        ...editingRule,
                                                        triggerCondition: {
                                                            ...editingRule.triggerCondition,
                                                            qualityThreshold: parseFloat(e.target.value),
                                                        },
                                                    })
                                                }
                                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Action */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Action (Then)</h4>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Action Type *
                                </label>
                                <select
                                    value={editingRule.actionType}
                                    onChange={(e) => setEditingRule({ ...editingRule, actionType: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                                >
                                    {actionTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Priority & Active */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Priority (higher = executes first)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editingRule.priority}
                                    onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                                <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <input
                                        type="checkbox"
                                        checked={editingRule.isActive}
                                        onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                                        className="w-4 h-4 text-student-primary"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
                                </label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                                onClick={() => {
                                    setIsModalOpen(false)
                                    setEditingRule(null)
                                }}
                                variant="secondary"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRule} disabled={!editingRule.ruleName}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Rule
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
