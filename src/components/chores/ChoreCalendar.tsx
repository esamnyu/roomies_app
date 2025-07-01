// src/components/chores/ChoreCalendar.tsx
"use client";
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

    return (
        <div className="bg-background rounded-lg shadow p-4 border">
            <div className="flex justify-between items-center mb-4">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changeMonth(-1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => changeMonth(1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-secondary-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="font-medium">{day}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2 mt-2">
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="border rounded-md border-transparent"></div>
                ))}
                
                {daysInMonth.map(day => {
                    const dateKey = day.toISOString().split('T')[0];
                    const choresForDay = assignmentsByDate.get(dateKey) || [];
                    const isToday = new Date().toDateString() === day.toDateString();
                    
                    return (
                        <div 
                            key={day.toString()} 
                            className={`border rounded-md p-1 min-h-[110px] text-left flex flex-col transition-all ${
                                isToday ? 'border-primary border-2' : 'bg-secondary/30'
                            }`}
                        >
                            <span className={`text-xs font-semibold self-center ${
                                isToday ? 'text-primary' : ''
                            }`}>
                                {day.getDate()}
                            </span>
                            
                            <div className="space-y-1 mt-1 overflow-y-auto pr-1">
                                {choresForDay.map(chore => (
                                    <div 
                                        key={chore.id} 
                                        className={`flex items-center space-x-1.5 text-xs p-1 rounded-md ${
                                            chore.status === 'completed' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}
                                    >
                                        <div className="flex-shrink-0 h-4 w-4 bg-gray-300 rounded-full flex items-center justify-center text-[8px] font-bold">
                                            {getInitials(chore.assigned_profile?.name)}
                                        </div>
                                        <p 
                                            className="font-semibold truncate" 
                                            title={chore.chore_definition?.name}
                                        >
                                            {chore.chore_definition?.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};