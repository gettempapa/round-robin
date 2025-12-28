"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Calendar as CalendarIcon, Loader2, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { use } from "react";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
};

type Form = {
  id: string;
  name: string;
  description: string | null;
  fields: string;
};

export default function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignedUser, setAssignedUser] = useState<any>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/forms/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setForm(data);
        const parsedFields = JSON.parse(data.fields);
        setFields(parsedFields);

        // Initialize form data
        const initialData: Record<string, string> = {};
        parsedFields.forEach((field: FormField) => {
          initialData[field.name] = "";
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error("Failed to fetch form", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/forms/${resolvedParams.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitted(true);
        setContactId(result.contact.id);
        if (result.assignedUser) {
          setAssignedUser(result.assignedUser);
        }
      }
    } catch (error) {
      alert("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !contactId || !assignedUser) return;

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          userId: assignedUser.id,
          scheduledAt: selectedSlot.toISOString(),
          duration: 30,
        }),
      });

      if (response.ok) {
        setBookingSuccess(true);
      } else {
        alert("Failed to book meeting. Please try again.");
      }
    } catch (error) {
      alert("Failed to book meeting. Please try again.");
    }
  };

  // State for time slots
  const [timeSlots, setTimeSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch available time slots from user's calendar
  const fetchAvailableSlots = async () => {
    if (!assignedUser) return;

    setLoadingSlots(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // Next 7 days

      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignedUser.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration: 30,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots.map((slot: any) => new Date(slot.start)));
      } else {
        // Fallback to hardcoded slots if calendar not connected
        alert('Calendar not available, showing default slots');
        setTimeSlots(generateFallbackTimeSlots());
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      alert('Failed to load availability');
      setTimeSlots(generateFallbackTimeSlots());
    } finally {
      setLoadingSlots(false);
    }
  };

  // Fallback function (same as original)
  const generateFallbackTimeSlots = () => {
    const slots: Date[] = [];
    const now = new Date();
    const startDay = new Date(now);
    startDay.setDate(startDay.getDate() + 1);
    startDay.setHours(9, 0, 0, 0);

    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(startDay);
      currentDay.setDate(currentDay.getDate() + day);

      if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue;

      for (let hour = 9; hour < 17; hour++) {
        const slot = new Date(currentDay);
        slot.setHours(hour, 0, 0, 0);
        slots.push(slot);
      }
    }

    return slots;
  };

  // Call fetchAvailableSlots when calendar is shown
  useEffect(() => {
    if (showCalendar && assignedUser) {
      fetchAvailableSlots();
    }
  }, [showCalendar, assignedUser]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Form Not Found</CardTitle>
            <CardDescription>This form does not exist or has been deleted.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    if (bookingSuccess) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle>Meeting Booked!</CardTitle>
                  <CardDescription>Your meeting has been scheduled successfully.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Meeting Details:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">With:</span> {assignedUser?.name}</p>
                  <p><span className="text-muted-foreground">Date:</span> {selectedSlot?.toLocaleDateString()}</p>
                  <p><span className="text-muted-foreground">Time:</span> {selectedSlot?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><span className="text-muted-foreground">Duration:</span> 30 minutes</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                A calendar invitation will be sent to your email.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (showCalendar && assignedUser) {
      const groupedSlots: { [key: string]: Date[] } = {};

      timeSlots.forEach((slot) => {
        const dateKey = slot.toLocaleDateString();
        if (!groupedSlots[dateKey]) {
          groupedSlots[dateKey] = [];
        }
        groupedSlots[dateKey].push(slot);
      });

      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select a Time Slot</CardTitle>
                  <CardDescription>Book a 30-minute meeting with {assignedUser.name}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(false)}
                >
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-muted-foreground">Loading available slots...</p>
                </div>
              ) : Object.keys(groupedSlots).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No available slots in the next 7 days</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSlots).map(([date, slots]) => (
                    <div key={date}>
                      <h3 className="font-semibold mb-3">{date}</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((slot) => (
                          <Button
                            key={slot.toISOString()}
                            variant={selectedSlot?.toISOString() === slot.toISOString() ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedSlot && (
                <div className="mt-6 pt-4 border-t">
                  <Button className="w-full" size="lg" onClick={handleBooking}>
                    Confirm Booking for {selectedSlot.toLocaleString()}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle>Thank You!</CardTitle>
                <CardDescription>Your information has been submitted successfully.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignedUser ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    You've been matched with:
                  </p>
                  <p className="font-semibold text-lg">{assignedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{assignedUser.email}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Book a meeting:</p>
                  <Button className="w-full" size="lg" onClick={() => setShowCalendar(true)}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Schedule a Call with {assignedUser.name.split(' ')[0]}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Click to view available time slots
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {assignedUser.name} will also receive your information and may reach out to you directly.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                We've received your information and will be in touch soon!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.description && (
            <CardDescription>{form.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={field.name}
                  type={field.type}
                  required={field.required}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.name]: e.target.value })
                  }
                />
              </div>
            ))}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Powered by RoundRobin
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
