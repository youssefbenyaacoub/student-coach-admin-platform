import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getPresetTimeRanges } from '../../utils/analyticsUtils';
import { format } from 'date-fns';

export default function TimeRangeSelector({ onRangeChange, defaultRange = 'last7days' }) {
    const presets = getPresetTimeRanges();
    const [selectedPreset, setSelectedPreset] = useState(defaultRange);
    const [showCustom, setShowCustom] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const handlePresetClick = (presetKey) => {
        setSelectedPreset(presetKey);
        setShowCustom(false);
        const range = presets[presetKey];
        onRangeChange(range.start, range.end);
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            onRangeChange(start, end);
            setSelectedPreset('custom');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h3 className="text-sm font-medium text-gray-900">Time Range</h3>
                </div>
                <button
                    onClick={() => setShowCustom(!showCustom)}
                    className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                    Custom
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-2">
                {Object.entries(presets).map(([key, range]) => (
                    <button
                        key={key}
                        onClick={() => handlePresetClick(key)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${selectedPreset === key
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {range.label}
                    </button>
                ))}
            </div>

            {/* Custom Date Range */}
            {showCustom && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleCustomApply}
                        disabled={!customStart || !customEnd}
                        className="mt-3 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
                    >
                        Apply Custom Range
                    </button>
                </div>
            )}

            {/* Current Selection Display */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    {selectedPreset === 'custom' && customStart && customEnd
                        ? `${format(new Date(customStart), 'MMM d, yyyy')} - ${format(new Date(customEnd), 'MMM d, yyyy')}`
                        : presets[selectedPreset]?.label || 'Select a range'}
                </p>
            </div>
        </div>
    );
}
