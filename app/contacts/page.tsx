"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Contact as ContactIcon,
  Users,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CloudOff,
  UserCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAI } from "@/components/ai-context";
import { ContactTimeline } from "@/components/contact-timeline";
import Link from "next/link";

type SalesforceRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  leadSource: string | null;
  status?: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  _type: 'contact' | 'lead';
};

type SalesforceUser = {
  id: string;
  name: string;
  email: string;
};

type RoundRobinGroup = {
  id: string;
  name: string;
  description: string | null;
  distributionMode: string;
  _count?: { members: number };
};

export default function ContactsPage() {
  const { openChat } = useAI();
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const [sfUsers, setSfUsers] = useState<SalesforceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [recordType, setRecordType] = useState<'all' | 'contact' | 'lead'>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Assignment dialog
  const [assigningRecord, setAssigningRecord] = useState<SalesforceRecord | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  // Route to Group dialog
  const [routingRecord, setRoutingRecord] = useState<SalesforceRecord | null>(null);
  const [groups, setGroups] = useState<RoundRobinGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [routingLoading, setRoutingLoading] = useState(false);

  // Detail view
  const [viewingRecord, setViewingRecord] = useState<SalesforceRecord | null>(null);
  const [timelineRecordId, setTimelineRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
    fetchSalesforceUsers();
    fetchGroups();
  }, [search, recordType, ownerFilter, page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', pageSize.toString());
      params.set('offset', (page * pageSize).toString());
      params.set('type', recordType);

      if (search) params.set('search', search);

      if (ownerFilter === 'assigned') {
        params.set('hasOwner', 'true');
      } else if (ownerFilter === 'unassigned') {
        params.set('hasOwner', 'false');
      }

      const response = await fetch(`/api/salesforce/records?${params}`);
      const data = await response.json();

      if (data.error && data.connected === false) {
        setConnected(false);
        return;
      }

      setConnected(true);
      setRecords(data.records || []);
      setTotalRecords(data.totalSize || 0);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesforceUsers = async () => {
    try {
      const response = await fetch('/api/salesforce/records?action=users');
      const data = await response.json();
      if (data.users) {
        setSfUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch Salesforce users:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      if (Array.isArray(data)) {
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleRouteToGroup = async () => {
    if (!routingRecord || !selectedGroupId) return;

    setRoutingLoading(true);
    try {
      const response = await fetch(`/api/salesforce/records/${routingRecord.id}/route-to-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const groupName = groups.find(g => g.id === selectedGroupId)?.name;
        toast.success(`Routed ${routingRecord.name} to ${result.assignedTo?.name} via ${groupName}`);
        setRoutingRecord(null);
        setSelectedGroupId("");
        fetchRecords();
      } else {
        toast.error(result.error || "Failed to route record");
      }
    } catch (error) {
      toast.error("Failed to route record");
    } finally {
      setRoutingLoading(false);
    }
  };

  const handleAssignOwner = async () => {
    if (!assigningRecord || !selectedOwnerId) return;

    try {
      const response = await fetch(`/api/salesforce/records/${assigningRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: selectedOwnerId }),
      });

      if (response.ok) {
        const ownerName = sfUsers.find(u => u.id === selectedOwnerId)?.name;
        toast.success(`Assigned to ${ownerName}`);
        setAssigningRecord(null);
        setSelectedOwnerId("");
        fetchRecords();
      } else {
        toast.error("Failed to assign owner");
      }
    } catch (error) {
      toast.error("Failed to assign owner");
    }
  };

  const unassignedCount = records.filter(r => !r.owner).length;

  // Not connected state
  if (connected === false) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
            <CloudOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect to Salesforce</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            Connect your Salesforce account to view and manage your contacts and leads directly from RoundRobin.
          </p>
          <Link href="/settings/salesforce">
            <Button>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Salesforce
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Salesforce Records
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {totalRecords} total
              {unassignedCount > 0 && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="text-amber-600">{unassignedCount} unassigned</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchRecords}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            {unassignedCount > 0 && (
              <Button
                size="sm"
                onClick={() => openChat(`Route ${unassignedCount} unassigned ${recordType === 'lead' ? 'leads' : 'contacts'} to the appropriate team members`)}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Auto-assign ({unassignedCount})
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>

          <Select value={recordType} onValueChange={(v: any) => { setRecordType(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={(v: any) => { setOwnerFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="assigned">Has Owner</SelectItem>
              <SelectItem value="unassigned">No Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                <p className="mt-3 text-sm">Loading from Salesforce...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-muted text-muted-foreground mb-3">
                  <ContactIcon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-medium text-foreground">No records found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try adjusting your search" : "No contacts or leads in Salesforce"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <button
                          onClick={() => setViewingRecord(record)}
                          className="text-left hover:underline hover:text-primary transition-colors font-medium"
                        >
                          {record.name}
                        </button>
                        {record.title && (
                          <p className="text-xs text-muted-foreground">{record.title}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{record.email || "—"}</TableCell>
                      <TableCell className="text-sm">{record.company || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={record._type === 'lead' ? 'default' : 'secondary'} className="text-xs">
                          {record._type === 'lead' ? 'Lead' : 'Contact'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.owner ? (
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{record.owner.name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                            No Owner
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setViewingRecord(record)}>
                              <ContactIcon className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTimelineRecordId(record.id)}>
                              <Clock className="mr-2 h-4 w-4" />
                              View Timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAssigningRecord(record)}>
                              <Users className="mr-2 h-4 w-4" />
                              {record.owner ? 'Change Owner' : 'Assign Owner'}
                            </DropdownMenuItem>
                            {groups.length > 0 && (
                              <DropdownMenuItem onClick={() => setRoutingRecord(record)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Route to Group
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://login.salesforce.com/${record.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in Salesforce
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {totalRecords > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalRecords)} of {totalRecords}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * pageSize >= totalRecords}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Owner Dialog */}
      <Dialog open={assigningRecord !== null} onOpenChange={(o) => !o && setAssigningRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assigningRecord?.owner ? 'Change Owner' : 'Assign Owner'}
            </DialogTitle>
            <DialogDescription>
              Select a Salesforce user to assign as the owner of {assigningRecord?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Owner</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {sfUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningRecord(null)}>
              Cancel
            </Button>
            <Button onClick={handleAssignOwner} disabled={!selectedOwnerId}>
              <Users className="mr-2 h-4 w-4" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route to Group Dialog */}
      <Dialog open={routingRecord !== null} onOpenChange={(o) => !o && setRoutingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Route to Round Robin Group</DialogTitle>
            <DialogDescription>
              Select a group to route {routingRecord?.name} through round-robin assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <span>{group.name}</span>
                        {group._count?.members !== undefined && (
                          <span className="text-muted-foreground text-xs">
                            ({group._count.members} members)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {groups.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No groups configured. Create a group in the Groups page first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutingRecord(null)}>
              Cancel
            </Button>
            <Button onClick={handleRouteToGroup} disabled={!selectedGroupId || routingLoading}>
              {routingLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Routing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Route
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Detail Dialog */}
      <Dialog open={viewingRecord !== null} onOpenChange={(o) => !o && setViewingRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                {viewingRecord?._type === 'lead' ? (
                  <UserCircle className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <ContactIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <DialogTitle>{viewingRecord?.name}</DialogTitle>
                <DialogDescription>
                  {viewingRecord?.title && `${viewingRecord.title} • `}
                  <Badge variant="outline" className="ml-1">
                    {viewingRecord?._type === 'lead' ? 'Lead' : 'Contact'}
                  </Badge>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {viewingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewingRecord.email && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Email</p>
                    <p>{viewingRecord.email}</p>
                  </div>
                )}
                {viewingRecord.phone && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Phone</p>
                    <p>{viewingRecord.phone}</p>
                  </div>
                )}
                {viewingRecord.company && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Company</p>
                    <p className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {viewingRecord.company}
                    </p>
                  </div>
                )}
                {viewingRecord.industry && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Industry</p>
                    <p>{viewingRecord.industry}</p>
                  </div>
                )}
                {viewingRecord.leadSource && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Lead Source</p>
                    <p>{viewingRecord.leadSource}</p>
                  </div>
                )}
                {viewingRecord.status && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Status</p>
                    <Badge variant="secondary">{viewingRecord.status}</Badge>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-muted-foreground text-xs mb-2">Owner</p>
                {viewingRecord.owner ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{viewingRecord.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{viewingRecord.owner.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setViewingRecord(null);
                      setAssigningRecord(viewingRecord);
                    }}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                      No Owner Assigned
                    </Badge>
                    <div className="flex gap-2">
                      {groups.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => {
                          setViewingRecord(null);
                          setRoutingRecord(viewingRecord);
                        }}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Route
                        </Button>
                      )}
                      <Button size="sm" onClick={() => {
                        setViewingRecord(null);
                        setAssigningRecord(viewingRecord);
                      }}>
                        <Users className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(viewingRecord.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTimelineRecordId(viewingRecord.id);
                      setViewingRecord(null);
                    }}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    View Timeline
                  </Button>
                  <a
                    href={`https://login.salesforce.com/${viewingRecord.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Open in Salesforce
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog open={timelineRecordId !== null} onOpenChange={(o) => !o && setTimelineRecordId(null)}>
        <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden">
          {timelineRecordId && (
            <ContactTimeline
              recordId={timelineRecordId}
              onClose={() => setTimelineRecordId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
