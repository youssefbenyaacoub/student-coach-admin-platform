import { useState, useRef } from 'react';
import { Download, FileText, Image, Table, Calendar } from 'lucide-react';
import { exportChartAsPNG, exportToCSV, exportToExcel, exportToPDF } from '../../utils/analyticsUtils';

export default function ExportToolbar({ data, chartRefs = [], reportData = {} }) {
    const [showMenu, setShowMenu] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleExportPNG = async () => {
        if (chartRefs.length === 0) {
            alert('No charts available to export');
            return;
        }

        setExporting(true);
        try {
            for (let i = 0; i < chartRefs.length; i++) {
                if (chartRefs[i].current) {
                    await exportChartAsPNG(chartRefs[i].current, `chart-${i + 1}.png`);
                }
            }
        } catch (error) {
            console.error('Error exporting charts:', error);
            alert('Failed to export charts');
        } finally {
            setExporting(false);
            setShowMenu(false);
        }
    };

    const handleExportCSV = () => {
        if (!data || data.length === 0) {
            alert('No data available to export');
            return;
        }

        setExporting(true);
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            exportToCSV(data, `analytics-${timestamp}.csv`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Failed to export CSV');
        } finally {
            setExporting(false);
            setShowMenu(false);
        }
    };

    const handleExportExcel = async () => {
        if (!data || data.length === 0) {
            alert('No data available to export');
            return;
        }

        setExporting(true);
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            await exportToExcel(data, `analytics-${timestamp}.xlsx`);
        } catch (error) {
            console.error('Error exporting Excel:', error);
            alert('Failed to export Excel');
        } finally {
            setExporting(false);
            setShowMenu(false);
        }
    };

    const handleExportPDF = async () => {
        if (!reportData || Object.keys(reportData).length === 0) {
            alert('No report data available');
            return;
        }

        setExporting(true);
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            await exportToPDF(reportData, `analytics-report-${timestamp}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF');
        } finally {
            setExporting(false);
            setShowMenu(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export'}
            </button>

            {showMenu && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                        <div className="py-1">
                            <button
                                onClick={handleExportPNG}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Image className="w-4 h-4 mr-3 text-gray-400" />
                                Export Charts as PNG
                            </button>

                            <button
                                onClick={handleExportCSV}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Table className="w-4 h-4 mr-3 text-gray-400" />
                                Export Data as CSV
                            </button>

                            <button
                                onClick={handleExportExcel}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <FileText className="w-4 h-4 mr-3 text-gray-400" />
                                Export Data as Excel
                            </button>

                            <div className="border-t border-gray-200 my-1"></div>

                            <button
                                onClick={handleExportPDF}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <FileText className="w-4 h-4 mr-3 text-gray-400" />
                                Generate PDF Report
                            </button>

                            <div className="border-t border-gray-200 my-1"></div>

                            <button
                                onClick={() => {
                                    alert('Scheduled reports feature coming soon!');
                                    setShowMenu(false);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                                Schedule Report
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
