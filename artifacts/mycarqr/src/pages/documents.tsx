import { useState } from "react";
import { FileText, Plus, Trash2, Edit, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetDocuments, getGetDocumentsQueryKey, useCreateDocument, useDeleteDocument, useGetVehicles } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

const schema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  documentType: z.enum(["insurance", "pollution", "registration", "service"]),
  expiryDate: z.string().min(1, "Expiry date required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const docTypeLabels: Record<string, string> = {
  insurance: "Insurance",
  pollution: "Pollution Certificate",
  registration: "Registration",
  service: "Service Due",
};

const statusConfig = {
  up_to_date: { label: "Up to date", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle },
  expiring_soon: { label: "Expiring soon", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: Clock },
  expired: { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: AlertTriangle },
};

export default function Documents() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: docs, isLoading } = useGetDocuments({}, { query: { queryKey: getGetDocumentsQueryKey({}) } });
  const { data: vehicles } = useGetVehicles();
  const createDoc = useCreateDocument();
  const deleteDoc = useDeleteDocument();

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: { vehicleId: "", documentType: "insurance", expiryDate: "", notes: "" },
  });

  async function onSubmit(data: FormData) {
    createDoc.mutate({ data: { vehicleId: parseInt(data.vehicleId), documentType: data.documentType, expiryDate: data.expiryDate, notes: data.notes } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({}) });
        toast({ title: "Document added!" });
        setOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  }

  function handleDelete(documentId: number) {
    if (!confirm("Delete this document reminder?")) return;
    deleteDoc.mutate({ documentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({}) });
        toast({ title: "Document removed" });
      },
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Reminders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track insurance, pollution, registration, and service dates</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-add-document">
          <Plus className="w-4 h-4 mr-2" />Add Document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : docs?.length === 0 ? (
        <div className="rounded-2xl border bg-muted/20 p-16 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-semibold text-lg mb-2">No documents yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Add document dates to get expiry reminders.</p>
          <Button onClick={() => setOpen(true)} data-testid="button-add-first-document">
            <Plus className="w-4 h-4 mr-2" />Add Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {docs!.map((doc) => {
            const status = statusConfig[doc.status as keyof typeof statusConfig];
            const StatusIcon = status?.icon || CheckCircle;
            return (
              <Card key={doc.id} data-testid={`doc-item-${doc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", status?.color)}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{docTypeLabels[doc.documentType] || doc.documentType}</span>
                        {doc.vehicleNumber && <span className="text-xs text-muted-foreground">{doc.vehicleNumber}</span>}
                        {status && <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                        {doc.notes && ` · ${doc.notes}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(doc.id)}
                      data-testid={`button-delete-doc-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Document Reminder</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem><FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {vehicles?.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.vehicleNumber} — {v.brand} {v.model}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="documentType" render={({ field }) => (
                <FormItem><FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-doc-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="pollution">Pollution Certificate</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="service">Service Due</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem><FormLabel>Expiry Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-expiry-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. Policy #12345" {...field} data-testid="input-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createDoc.isPending} data-testid="button-submit-document">
                  {createDoc.isPending ? "Adding..." : "Add Document"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
