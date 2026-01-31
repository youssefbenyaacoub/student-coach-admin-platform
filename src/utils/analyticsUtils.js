import { supabase } from '../lib/supabase';
import { startOfDay, endOfDay, subDays, subMonths, format } from 'date-fns';

/**
 * Analytics Utilities
 * Functions for fetching, aggregating, and exporting analytics data
 */

// ========================================
// DATA FETCHING
// ========================================

/**
 * Fetch usage statistics for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Usage statistics
 */
export async function fetchUsageStatistics(startDate, endDate) {
    try {
        const { data, error } = await supabase.rpc('get_usage_statistics', {
            p_start_date: format(startDate, 'yyyy-MM-dd'),
            p_end_date: format(endDate, 'yyyy-MM-dd')
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching usage statistics:', error);
        return [];
    }
}

/**
 * Fetch project progress metrics
 * @param {string} programId - Program UUID (optional)
 * @returns {Array} Project progress data
 */
export async function fetchProjectProgress(programId = null) {
    try {
        const { data, error } = await supabase.rpc('get_project_progress', {
            p_program_id: programId
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching project progress:', error);
        return [];
    }
}

/**
 * Fetch user engagement scores
 * @param {string} role - Filter by role (optional)
 * @returns {Array} Engagement scores
 */
export async function fetchEngagementScores(role = null) {
    try {
        let query = supabase
            .from('user_engagement_scores')
            .select('*')
            .order('engagement_score', { ascending: false });

        if (role) {
            query = query.eq('role', role);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching engagement scores:', error);
        return [];
    }
}

/**
 * Fetch platform health metrics
 * @returns {Object} Platform health data
 */
export async function fetchPlatformHealth() {
    try {
        const { data, error } = await supabase
            .from('platform_health_metrics')
            .select('*')
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;
        return data || {};
    } catch (error) {
        console.error('Error fetching platform health:', error);
        return {};
    }
}

/**
 * Get real-time active users count
 * @returns {Array} Active users by role
 */
export async function getActiveUsersRealtime() {
    try {
        const { data, error } = await supabase.rpc('get_active_users_realtime');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting active users:', error);
        return [];
    }
}

/**
 * Fetch feature adoption rates
 * @returns {Array} Feature adoption data
 */
export async function fetchFeatureAdoption() {
    try {
        const { data, error } = await supabase
            .from('feature_adoption_rates')
            .select('*');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching feature adoption:', error);
        return [];
    }
}

/**
 * Fetch message response times
 * @param {number} days - Number of days to fetch
 * @returns {Array} Response time data
 */
export async function fetchMessageResponseTimes(days = 30) {
    try {
        const { data, error } = await supabase
            .from('message_response_times')
            .select('*')
            .order('message_date', { ascending: false })
            .limit(days);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching response times:', error);
        return [];
    }
}

// ========================================
// DATA AGGREGATION
// ========================================

/**
 * Aggregate data by time period
 * @param {Array} data - Raw data array
 * @param {string} dateField - Field containing date
 * @param {string} valueField - Field to aggregate
 * @param {string} groupBy - 'day', 'week', 'month'
 * @returns {Array} Aggregated data
 */
export function aggregateByTimePeriod(data, dateField, valueField, groupBy = 'day') {
    const grouped = {};

    data.forEach(item => {
        const date = new Date(item[dateField]);
        let key;

        switch (groupBy) {
            case 'week':
                const weekStart = startOfDay(subDays(date, date.getDay()));
                key = format(weekStart, 'yyyy-MM-dd');
                break;
            case 'month':
                key = format(date, 'yyyy-MM');
                break;
            default:
                key = format(date, 'yyyy-MM-dd');
        }

        if (!grouped[key]) {
            grouped[key] = { date: key, value: 0, count: 0 };
        }

        grouped[key].value += item[valueField] || 0;
        grouped[key].count += 1;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate trend direction and percentage
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {Object} Trend data
 */
export function calculateTrend(current, previous) {
    if (!previous || previous === 0) {
        return { direction: 'neutral', percentage: 0, change: current };
    }

    const change = current - previous;
    const percentage = ((change / previous) * 100).toFixed(1);

    return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        percentage: Math.abs(parseFloat(percentage)),
        change: change
    };
}

/**
 * Calculate moving average
 * @param {Array} data - Data array
 * @param {string} valueField - Field to average
 * @param {number} window - Window size
 * @returns {Array} Data with moving average
 */
export function calculateMovingAverage(data, valueField, window = 7) {
    return data.map((item, index) => {
        const start = Math.max(0, index - window + 1);
        const slice = data.slice(start, index + 1);
        const avg = slice.reduce((sum, d) => sum + (d[valueField] || 0), 0) / slice.length;

        return {
            ...item,
            movingAverage: Math.round(avg * 100) / 100
        };
    });
}

// ========================================
// ANOMALY DETECTION
// ========================================

/**
 * Detect anomalies in metric data
 * @param {string} metricName - Name of metric
 * @param {number} currentValue - Current value
 * @param {number} daysLookback - Days to look back
 * @returns {Object} Anomaly detection result
 */
export async function detectAnomalies(metricName, currentValue, daysLookback = 7) {
    try {
        const { data, error } = await supabase.rpc('detect_anomalies', {
            p_metric_name: metricName,
            p_current_value: currentValue,
            p_days_lookback: daysLookback
        });

        if (error) throw error;
        return data || { is_anomaly: false };
    } catch (error) {
        console.error('Error detecting anomalies:', error);
        return { is_anomaly: false };
    }
}

/**
 * Check for anomalies in dataset
 * @param {Array} data - Data array
 * @param {string} valueField - Field to check
 * @param {number} threshold - Standard deviations threshold
 * @returns {Array} Anomalous data points
 */
export function findAnomalies(data, valueField, threshold = 2) {
    if (data.length < 3) return [];

    const values = data.map(d => d[valueField] || 0);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const upperBound = mean + (threshold * stdDev);
    const lowerBound = mean - (threshold * stdDev);

    return data.filter(d => {
        const value = d[valueField] || 0;
        return value > upperBound || value < lowerBound;
    });
}

// ========================================
// CACHING
// ========================================

const cache = new Map();

/**
 * Cache analytics data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
export function cacheMetrics(key, data, ttl = 300) {
    const expiresAt = Date.now() + (ttl * 1000);
    cache.set(key, { data, expiresAt });
}

/**
 * Get cached metrics
 * @param {string} key - Cache key
 * @returns {any} Cached data or null
 */
export function getCachedMetrics(key) {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
        cache.delete(key);
        return null;
    }

    return cached.data;
}

/**
 * Clear cache
 * @param {string} key - Cache key (optional, clears all if not provided)
 */
export function clearCache(key = null) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

/**
 * Export chart as PNG
 * @param {HTMLElement} chartElement - Chart DOM element
 * @param {string} filename - Output filename
 */
export async function exportChartAsPNG(chartElement, filename = 'chart.png') {
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(chartElement);
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
    } catch (error) {
        console.error('Error exporting chart as PNG:', error);
    }
}

/**
 * Export data to CSV
 * @param {Array} data - Data array
 * @param {string} filename - Output filename
 */
export function exportToCSV(data, filename = 'analytics.csv') {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export data to Excel
 * @param {Array} data - Data array
 * @param {string} filename - Output filename
 */
export async function exportToExcel(data, filename = 'analytics.xlsx') {
    try {
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');
        XLSX.writeFile(workbook, filename);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
    }
}

/**
 * Generate PDF report
 * @param {Object} reportData - Report data
 * @param {string} filename - Output filename
 */
export async function exportToPDF(reportData, filename = 'analytics-report.pdf') {
    try {
        const { jsPDF } = await import('jspdf');
        await import('jspdf-autotable');

        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('Analytics Report', 14, 22);

        // Date
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

        let yPosition = 40;

        // Add sections
        Object.entries(reportData).forEach(([section, data]) => {
            doc.setFontSize(14);
            doc.text(section, 14, yPosition);
            yPosition += 10;

            if (Array.isArray(data) && data.length > 0) {
                const headers = Object.keys(data[0]);
                const rows = data.map(row => headers.map(h => row[h]));

                doc.autoTable({
                    startY: yPosition,
                    head: [headers],
                    body: rows,
                    theme: 'striped',
                    headStyles: { fillColor: [79, 70, 229] }
                });

                yPosition = doc.lastAutoTable.finalY + 15;
            }

            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
        });

        doc.save(filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

// ========================================
// TIME RANGE HELPERS
// ========================================

/**
 * Get preset time ranges
 * @returns {Object} Preset ranges
 */
export function getPresetTimeRanges() {
    const now = new Date();

    return {
        today: {
            start: startOfDay(now),
            end: endOfDay(now),
            label: 'Today'
        },
        yesterday: {
            start: startOfDay(subDays(now, 1)),
            end: endOfDay(subDays(now, 1)),
            label: 'Yesterday'
        },
        last7days: {
            start: startOfDay(subDays(now, 7)),
            end: endOfDay(now),
            label: 'Last 7 Days'
        },
        last30days: {
            start: startOfDay(subDays(now, 30)),
            end: endOfDay(now),
            label: 'Last 30 Days'
        },
        thisMonth: {
            start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
            end: endOfDay(now),
            label: 'This Month'
        },
        lastMonth: {
            start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
            label: 'Last Month'
        },
        last3months: {
            start: startOfDay(subMonths(now, 3)),
            end: endOfDay(now),
            label: 'Last 3 Months'
        },
        last6months: {
            start: startOfDay(subMonths(now, 6)),
            end: endOfDay(now),
            label: 'Last 6 Months'
        },
        thisYear: {
            start: startOfDay(new Date(now.getFullYear(), 0, 1)),
            end: endOfDay(now),
            label: 'This Year'
        }
    };
}

/**
 * Format number with abbreviation
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Format duration in minutes to human readable
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get color for metric value
 * @param {number} value - Metric value
 * @param {number} threshold - Threshold value
 * @param {boolean} higherIsBetter - Whether higher values are better
 * @returns {string} Color class
 */
export function getMetricColor(value, threshold, higherIsBetter = true) {
    const isGood = higherIsBetter ? value >= threshold : value <= threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
}
