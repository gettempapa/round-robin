"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  UserCheck,
  RefreshCw,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  CheckSquare,
  Briefcase,
  Building,
  FileText,
  Shuffle,
  ZoomIn,
  ZoomOut,
  Filter,
  X,
  ExternalLink,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from "date-fns";

type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: { id: string; name: string };
  metadata?: Record<string, any>;
  icon?: string;
  color?: string;
};

type TimelineRecord = {
  id: string;
  name: string;
  email?: string;
  company?: string;
  status?: string;
  owner?: { id: string; name: string };
  createdAt: string;
  _type: 'lead' | 'contact';
};

interface ContactTimelineProps {
  recordId: string;
  onClose?: () => void;
}

const ICON_MAP: Record<string, any> = {
  'plus-circle': PlusCircle,
  'user-check': UserCheck,
  'refresh-cw': RefreshCw,
  'check-circle': CheckCircle,
  'calendar': Calendar,
  'phone': Phone,
  'mail': Mail,
  'check-square': CheckSquare,
  'briefcase': Briefcase,
  'building': Building,
  'file-text': FileText,
  'shuffle': Shuffle,
  'edit': Edit,
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  amber: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  sky: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
  slate: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30',
  primary: 'bg-primary/20 text-primary border-primary/30',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: 'Created',
  status_change: 'Status Changes',
  owner_change: 'Owner Changes',
  converted: 'Conversions',
  task: 'Tasks',
  event: 'Meetings',
  call: 'Calls',
  email: 'Emails',
  opportunity: 'Opportunities',
  account_linked: 'Accounts',
  note: 'Notes',
  routing: 'Routing',
};

function groupEventsByDate(events: TimelineEvent[]) {
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  let currentGroup: { label: string; events: TimelineEvent[] } | null = null;

  for (const event of events) {
    const date = parseISO(event.timestamp);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else if (isThisWeek(date)) {
      label = format(date, 'EEEE');
    } else if (isThisMonth(date)) {
      label = format(date, 'MMM d');
    } else {
      label = format(date, 'MMM d, yyyy');
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, events: [] };
      groups.push(currentGroup);
    }
    currentGroup.events.push(event);
  }

  return groups;
}

export function ContactTimeline({ recordId, onClose }: ContactTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<TimelineRecord | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetchTimeline();
  }, [recordId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salesforce/records/${recordId}/timeline`);
      const data = await res.json();
      if (data.record) {
        setRecord(data.record);
        setEvents(data.timeline || []);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

  const toggleFilter = (type: string) => {
    setFilteredTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const visibleEvents = filteredTypes.size > 0
    ? events.filter(e => filteredTypes.has(e.type))
    : events;

  const groupedEvents = groupEventsByDate(visibleEvents);
  const eventTypes = Array.from(new Set(events.map(e => e.type)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-sm text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Record not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-bold text-primary">
              {record.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{record.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {record._type === 'lead' ? 'Lead' : 'Contact'}
              </Badge>
              {record.company && <span>{record.company}</span>}
              {record.owner && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Owner: {record.owner.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filter
                {filteredTypes.size > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                    {filteredTypes.size}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {eventTypes.map(type => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filteredTypes.has(type)}
                  onCheckedChange={() => toggleFilter(type)}
                >
                  {EVENT_TYPE_LABELS[type] || type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Timeline Canvas - scrollable */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-muted/30 to-background relative"
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="min-h-full p-4"
        >
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

          {/* Event groups */}
          <div className="space-y-4 relative">
            {groupedEvents.map((group, groupIndex) => (
              <div key={group.label} className="space-y-1.5">
                {/* Date label */}
                <div className="flex items-center gap-2 py-1">
                  <div className="w-[38px] flex justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {group.label}
                  </span>
                </div>

                {/* Events - compact list */}
                <div className="space-y-1 ml-[38px]">
                  {group.events.map((event, eventIndex) => {
                    const IconComponent = ICON_MAP[event.icon || ''] || CheckSquare;
                    const colorClass = COLOR_MAP[event.color || 'slate'];

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: eventIndex * 0.02 }}
                        onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                        className="cursor-pointer"
                      >
                        <div className={cn(
                          "flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors",
                          "hover:bg-muted/50",
                          selectedEvent?.id === event.id && "bg-muted"
                        )}>
                          {/* Icon */}
                          <div className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded border",
                            colorClass
                          )}>
                            <IconComponent className="h-3 w-3" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium truncate">{event.title}</span>
                              {event.description && (
                                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                                  — {event.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time */}
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(parseISO(event.timestamp), 'h:mm a')}
                          </span>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {selectedEvent?.id === event.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-8 mt-1 p-2 bg-muted/30 rounded text-xs space-y-1">
                                {event.description && (
                                  <p className="text-muted-foreground">{event.description}</p>
                                )}
                                {event.actor?.name && (
                                  <p className="text-muted-foreground/70">by {event.actor.name}</p>
                                )}
                                {/* Routing details */}
                                {event.type === 'routing' && event.metadata?.matchedConditions && (
                                  <div className="pt-1 border-t border-dashed mt-1">
                                    <p className="text-[10px] font-medium text-muted-foreground">
                                      Rule: {event.metadata.ruleName}
                                    </p>
                                    {event.metadata.matchedConditions.map((mc: any, i: number) => (
                                      <div key={i} className="flex items-center gap-1 text-[10px] mt-0.5">
                                        <CheckCircle className={cn(
                                          "h-2.5 w-2.5",
                                          mc.matched ? "text-emerald-500" : "text-red-400"
                                        )} />
                                        <span className="font-mono">
                                          {mc.condition.field} {mc.condition.operator} "{mc.condition.value}"
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {visibleEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No timeline events found</p>
              {filteredTypes.size > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setFilteredTypes(new Set())}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>{visibleEvents.length} events</span>
        <span>
          {record.createdAt && `Created ${formatDistanceToNow(parseISO(record.createdAt), { addSuffix: true })}`}
        </span>
        <a
          href={`https://login.salesforce.com/${recordId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          Open in Salesforce
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
