import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { requestRevision, formatTemplateVariables } from '../../utils/gradingUtils';
import { X, Send, FileText, Calendar } from 'lucide-react';

export default function RevisionRequestModal({
    submissionId,
    studentName,
    deliverableName,
    isOpen,
    onClose,
    onSuccess
}) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [customFeedback, setCustomFeedback] = useState('');
    const [deadline, setDeadline] = useState('');
    const [sending, setSending] = useState(false);
    const [preview, setPreview] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // Load templates
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const { data, error } = await supabase
                    .from('revision_request_templates')
                    .select('*')
                    .eq('is_active', true)
                    .order('name');

                if (error) throw error;
                setTemplates(data || []);
            } catch (error) {
                console.error('Error fetching templates:', error);
            }
        };

        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    // Get current user info
    const [coachName, setCoachName] = useState('');
    useEffect(() => {
        const fetchCoachInfo = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', user.id)
                    .single();

                if (userData) {
                    setCoachName(userData.name);
                }
            }
        };

        fetchCoachInfo();
    }, []);

    // Update preview when template or custom feedback changes
    useEffect(() => {
        if (selectedTemplate) {
            const variables = {
                student_name: studentName || '[Student Name]',
                deliverable_name: deliverableName || '[Deliverable]',
                custom_feedback: customFeedback || '[Your feedback will appear here]',
                deadline: deadline ? new Date(deadline).toLocaleDateString() : '[Deadline]',
                coach_name: coachName || '[Your Name]'
            };

            const formattedText = formatTemplateVariables(selectedTemplate.template_text, variables);
            setPreview(formattedText);
        } else {
            setPreview(customFeedback);
        }
    }, [selectedTemplate, customFeedback, deadline, studentName, deliverableName, coachName]);

    // Handle template selection
    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setShowPreview(true);
    };

    // Handle send
    const handleSend = async () => {
        if (!customFeedback.trim() && !selectedTemplate) {
            alert('Please provide feedback or select a template');
            return;
        }

        setSending(true);

        try {
            const feedbackText = selectedTemplate ? preview : customFeedback;
            const deadlineDate = deadline ? new Date(deadline) : null;

            const result = await requestRevision(
                submissionId,
                feedbackText,
                selectedTemplate?.name || null,
                deadlineDate
            );

            if (result.success) {
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
                // Reset form
                setSelectedTemplate(null);
                setCustomFeedback('');
                setDeadline('');
                setShowPreview(false);
            } else {
                alert('Failed to send revision request: ' + result.error);
            }
        } catch (error) {
            console.error('Error sending revision request:', error);
            alert('Failed to send revision request');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                />

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    {/* Header */}
                    <div className="bg-white px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Request Revision</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                            Request revisions from {studentName} for {deliverableName}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-white px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column - Template Selection & Custom Feedback */}
                            <div className="space-y-4">
                                {/* Template Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FileText className="w-4 h-4 inline mr-1" />
                                        Select Template (Optional)
                                    </label>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {templates.map(template => (
                                            <div
                                                key={template.id}
                                                onClick={() => handleTemplateSelect(template)}
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedTemplate?.id === template.id
                                                        ? 'border-indigo-600 bg-indigo-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="font-medium text-gray-900">{template.name}</div>
                                                {template.description && (
                                                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                                                )}
                                                {template.category && (
                                                    <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                                        {template.category}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Feedback */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {selectedTemplate ? 'Additional Feedback' : 'Feedback'}
                                    </label>
                                    <textarea
                                        value={customFeedback}
                                        onChange={(e) => setCustomFeedback(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        rows="8"
                                        placeholder={selectedTemplate
                                            ? "Add specific details about what needs to be revised..."
                                            : "Describe what needs to be revised..."}
                                    />
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Deadline (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Right Column - Preview */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Preview
                                    </label>
                                    {selectedTemplate && (
                                        <button
                                            onClick={() => setSelectedTemplate(null)}
                                            className="text-sm text-indigo-600 hover:text-indigo-700"
                                        >
                                            Clear Template
                                        </button>
                                    )}
                                </div>
                                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-[500px] overflow-y-auto">
                                    {preview ? (
                                        <div className="whitespace-pre-wrap text-sm text-gray-700">
                                            {preview}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-12">
                                            <FileText className="w-12 h-12 mx-auto mb-2" />
                                            <p className="text-sm">Preview will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending || (!customFeedback.trim() && !selectedTemplate)}
                            className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Revision Request
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
