// src/components/chores/DraggableChoreCalendar.tsx
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, X, Calendar, User, Clock, CheckCircle, AlertCircle, GripVertical, ChevronDown, Home, Utensils, Shirt, Trash2, Car, ShoppingCart, Dog, Droplets, Sparkles, Wrench } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import type { ChoreAssignment } from '@/lib/types/types';
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery';
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

// Map chore names to icons
const getChoreIcon = (choreName?: string) => {
    if (!choreName) return Home;
    
    const name = choreName.toLowerCase();
    
    // Kitchen related
    if (name.includes('dish') || name.includes('kitchen') || name.includes('cook')) return Utensils;
    
    // Cleaning
    if (name.includes('clean') || name.includes('dust') || name.includes('sweep') || name.includes('mop')) return Sparkles;
    
    // Laundry
    if (name.includes('laundry') || name.includes('wash') || name.includes('clothes')) return Shirt;
    
    // Trash
    if (name.includes('trash') || name.includes('garbage') || name.includes('bin')) return Trash2;
    
    // Car
    if (name.includes('car') || name.includes('vehicle')) return Car;
    
    // Shopping
    if (name.includes('shop') || name.includes('grocery') || name.includes('buy')) return ShoppingCart;
    
    // Pets
    if (name.includes('pet') || name.includes('dog') || name.includes('cat') || name.includes('feed')) return Dog;
    
    // Bathroom
    if (name.includes('bathroom') || name.includes('shower') || name.includes('toilet')) return Droplets;
    
    // Maintenance
    if (name.includes('fix') || name.includes('repair') || name.includes('maintain')) return Wrench;
    
    // Default
    return Home;
};

interface DraggableChoreItemProps {
    chore: ChoreAssignment;
}

const DraggableChoreItem: React.FC<DraggableChoreItemProps> = ({ chore }) => {
    const isCompleted = chore.status === 'completed';
    const canDrag = !isCompleted; // Prevent dragging completed chores
    const isMobile = useIsMobile();
    
    const ChoreIcon = getChoreIcon(chore.chore_definition?.name);
    const isPlaceholder = !chore.assigned_user_id || !chore.assigned_profile;
    
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center justify-center rounded transition-all relative
                ${isMobile ? 'w-full h-full aspect-square' : 'p-1 gap-1 text-xs'}
                ${chore.status === 'completed' ? 'bg-green-500' : 
                  chore.status === 'missed' ? 'bg-red-500' : 
                  'bg-blue-500'}
                ${isDragging ? 'scale-110 shadow-lg ring-2 ring-gray-400 z-20 cursor-grabbing opacity-90' : 
                  canDrag ? 'hover:scale-105 hover:shadow-md cursor-grab' : 'cursor-default'}
            `}
        >
            {/* Desktop view - show grip and user info */}
            {!isMobile && (
                <>
                    {canDrag ? (
                        <div 
                            {...listeners} 
                            {...attributes} 
                            className="touch-none"
                        >
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
                        <div className="flex-shrink-0 bg-white rounded-full flex items-center justify-center font-bold h-4 w-4 text-[8px]">
                            {getInitials(chore.assigned_profile?.name)}
                        </div>
                    )}
                </>
            )}
            
            {/* Mobile and Desktop chore display */}
            {isMobile ? (
                <div 
                    {...(canDrag ? {...listeners, ...attributes} : {})}
                    className="flex items-center justify-center touch-none w-full h-full"
                >
                    <ChoreIcon 
                        className="h-4 w-4 text-white" 
                    />
                    {/* Optional: Small assignment indicator */}
                    {!isPlaceholder && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                </div>
            ) : (
                <p className="truncate font-medium flex-1" title={chore.chore_definition?.name}>
                    {chore.chore_definition?.name || 'Task'}
                </p>
            )}
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
    const isMobile = useIsMobile();
    
    const { setNodeRef, isOver } = useDroppable({
        id: `date-${dateKey}`,
        data: { date: dateKey },
        disabled: !canDrop
    });

    return (
        <div
            ref={setNodeRef}
            className={`
                border rounded-lg text-left flex flex-col transition-all relative
                ${isMobile ? 'p-0.5 min-h-[70px]' : 'p-1 sm:p-2 min-h-[80px] sm:min-h-[110px]'}
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
            <div className="flex justify-between items-start">
                <span className={`font-semibold ${
                    isMobile ? 'text-[10px] px-1' : 'text-xs sm:text-sm'
                } ${
                    isToday ? 'text-primary' : isPastDate ? 'text-gray-400' : 'text-gray-700'
                }`}>
                    {day.getDate()}
                </span>
                {!isMobile && choresForDay.length > 2 && !isExpanded && (
                    <span className="text-gray-500 text-xs">
                        +{choresForDay.length - 2}
                    </span>
                )}
            </div>
            
            <div className={`flex-1 overflow-hidden ${isMobile ? '' : 'space-y-1 mt-1'}`}>
                {isMobile ? (
                    // Mobile: Show icons in a 2x2 grid
                    <div className="grid grid-cols-2 gap-0.5 p-0.5">
                        {choresForDay.slice(0, 3).map(chore => (
                            <div key={chore.id} className="aspect-square">
                                <DraggableChoreItem chore={chore} />
                            </div>
                        ))}
                        {choresForDay.length > 3 && (
                            <div className="aspect-square bg-gray-400 rounded flex items-center justify-center text-white text-xs font-bold">
                                +{choresForDay.length - 3}
                            </div>
                        )}
                        {/* Fill empty quadrants */}
                        {choresForDay.length < 3 && Array.from({ length: 3 - choresForDay.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                    </div>
                ) : (
                    // Desktop: Show as list
                    (isExpanded ? choresForDay : choresForDay.slice(0, 2)).map(chore => (
                        <DraggableChoreItem key={chore.id} chore={chore} />
                    ))
                )}
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
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [showIconLegend, setShowIconLegend] = useState(false);
    const isMobile = useIsMobile();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
                delay: 0, // Immediate drag on both mobile and desktop
                tolerance: 5,
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
    
    // Week view calculations
    const getWeekDays = useMemo(() => {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            return day;
        });
    }, [currentDate]);
    
    const displayDays = viewMode === 'week' && isMobile ? getWeekDays : daysInMonth;

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
        if (viewMode === 'week' && isMobile) {
            // Change week
            setCurrentDate(prev => {
                const newDate = new Date(prev);
                newDate.setDate(prev.getDate() + (delta * 7));
                return newDate;
            });
        } else {
            // Change month
            setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
        }
        setExpandedDate(null);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };
    
    // Handle swipe gestures for mobile
    const minSwipeDistance = 50;
    
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    
    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };
    
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        
        if (isLeftSwipe) {
            changeMonth(1); // Next month
        } else if (isRightSwipe) {
            changeMonth(-1); // Previous month
        }
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
                        <div className="text-center flex-1">
                            <h2 className="text-lg font-semibold">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={goToToday}
                                    className="text-sm text-primary hover:text-primary/80 font-medium"
                                >
                                    Today
                                </button>
                                {isMobile && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <button
                                            onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
                                            className="text-sm text-primary hover:text-primary/80 font-medium"
                                        >
                                            {viewMode === 'month' ? 'Week View' : 'Month View'}
                                        </button>
                                    </>
                                )}
                            </div>
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
                <div 
                    className={`${isMobile ? 'p-2' : 'p-4'}`}
                    onTouchStart={isMobile ? handleTouchStart : undefined}
                    onTouchMove={isMobile ? handleTouchMove : undefined}
                    onTouchEnd={isMobile ? handleTouchEnd : undefined}
                >
                    <div className={`grid grid-cols-7 ${isMobile ? 'gap-0.5' : 'gap-1'} text-center mb-2`}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className={`font-medium text-gray-600 ${isMobile ? 'text-[10px] py-1' : 'text-xs sm:text-sm py-2'}`}>
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{day.substring(0, 1)}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className={`grid grid-cols-7 ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                        {/* Empty cells for days before month starts - only in month view */}
                        {viewMode === 'month' && Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                        ))}
                        
                        {/* Calendar days */}
                        {displayDays.map(day => {
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
                        {isMobile ? (
                            <>
                                <button
                                    onClick={() => setShowIconLegend(!showIconLegend)}
                                    className="text-gray-500 text-[10px] underline"
                                >
                                    Icon guide
                                </button>
                                <div className="text-gray-500 text-[10px]">
                                    Tap day for details • Drag icons to move
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500 ml-auto flex items-center gap-1 text-xs">
                                <GripVertical className="h-3 w-3" />
                                Drag to future dates • Click to expand
                            </div>
                        )}
                    </div>
                    
                    {/* Mobile Icon Legend */}
                    {isMobile && showIconLegend && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="flex items-center gap-2">
                                    <Utensils className="h-4 w-4 text-blue-700" />
                                    <span>Kitchen/Dishes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-blue-700" />
                                    <span>Cleaning</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shirt className="h-4 w-4 text-blue-700" />
                                    <span>Laundry</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 text-blue-700" />
                                    <span>Trash</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Droplets className="h-4 w-4 text-blue-700" />
                                    <span>Bathroom</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Home className="h-4 w-4 text-blue-700" />
                                    <span>General</span>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t text-[9px] text-gray-600">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                    <span>Assigned (pending)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                    <span>Unassigned</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Day View - Modal for Desktop, Bottom Sheet for Mobile */}
            {expandedDate && !isMobile && (
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
                {activeChore && (() => {
                    const ActiveChoreIcon = getChoreIcon(activeChore.chore_definition?.name);
                    const isPlaceholder = !activeChore.assigned_user_id || !activeChore.assigned_profile;
                    return (
                        <div className={`
                            rounded shadow-lg
                            ${isMobile ? 'w-12 h-12 flex items-center justify-center' : 'flex items-center gap-1 text-xs p-1'}
                            ${activeChore.status === 'completed' ? 'bg-green-600' : 
                              activeChore.status === 'missed' ? 'bg-red-600' : 
                              isPlaceholder ? 'bg-gray-400' : 'bg-blue-600'}
                        `}>
                            {isMobile ? (
                                <ActiveChoreIcon className="h-6 w-6 text-white" />
                            ) : (
                                <>
                                    <GripVertical className="h-3 w-3 text-gray-400" />
                                    {isPlaceholder ? (
                                        <UserPlus className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                    ) : (
                                        <div className="flex-shrink-0 h-4 w-4 bg-white rounded-full flex items-center justify-center text-[8px] font-bold">
                                            {getInitials(activeChore.assigned_profile?.name)}
                                        </div>
                                    )}
                                    <p className="font-medium">
                                        {activeChore.chore_definition?.name || 'Task'}
                                    </p>
                                </>
                            )}
                        </div>
                    );
                })()}
            </DragOverlay>
            
            {/* Mobile Bottom Sheet */}
            {expandedDate && isMobile && (
                <BottomSheet
                    isOpen={true}
                    onClose={() => setExpandedDate(null)}
                    title={new Date(expandedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                    height="auto"
                >
                    <div className="space-y-4 pb-safe">
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
                </BottomSheet>
            )}
        </DndContext>
    );
};