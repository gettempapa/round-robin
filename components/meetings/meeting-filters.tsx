"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface MeetingFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  userId: string;
  onUserChange: (value: string) => void;
  meetingTypeId: string;
  onMeetingTypeChange: (value: string) => void;
  users: Array<{ id: string; name: string }>;
  meetingTypes: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}

export function MeetingFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  userId,
  onUserChange,
  meetingTypeId,
  onMeetingTypeChange,
  users,
  meetingTypes,
  onClearFilters,
}: MeetingFiltersProps) {
  const hasFilters = search || status !== "all" || userId || meetingTypeId;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts, users..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="no_show">No Show</SelectItem>
          <SelectItem value="rescheduled">Rescheduled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={userId || "all"} onValueChange={(v) => onUserChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Assigned To" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {meetingTypes.length > 0 && (
        <Select value={meetingTypeId || "all"} onValueChange={(v) => onMeetingTypeChange(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Meeting Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {meetingTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
