import { useState } from 'react'
import { Calendar, Clock, Check, User } from 'lucide-react'
import Card from '../common/Card'
import Button from '../common/Button'
import { formatDate } from '../../utils/time'

/**
 * Session Booking Component
 * Allows students to book available coaching slots
 */
export default function SessionBooking({ availableSlots, coaches, onBookSession }) {
    const [selectedSlot, setSelectedSlot] = useState(null)

    const handleBook = () => {
        if (selectedSlot) {
            onBookSession(selectedSlot.id)
            setSelectedSlot(null)
        }
    }

    // Group slots by date
    const slotsByDate = (availableSlots || []).reduce((acc, slot) => {
        const dateKey = new Date(slot.start_time).toDateString()
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(slot)
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-student-primary" />
                        Book a Coaching Session
                    </h2>
                    <p className="text-slate-500 mt-1">Select a time slot for 1:1 mentorship.</p>
                </div>
            </div>

            {Object.keys(slotsByDate).length === 0 ? (
                <Card className="p-8 text-center text-slate-500 border-dashed">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No available slots found. Check back later!</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(slotsByDate).map(([dateStr, slots]) => (
                        <Card key={dateStr} className="p-4">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300 border-b pb-2 mb-3">
                                {formatDate(slots[0].start_time)}
                            </h3>
                            <div className="space-y-2">
                                {slots.map((slot) => {
                                    const coach = coaches.find(c => c.id === slot.coach_id)
                                    const isSelected = selectedSlot?.id === slot.id

                                    return (
                                        <button
                                            key={slot.id}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${isSelected
                                                ? 'border-student-primary bg-student-primary/5 ring-2 ring-student-primary/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-student-primary/50'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                    <Clock size={14} />
                                                    {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <User size={10} />
                                                    {coach?.full_name || 'Assigned Coach'}
                                                </div>
                                            </div>
                                            {isSelected && <Check size={18} className="text-student-primary" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Confirmation Modal Area (Simplified inline for now) */}
            {selectedSlot && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center z-50">
                    <div>
                        <div className="text-sm text-slate-500">Selected Slot</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                            {formatDate(selectedSlot.start_time)} at {new Date(selectedSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setSelectedSlot(null)}>Cancel</Button>
                        <Button onClick={handleBook}>Confirm Booking</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
