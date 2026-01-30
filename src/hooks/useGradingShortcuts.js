/**
 * useGradingShortcuts Hook
 * Keyboard shortcuts for faster grading workflow
 */

import { useEffect, useCallback } from 'react';

/**
 * Custom hook for grading keyboard shortcuts
 * @param {Object} handlers - Object with handler functions
 * @param {Function} handlers.onSaveDraft - Save draft handler
 * @param {Function} handlers.onSubmitGrade - Submit grade handler
 * @param {Function} handlers.onRequestRevision - Request revision handler
 * @param {Function} handlers.onApproveAdvance - Approve and advance handler
 * @param {Function} handlers.onPreviousSubmission - Previous submission handler
 * @param {Function} handlers.onNextSubmission - Next submission handler
 * @param {Function} handlers.onToggleAnnotation - Toggle annotation mode handler
 * @param {Function} handlers.onCancel - Cancel/close handler
 * @param {boolean} enabled - Whether shortcuts are enabled (default: true)
 */
export function useGradingShortcuts(handlers = {}, enabled = true) {
    const {
        onSaveDraft,
        onSubmitGrade,
        onRequestRevision,
        onApproveAdvance,
        onPreviousSubmission,
        onNextSubmission,
        onToggleAnnotation,
        onCancel
    } = handlers;

    const handleKeyDown = useCallback((event) => {
        // Don't trigger shortcuts when typing in input fields
        const target = event.target;
        const isInputField = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? event.metaKey : event.ctrlKey;

        // Ctrl/Cmd + S - Save draft
        if (modKey && event.key === 's') {
            event.preventDefault();
            if (onSaveDraft) {
                onSaveDraft();
            }
            return;
        }

        // Ctrl/Cmd + Enter - Submit grade
        if (modKey && event.key === 'Enter') {
            event.preventDefault();
            if (onSubmitGrade) {
                onSubmitGrade();
            }
            return;
        }

        // Ctrl/Cmd + R - Request revision
        if (modKey && event.key === 'r') {
            event.preventDefault();
            if (onRequestRevision) {
                onRequestRevision();
            }
            return;
        }

        // Ctrl/Cmd + A - Approve and advance (only when not in input field)
        if (modKey && event.key === 'a' && !isInputField) {
            event.preventDefault();
            if (onApproveAdvance) {
                onApproveAdvance();
            }
            return;
        }

        // Ctrl/Cmd + [ - Previous submission
        if (modKey && event.key === '[') {
            event.preventDefault();
            if (onPreviousSubmission) {
                onPreviousSubmission();
            }
            return;
        }

        // Ctrl/Cmd + ] - Next submission
        if (modKey && event.key === ']') {
            event.preventDefault();
            if (onNextSubmission) {
                onNextSubmission();
            }
            return;
        }

        // Ctrl/Cmd + / - Toggle annotation mode
        if (modKey && event.key === '/') {
            event.preventDefault();
            if (onToggleAnnotation) {
                onToggleAnnotation();
            }
            return;
        }

        // Escape - Cancel/close
        if (event.key === 'Escape') {
            if (onCancel) {
                onCancel();
            }
            return;
        }
    }, [
        onSaveDraft,
        onSubmitGrade,
        onRequestRevision,
        onApproveAdvance,
        onPreviousSubmission,
        onNextSubmission,
        onToggleAnnotation,
        onCancel
    ]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, enabled]);

    // Return keyboard shortcut help text
    const isMac = typeof navigator !== 'undefined' &&
        navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKeySymbol = isMac ? '⌘' : 'Ctrl';

    return {
        shortcuts: [
            { key: `${modKeySymbol} + S`, description: 'Save draft' },
            { key: `${modKeySymbol} + Enter`, description: 'Submit grade' },
            { key: `${modKeySymbol} + R`, description: 'Request revision' },
            { key: `${modKeySymbol} + A`, description: 'Approve and advance' },
            { key: `${modKeySymbol} + [`, description: 'Previous submission' },
            { key: `${modKeySymbol} + ]`, description: 'Next submission' },
            { key: `${modKeySymbol} + /`, description: 'Toggle annotation mode' },
            { key: 'Esc', description: 'Cancel/close' }
        ],
        modKeySymbol
    };
}

export default useGradingShortcuts;
