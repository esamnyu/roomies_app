// src/components/chores/ChoreCalendar.tsx
"use client";
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ChoreAssignment } from '@/lib/types/types';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface ChoreCalendarProps {
    assignments: ChoreAssignment[];
}

export const ChoreCalendar: React.FC<ChoreCalendarProps> = ({ assignments }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = useMemo(() => 
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 
        [currentDate]
    );
    
    const endOfMonth = useMemo(() => 
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), 
        [currentDate]
    );
    
    const startDay = useMemo(() => startOfMonth.getDay(), [startOfMonth]);

    const daysInMonth = useMemo(() => 
        Array.from({ length: endOfMonth.getDate() }, (_, i) => 
            new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), i + 1)
        ), 
        [startOfMonth, endOfMonth]
    );

    const assignmentsByDate = useMemo(() => {
        const map = new Map<string, ChoreAssignment[]>();
        assignments.forEach(a => {
            const dateKey = a.due_date;
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(a);
        });
        return map;
    }, [assignments]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Calendar Header */}
            <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeMonth(-1)}
                        className="hover:bg-gray-200"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-center">
                        <h2 className="text-lg font-semibold">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button
                            onClick={goToToday}
                            className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                            Today
                        </button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeMonth(1)}
                        className="hover:bg-gray-200"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="font-medium text-xs sm:text-sm text-gray-600 py-2">
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{day.substring(0, 1)}</span>
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square"></div>
                    ))}
                    
                    {/* Calendar days */}
                    {daysInMonth.map(day => {
                        const dateKey = day.toISOString().split('T')[0];
                        const choresForDay = assignmentsByDate.get(dateKey) || [];
                        const isToday = today.toDateString() === day.toDateString();
                        const isPastDate = day < today && !isToday;
                        
                        return (
                            <div 
                                key={day.toString()} 
                                className={`
                                    border rounded-lg p-1 sm:p-2 min-h-[80px] sm:min-h-[110px] 
                                    text-left flex flex-col transition-all
                                    ${isToday ? 'border-primary border-2 bg-primary/5' : ''}
                                    ${isPastDate ? 'bg-gray-50' : 'bg-white'}
                                    ${!isToday && !isPastDate ? 'hover:bg-gray-50' : ''}
                                `}
                            >
                                <span className={`text-xs sm:text-sm font-semibold ${
                                    isToday ? 'text-primary' : isPastDate ? 'text-gray-400' : 'text-gray-700'
                                }`}>
                                    {day.getDate()}
                                </span>
                                
                                <div className="mt-1 space-y-1 overflow-y-auto flex-1">
                                    {choresForDay.map(chore => {
                                        const isPlaceholder = !chore.assigned_user_id || !chore.assigned_profile;
                                        
                                        return (
                                            <div 
                                                key={chore.id} 
                                                className={`
                                                    flex items-center gap-1 text-xs p-1 rounded
                                                    ${chore.status === 'completed' ? 'bg-green-100' : 
                                                      chore.status === 'missed' ? 'bg-red-100' : 
                                                      'bg-blue-100'}
                                                `}
                                            >
                                                {isPlaceholder ? (
                                                    <UserPlus className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                                ) : (
                                                    <div className="flex-shrink-0 h-4 w-4 bg-white rounded-full flex items-center justify-center text-[8px] font-bold">
                                                        {getInitials(chore.assigned_profile?.name)}
                                                    </div>
                                                )}
                                                <p className="truncate font-medium" title={chore.chore_definition?.name}>
                                                    <span className="hidden sm:inline">{chore.chore_definition?.name}</span>
                                                    <span className="sm:hidden">
                                                        {chore.chore_definition?.name ? 
                                                            (chore.chore_definition.name.length > 8 ? 
                                                                chore.chore_definition.name.substring(0, 8) + '...' : 
                                                                chore.chore_definition.name
                                                            ) : 'Task'
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Legend */}
            <div className="px-4 pb-4 border-t pt-3">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded" />
                        <span className="text-gray-600">Pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 rounded" />
                        <span className="text-gray-600">Completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 rounded" />
                        <span className="text-gray-600">Missed</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <UserPlus className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Unassigned</span>
                    </div>
                </div>
            </div>
        </div>
    );
};