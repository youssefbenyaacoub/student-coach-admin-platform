import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function MetricCard({
    title,
    value,
    trend,
    change,
    sparklineData = [],
    icon: Icon,
    onClick,
    loading = false
}) {
    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
        return <Minus className="w-4 h-4" />;
    };

    const getTrendColor = () => {
        if (trend === 'up') return 'text-green-600 bg-green-100';
        if (trend === 'down') return 'text-red-600 bg-red-100';
        return 'text-gray-600 bg-gray-100';
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        {Icon && (
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Icon className="w-5 h-5 text-indigo-600" />
                            </div>
                        )}
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                    </div>

                    {loading ? (
                        <div className="mt-3 h-8 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                        <>
                            <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>

                            {/* Trend Indicator */}
                            {trend && (
                                <div className="mt-2 flex items-center space-x-2">
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
                                        {getTrendIcon()}
                                        <span>{change}%</span>
                                    </div>
                                    <span className="text-xs text-gray-500">vs previous period</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Sparkline */}
                {sparklineData.length > 0 && !loading && (
                    <div className="w-24 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#4F46E5"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Drill-down button */}
            {onClick && !loading && (
                <button
                    onClick={onClick}
                    className="mt-4 flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    View details
                    <ArrowRight className="w-4 h-4 ml-1" />
                </button>
            )}
        </div>
    );
}
