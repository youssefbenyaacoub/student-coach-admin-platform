import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Users, AlertTriangle, TrendingUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export default function WorkloadChart({ referents, workloads, chartType = 'bar' }) {
    // Prepare data
    const labels = referents.map(r => r.name);
    const currentStudents = referents.map(r => workloads[r.id]?.current_students || 0);
    const maxStudents = referents.map(r => workloads[r.id]?.max_students || 10);
    const capacityPercentages = referents.map(r => workloads[r.id]?.capacity_percentage || 0);

    // Calculate statistics
    const totalStudents = currentStudents.reduce((sum, count) => sum + count, 0);
    const totalCapacity = maxStudents.reduce((sum, max) => sum + max, 0);
    const averageLoad = totalStudents / referents.length;
    const overloadedCount = capacityPercentages.filter(p => p >= 100).length;

    // Bar chart data
    const barData = {
        labels,
        datasets: [
            {
                label: 'Current Students',
                data: currentStudents,
                backgroundColor: currentStudents.map((count, index) => {
                    const percentage = capacityPercentages[index];
                    if (percentage >= 100) return 'rgba(239, 68, 68, 0.8)'; // Red
                    if (percentage >= 80) return 'rgba(234, 179, 8, 0.8)'; // Yellow
                    return 'rgba(34, 197, 94, 0.8)'; // Green
                }),
                borderColor: currentStudents.map((count, index) => {
                    const percentage = capacityPercentages[index];
                    if (percentage >= 100) return 'rgb(239, 68, 68)';
                    if (percentage >= 80) return 'rgb(234, 179, 8)';
                    return 'rgb(34, 197, 94)';
                }),
                borderWidth: 1
            },
            {
                label: 'Max Capacity',
                data: maxStudents,
                backgroundColor: 'rgba(156, 163, 175, 0.3)',
                borderColor: 'rgb(156, 163, 175)',
                borderWidth: 1
            }
        ]
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top'
            },
            title: {
                display: true,
                text: 'Referent Workload Distribution'
            },
            tooltip: {
                callbacks: {
                    afterLabel: (context) => {
                        const index = context.dataIndex;
                        const percentage = capacityPercentages[index];
                        return `Capacity: ${percentage.toFixed(1)}%`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    // Pie chart data
    const pieData = {
        labels,
        datasets: [
            {
                label: 'Students per Referent',
                data: currentStudents,
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(20, 184, 166, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderColor: [
                    'rgb(79, 70, 229)',
                    'rgb(236, 72, 153)',
                    'rgb(34, 197, 94)',
                    'rgb(234, 179, 8)',
                    'rgb(239, 68, 68)',
                    'rgb(20, 184, 166)',
                    'rgb(251, 146, 60)',
                    'rgb(168, 85, 247)'
                ],
                borderWidth: 1
            }
        ]
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right'
            },
            title: {
                display: true,
                text: 'Student Distribution'
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Total Students</p>
                            <p className="text-2xl font-bold text-blue-900">{totalStudents}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 font-medium">Total Capacity</p>
                            <p className="text-2xl font-bold text-purple-900">{totalCapacity}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Avg Load</p>
                            <p className="text-2xl font-bold text-green-900">{averageLoad.toFixed(1)}</p>
                        </div>
                        <Users className="w-8 h-8 text-green-600" />
                    </div>
                </div>

                <div className={`rounded-lg p-4 ${overloadedCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-sm font-medium ${overloadedCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                Overloaded
                            </p>
                            <p className={`text-2xl font-bold ${overloadedCount > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                                {overloadedCount}
                            </p>
                        </div>
                        <AlertTriangle className={`w-8 h-8 ${overloadedCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-80">
                {chartType === 'bar' ? (
                    <Bar data={barData} options={barOptions} />
                ) : (
                    <Pie data={pieData} options={pieOptions} />
                )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span className="text-gray-600">Under 80%</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span className="text-gray-600">80-99%</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span className="text-gray-600">100%+</span>
                </div>
            </div>
        </div>
    );
}
