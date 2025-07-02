// src/components/chores/DraggableChoreCalendar.tsx
"use client";
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, X, Calendar, User, Clock, CheckCircle, AlertCircle, GripVertical } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import type { ChoreAssignment } from '@/lib/types/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface DraggableChoreItemProps {
    chore: ChoreAssignment;
}

const DraggableChoreItem: React.FC<DraggableChoreItemProps> = ({ chore }) => {
    const isCompleted = chore.status === 'completed';
    const canDrag = !isCompleted; // Prevent dragging completed chores
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: chore.id,
        data: chore,
        disabled: !canDrag,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    const isPlaceholder = !chore.assigned_user_id || !chore.assigned_profile;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center gap-1 text-xs p-1 rounded
                ${chore.status === 'completed' ? 'bg-green-100' : 
                  chore.status === 'missed' ? 'bg-red-100' : 
                  'bg-blue-100'}
                hover:shadow-sm transition-shadow
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            `}
        >
            {canDrag ? (
                <div {...listeners} {...attributes} className="touch-none">
                    <GripVertical className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </div>
            ) : (
                <div className="opacity-50">
                    <GripVertical className="h-3 w-3 text-gray-300" />
                </div>
            )}
            {isPlaceholder ? (
                <UserPlus className="h-3 w-3 text-gray-500 flex-shrink-0" />
            ) : (
                <div className="flex-shrink-0 h-4 w-4 bg-white rounded-full flex items-center justify-center text-[8px] font-bold">
                    {getInitials(chore.assigned_profile?.name)}
                </div>
            )}
            <p className="truncate font-medium flex-1" title={chore.chore_definition?.name}>
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
};

interface DroppableDayProps {
    dateKey: string;
    day: Date;
    choresForDay: ChoreAssignment[];
    isToday: boolean;
    isPastDate: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const DroppableDay: React.FC<DroppableDayProps> = ({
    dateKey,
    day,
    choresForDay,
    isToday,
    isPastDate,
    isExpanded,
    onToggleExpand,
}) => {
    // Only allow dropping on future dates
    const canDrop = !isPastDate && !isToday;
    
    const { setNodeRef, isOver } = useDroppable({
        id: `date-${dateKey}`,
        data: { date: dateKey },
        disabled: !canDrop
    });

    return (
        <div
            ref={setNodeRef}
            className={`
                border rounded-lg p-1 sm:p-2 min-h-[80px] sm:min-h-[110px] 
                text-left flex flex-col transition-all
                ${isToday ? 'border-primary border-2 bg-primary/5' : ''}
                ${isPastDate ? 'bg-gray-50' : 'bg-white'}
                ${!isToday && !isPastDate ? 'hover:bg-gray-50' : ''}
                ${choresForDay.length > 0 ? 'cursor-pointer' : ''}
                ${isOver && canDrop ? 'ring-2 ring-primary bg-primary/10' : ''}
                ${isOver && !canDrop ? 'ring-2 ring-red-400 bg-red-50' : ''}
            `}
            onClick={(e) => {
                // Prevent expand when dragging
                if (e.defaultPrevented) return;
                if (choresForDay.length > 0) {
                    onToggleExpand();
                }
            }}
        >
            <div className="flex justify-between items-start mb-1">
                <span className={`text-xs sm:text-sm font-semibold ${
                    isToday ? 'text-primary' : isPastDate ? 'text-gray-400' : 'text-gray-700'
                }`}>
                    {day.getDate()}
                </span>
                {choresForDay.length > 2 && !isExpanded && (
                    <span className="text-xs text-gray-500">
                        +{choresForDay.length - 2}
                    </span>
                )}
            </div>
            
            <div className="mt-1 space-y-1 overflow-y-auto flex-1">
                {(isExpanded ? choresForDay : choresForDay.slice(0, 2)).map(chore => (
                    <DraggableChoreItem key={chore.id} chore={chore} />
                ))}
            </div>
        </div>
    );
};

interface DraggableChoreCalendarProps {
    assignments: ChoreAssignment[];
    onChoreMove?: (choreId: string, newDate: string) => void;
}

export const DraggableChoreCalendar: React.FC<DraggableChoreCalendarProps> = ({ 
    assignments, 
    onChoreMove 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [activeChore, setActiveChore] = useState<ChoreAssignment | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: (event, { currentCoordinates }) => {
                // Simple keyboard navigation
                return currentCoordinates;
            }
        })
    );

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
        setExpandedDate(null);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handleDragStart = (event: DragStartEvent) => {
        const chore = event.active.data.current as ChoreAssignment;
        setActiveChore(chore);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveChore(null);

        if (!over || !active) return;

        const overId = over.id as string;
        if (overId.startsWith('date-')) {
            const newDate = overId.replace('date-', '');
            const choreId = active.id as string;
            
            // Find the chore to check its current date
            const chore = assignments.find(a => a.id === choreId);
            if (!chore) return;
            
            // Only move if it's actually a different date
            if (chore.due_date !== newDate && onChoreMove) {
                onChoreMove(choreId, newDate);
            }
        }
    };

    const getChoreStatus = (chore: ChoreAssignment) => {
        const dueDate = new Date(chore.due_date + 'T00:00:00');
        if (chore.status === 'completed') return 'completed';
        if (dueDate < today) return 'overdue';
        if (dueDate.getTime() === today.getTime()) return 'due-today';
        return 'upcoming';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'overdue':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            case 'due-today':
                return <Clock className="h-4 w-4 text-amber-600 animate-pulse" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            default:
                return <Calendar className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusText = (status: string, dueDate: Date) => {
        switch (status) {
            case 'overdue':
                return 'Overdue';
            case 'due-today':
                return 'Due Today';
            case 'completed':
                return 'Completed';
            default:
                return `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
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
                            const isExpanded = expandedDate === dateKey;
                            
                            return (
                                <DroppableDay
                                    key={day.toString()}
                                    dateKey={dateKey}
                                    day={day}
                                    choresForDay={choresForDay}
                                    isToday={isToday}
                                    isPastDate={isPastDate}
                                    isExpanded={isExpanded}
                                    onToggleExpand={() => setExpandedDate(isExpanded ? null : dateKey)}
                                />
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
                        <div className="text-gray-500 ml-auto flex items-center gap-1 text-xs">
                            <GripVertical className="h-3 w-3" />
                            Drag to future dates • Click to expand
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Day View Modal */}
            {expandedDate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold">
                                    {new Date(expandedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setExpandedDate(null)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="space-y-4">
                                {assignmentsByDate.get(expandedDate)?.map(chore => {
                                    const status = getChoreStatus(chore);
                                    const dueDate = new Date(chore.due_date + 'T00:00:00');
                                    const isPlaceholder = !chore.assigned_user_id || !chore.assigned_profile;
                                    
                                    return (
                                        <div key={chore.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-lg">
                                                        {chore.chore_definition?.name || 'Unnamed Task'}
                                                    </h4>
                                                    {chore.chore_definition?.description && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {chore.chore_definition.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-3 flex items-center gap-4 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            {isPlaceholder ? (
                                                                <>
                                                                    <UserPlus className="h-4 w-4 text-gray-500" />
                                                                    <span className="text-gray-500">Unassigned</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <User className="h-4 w-4 text-gray-500" />
                                                                    <span>{chore.assigned_profile?.name}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(status)}
                                                            <span className={
                                                                status === 'overdue' ? 'text-red-600 font-medium' :
                                                                status === 'due-today' ? 'text-amber-600 font-medium' :
                                                                status === 'completed' ? 'text-green-600' :
                                                                'text-gray-600'
                                                            }>
                                                                {getStatusText(status, dueDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {!isPlaceholder && (
                                                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                                                        {getInitials(chore.assigned_profile?.name)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DragOverlay>
                {activeChore && (
                    <div className={`
                        flex items-center gap-1 text-xs p-1 rounded shadow-lg
                        ${activeChore.status === 'completed' ? 'bg-green-100' : 
                          activeChore.status === 'missed' ? 'bg-red-100' : 
                          'bg-blue-100'}
                    `}>
                        <GripVertical className="h-3 w-3 text-gray-400" />
                        {!activeChore.assigned_user_id || !activeChore.assigned_profile ? (
                            <UserPlus className="h-3 w-3 text-gray-500 flex-shrink-0" />
                        ) : (
                            <div className="flex-shrink-0 h-4 w-4 bg-white rounded-full flex items-center justify-center text-[8px] font-bold">
                                {getInitials(activeChore.assigned_profile?.name)}
                            </div>
                        )}
                        <p className="font-medium">
                            {activeChore.chore_definition?.name || 'Task'}
                        </p>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};