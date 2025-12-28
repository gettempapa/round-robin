"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CloudOff, RefreshCw, ArrowUpDown, ExternalLink, DollarSign, Calendar, User, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Opportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Owner: { Name: string };
  Account: { Name: string } | null;
  Probability: number | null;
  CreatedDate: string;
}

interface OpportunityFilters {
  stage?: string;
  owner?: string;
  minAmount?: string;
  maxAmount?: string;
}

export default function SalesforceOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [sortBy, setSortBy] = useState('CreatedDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    fetchStages();
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [sortBy, sortOrder, filters, page]);

  const fetchStages = async () => {
    try {
      const res = await fetch('/api/salesforce/opportunities?action=stages');
      const data = await res.json();
      setStages(data.stages.map((s: any) => ({ label: s.label, value: s.value })));
    } catch (err) {
      console.error('Failed to fetch stages:', err);
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        sortBy,
        sortOrder,
        ...filters,
      });

      const res = await fetch(`/api/salesforce/opportunities?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch opportunities');
      }

      setOpportunities(data.records);
      setTotalSize(data.totalSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (error && error.includes('Not connected')) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <CloudOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Not Connected to Salesforce</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Salesforce account to view opportunities
            </p>
            <Button asChild>
              <Link href="/settings/salesforce">Connect to Salesforce</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Salesforce Opportunities
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live data from your Salesforce org • {totalSize.toLocaleString()} total opportunities
            </p>
          </div>
          <Button onClick={fetchOpportunities} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-semibold">Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Stage</label>
                <Select
                  value={filters.stage || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, stage: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Owner</label>
                <Input
                  placeholder="Search owner..."
                  value={filters.owner || ''}
                  onChange={(e) => setFilters({ ...filters, owner: e.target.value || undefined })}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Min Amount</label>
                <Input
                  type="number"
                  placeholder="$0"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value || undefined })}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Max Amount</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value || undefined })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities Table */}
        <Card>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[300px]">
                    <button
                      onClick={() => handleSort('Name')}
                      className="flex items-center gap-1 hover:text-foreground font-semibold"
                    >
                      Opportunity
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('StageName')}
                      className="flex items-center gap-1 hover:text-foreground font-semibold"
                    >
                      Stage
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('Amount')}
                      className="flex items-center gap-1 hover:text-foreground font-semibold"
                    >
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('CloseDate')}
                      className="flex items-center gap-1 hover:text-foreground font-semibold"
                    >
                      Close Date
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading opportunities...</p>
                    </TableCell>
                  </TableRow>
                ) : opportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No opportunities found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  opportunities.map((opp) => (
                    <TableRow key={opp.Id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 shrink-0">
                            <DollarSign className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm">{opp.Name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {opp.StageName}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCurrency(opp.Amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(opp.CloseDate)}
                      </TableCell>
                      <TableCell className="text-sm">{opp.Owner.Name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {opp.Account?.Name || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <a
                            href={`https://login.salesforce.com/${opp.Id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && opportunities.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Showing {page * limit + 1} - {Math.min((page + 1) * limit, totalSize)} of {totalSize.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= totalSize}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
