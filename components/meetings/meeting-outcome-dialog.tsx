"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle } from "lucide-react";

interface Outcome {
  id: string;
  name: string;
  description: string | null;
  isPositive: boolean;
}

interface MeetingOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (outcomeId: string, notes?: string) => void;
  loading?: boolean;
}

export function MeetingOutcomeDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: MeetingOutcomeDialogProps) {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingOutcomes(true);
      fetch("/api/meeting-outcomes")
        .then((res) => res.json())
        .then((data) => {
          setOutcomes(data.outcomes || []);
          setLoadingOutcomes(false);
        })
        .catch(() => {
          setLoadingOutcomes(false);
        });
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(selectedOutcome, notes || undefined);
  };

  const selectedOutcomeData = outcomes.find((o) => o.id === selectedOutcome);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Meeting Outcome</DialogTitle>
          <DialogDescription>
            Record the outcome of this meeting for tracking and analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Outcome</Label>
            {loadingOutcomes ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : outcomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outcomes configured. Add outcomes in Settings.
              </p>
            ) : (
              <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an outcome" />
                </SelectTrigger>
                <SelectContent>
                  {outcomes.map((outcome) => (
                    <SelectItem key={outcome.id} value={outcome.id}>
                      <span className="flex items-center gap-2">
                        {outcome.isPositive ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        {outcome.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedOutcomeData?.description && (
              <p className="text-sm text-muted-foreground">
                {selectedOutcomeData.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Input
              placeholder="Any additional notes about the meeting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOutcome || loading}
          >
            {loading ? "Saving..." : "Save Outcome"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
