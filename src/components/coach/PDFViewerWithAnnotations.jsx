import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, MessageSquare, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * PDF Viewer with Annotations
 * Note: This is a simplified version. For production, you'll need to install:
 * npm install pdfjs-dist react-pdf
 * 
 * This component provides a basic structure. Full PDF.js integration
 * requires additional setup with worker configuration.
 */

export default function PDFViewerWithAnnotations({
    fileUrl,
    submissionId,
    onAnnotationAdd,
    readOnly = false
}) {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [zoom, setZoom] = useState(1.0);
    const [annotationMode, setAnnotationMode] = useState(false);
    const [comments, setComments] = useState([]);
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [newComment, setNewComment] = useState({ text: '', x: 0, y: 0, page: 1 });
    const [loading, setLoading] = useState(true);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Load PDF URL
    useEffect(() => {
        const loadPdfUrl = async () => {
            if (!fileUrl) return;

            try {
                // If it's a storage path, get signed URL
                if (!fileUrl.startsWith('http')) {
                    const { data, error } = await supabase.storage
                        .from('livrable-submissions')
                        .createSignedUrl(fileUrl, 3600);

                    if (error) throw error;
                    setPdfUrl(data.signedUrl);
                } else {
                    setPdfUrl(fileUrl);
                }
            } catch (error) {
                console.error('Error loading PDF URL:', error);
            }
        };

        loadPdfUrl();
    }, [fileUrl]);

    // Load comments
    useEffect(() => {
        if (!submissionId) return;

        const fetchComments = async () => {
            try {
                const { data, error } = await supabase
                    .from('submission_comments')
                    .select(`
            *,
            creator:users!submission_comments_created_by_fkey(name, avatar_url)
          `)
                    .eq('submission_id', submissionId)
                    .eq('comment_type', 'annotation')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setComments(data || []);
            } catch (error) {
                console.error('Error fetching comments:', error);
            }
        };

        fetchComments();

        // Subscribe to real-time updates
        const subscription = supabase
            .channel(`comments_${submissionId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'submission_comments', filter: `submission_id=eq.${submissionId}` },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [submissionId]);

    // Handle canvas click for annotation
    const handleCanvasClick = (e) => {
        if (!annotationMode || readOnly) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100; // Percentage
        const y = ((e.clientY - rect.top) / rect.height) * 100; // Percentage

        setNewComment({ text: '', x, y, page: currentPage });
        setShowCommentForm(true);
    };

    // Save annotation
    const handleSaveAnnotation = async () => {
        if (!newComment.text.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('submission_comments')
                .insert({
                    submission_id: submissionId,
                    created_by: user.id,
                    text: newComment.text,
                    comment_type: 'annotation',
                    page_number: newComment.page,
                    coordinates: {
                        x: newComment.x,
                        y: newComment.y
                    }
                });

            if (error) throw error;

            setShowCommentForm(false);
            setNewComment({ text: '', x: 0, y: 0, page: currentPage });

            if (onAnnotationAdd) {
                onAnnotationAdd();
            }
        } catch (error) {
            console.error('Error saving annotation:', error);
            alert('Failed to save annotation');
        }
    };

    // Delete comment
    const handleDeleteComment = async (commentId) => {
        if (!confirm('Delete this comment?')) return;

        try {
            const { error } = await supabase
                .from('submission_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        }
    };

    // Zoom controls
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleFitWidth = () => setZoom(1.0);

    // Page navigation
    const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

    // Get comments for current page
    const currentPageComments = comments.filter(c => c.page_number === currentPage);

    return (
        <div className="flex h-full">
            {/* PDF Viewer */}
            <div className="flex-1 flex flex-col bg-gray-100">
                {/* Toolbar */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {/* Page Navigation */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center space-x-2 border-l pl-4">
                            <button
                                onClick={handleZoomOut}
                                className="p-2 rounded hover:bg-gray-100"
                            >
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-sm w-16 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="p-2 rounded hover:bg-gray-100"
                            >
                                <ZoomIn className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleFitWidth}
                                className="px-3 py-1 text-sm rounded hover:bg-gray-100"
                            >
                                Fit Width
                            </button>
                        </div>
                    </div>

                    {/* Annotation Toggle */}
                    {!readOnly && (
                        <button
                            onClick={() => setAnnotationMode(!annotationMode)}
                            className={`flex items-center px-4 py-2 rounded-md ${annotationMode
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {annotationMode ? 'Annotation Mode ON' : 'Add Annotations'}
                        </button>
                    )}
                </div>

                {/* PDF Canvas */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto p-8 flex items-center justify-center"
                >
                    <div className="relative bg-white shadow-lg" style={{ transform: `scale(${zoom})` }}>
                        {pdfUrl ? (
                            <div className="relative">
                                {/* Placeholder for PDF rendering */}
                                {/* In production, use PDF.js here */}
                                <iframe
                                    src={`${pdfUrl}#page=${currentPage}`}
                                    className="w-full h-[800px] border-0"
                                    title="PDF Viewer"
                                    onLoad={() => setLoading(false)}
                                />

                                {/* Annotation Overlay */}
                                <div
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    className={`absolute inset-0 ${annotationMode ? 'cursor-crosshair' : ''}`}
                                    style={{ pointerEvents: annotationMode ? 'auto' : 'none' }}
                                >
                                    {/* Render annotation markers */}
                                    {currentPageComments.map(comment => {
                                        const coords = typeof comment.coordinates === 'string'
                                            ? JSON.parse(comment.coordinates)
                                            : comment.coordinates;

                                        return (
                                            <div
                                                key={comment.id}
                                                className="absolute w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-600 cursor-pointer hover:scale-110 transition-transform"
                                                style={{
                                                    left: `${coords.x}%`,
                                                    top: `${coords.y}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                title={comment.text}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-[800px] flex items-center justify-center bg-gray-50">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading PDF...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments Sidebar */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Comments ({currentPageComments.length})
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Page {currentPage}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {currentPageComments.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No comments on this page</p>
                            {!readOnly && (
                                <p className="text-xs mt-1">Click "Add Annotations" to start</p>
                            )}
                        </div>
                    ) : (
                        currentPageComments.map(comment => (
                            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center">
                                        {comment.creator?.avatar_url ? (
                                            <img
                                                src={comment.creator.avatar_url}
                                                alt={comment.creator.name}
                                                className="w-6 h-6 rounded-full mr-2"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                                                <span className="text-xs text-indigo-600">
                                                    {comment.creator?.name?.charAt(0) || '?'}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-gray-900">
                                            {comment.creator?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    {!readOnly && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700">{comment.text}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(comment.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* New Comment Form */}
                {showCommentForm && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Add Comment</h4>
                        <textarea
                            value={newComment.text}
                            onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                            placeholder="Enter your comment..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            rows="3"
                            autoFocus
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button
                                onClick={() => setShowCommentForm(false)}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAnnotation}
                                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
