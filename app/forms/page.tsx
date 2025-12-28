"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Pencil, Trash2, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  isActive: boolean;
  _count: {
    submissions: number;
  };
};

const AVAILABLE_FIELDS = [
  { name: "name", label: "Full Name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: false },
  { name: "company", label: "Company", type: "text", required: false },
  { name: "jobTitle", label: "Job Title", type: "text", required: false },
  { name: "leadSource", label: "Lead Source", type: "text", required: false },
  { name: "industry", label: "Industry", type: "text", required: false },
  { name: "country", label: "Country", type: "text", required: false },
  { name: "companySize", label: "Company Size", type: "text", required: false },
];

type FormSubmission = {
  id: string;
  formId: string;
  contactId: string | null;
  data: any;
  createdAt: string;
};

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedFields, setSelectedFields] = useState<string[]>(["name", "email"]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [selectedFormSubmissions, setSelectedFormSubmissions] = useState<FormSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedFormName, setSelectedFormName] = useState("");

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch("/api/forms");
      const data = await response.json();
      if (Array.isArray(data)) {
        setForms(data);
      } else {
        setForms([]);
      }
    } catch (error) {
      toast.error("Failed to fetch forms");
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fields = AVAILABLE_FIELDS.filter((f) => selectedFields.includes(f.name));

    try {
      const url = editingForm ? `/api/forms/${editingForm.id}` : "/api/forms";
      const method = editingForm ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          fields,
        }),
      });

      if (response.ok) {
        toast.success(editingForm ? "Form updated" : "Form created");
        setOpen(false);
        resetForm();
        fetchForms();
      }
    } catch (error) {
      toast.error(editingForm ? "Failed to update form" : "Failed to create form");
    }
  };

  const openEditForm = (form: Form) => {
    setEditingForm(form);
    setFormData({
      name: form.name,
      description: form.description || "",
    });

    try {
      const fields: FormField[] = JSON.parse(form.fields);
      setSelectedFields(fields.map((f) => f.name));
    } catch {
      setSelectedFields(["name", "email"]);
    }

    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return;

    try {
      const response = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Form deleted");
        fetchForms();
      }
    } catch (error) {
      toast.error("Failed to delete form");
    }
  };

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(link);
    toast.success("Form link copied to clipboard!");
  };

  const resetForm = () => {
    setEditingForm(null);
    setFormData({
      name: "",
      description: "",
    });
    setSelectedFields(["name", "email"]);
  };

  const fetchSubmissions = async (formId: string, formName: string) => {
    setLoadingSubmissions(true);
    setSelectedFormName(formName);
    setShowSubmissions(true);
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`);
      const data = await response.json();
      setSelectedFormSubmissions(data.submissions || []);
    } catch (error) {
      toast.error("Failed to fetch submissions");
      setSelectedFormSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const toggleField = (fieldName: string) => {
    if (selectedFields.includes(fieldName)) {
      // Don't allow removing name and email (required)
      if (fieldName === "name" || fieldName === "email") {
        toast.error("Name and Email are required fields");
        return;
      }
      setSelectedFields(selectedFields.filter((f) => f !== fieldName));
    } else {
      setSelectedFields([...selectedFields, fieldName]);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Forms
            </h1>
            <p className="text-muted-foreground text-lg">
              Create forms that auto-route contacts and book meetings
            </p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200">
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingForm ? "Edit Form" : "Create New Form"}</DialogTitle>
                <DialogDescription>
                  {editingForm ? "Update your form settings and fields" : "Build a form to capture leads and auto-route them"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Form Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="e.g., Contact Us, Demo Request"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>

                  <div>
                    <Label className="mb-3 block">Select Form Fields</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_FIELDS.map((field) => {
                        const isSelected = selectedFields.includes(field.name);
                        const isRequired = field.name === "name" || field.name === "email";
                        return (
                          <button
                            key={field.name}
                            type="button"
                            onClick={() => toggleField(field.name)}
                            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{field.label}</span>
                              {isRequired && (
                                <Badge variant="secondary" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {field.type}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit">{editingForm ? "Update Form" : "Create Form"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground font-medium">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm card-elevated">
            <CardContent className="text-center py-20">
              <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-primary/20 text-primary mb-4 border-2 border-primary/30 shadow-sm">
                <FileText className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No forms yet</h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Create your first form to capture and route leads
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => {
              let fields: FormField[] = [];
              try {
                fields = JSON.parse(form.fields);
              } catch {}

              return (
                <Card key={form.id} className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm card-elevated-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        {form.description && (
                          <CardDescription className="mt-1">
                            {form.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={form.isActive ? "default" : "secondary"}>
                        {form.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <div className="text-muted-foreground">Fields: {fields.length}</div>
                      <div className="text-muted-foreground">
                        Submissions: {form._count.submissions}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => fetchSubmissions(form.id, form.name)}
                        disabled={form._count.submissions === 0}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View Submissions ({form._count.submissions})
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => copyFormLink(form.id)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/f/${form.id}`, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(form)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(form.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submissions Full View */}
        <Dialog open={showSubmissions} onOpenChange={setShowSubmissions}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl">Form Submissions</DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    {selectedFormName} - {selectedFormSubmissions.length} total submissions
                  </DialogDescription>
                </div>
                <Button variant="outline" onClick={() => setShowSubmissions(false)}>
                  Close
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingSubmissions ? (
                <div className="text-center py-20">
                  <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-4 text-muted-foreground text-lg">Loading submissions...</p>
                </div>
              ) : selectedFormSubmissions.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg">No submissions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Submitted
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          Status
                        </th>
                        {selectedFormSubmissions.length > 0 &&
                          Object.keys(selectedFormSubmissions[0].data).map((key) => (
                            <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              {key}
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedFormSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(submission.createdAt).toLocaleDateString()} <br />
                            <span className="text-xs text-gray-500">
                              {new Date(submission.createdAt).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {submission.contactId ? (
                              <Badge variant="default">Contact Created</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          {Object.entries(submission.data).map(([key, value]) => (
                            <td key={key} className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {value as string || <span className="text-gray-400">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
