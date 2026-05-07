import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGetVehicle, getGetVehicleQueryKey, useUpdateVehicle, getGetVehiclesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  ownerName: z.string().min(2),
  vehicleType: z.enum(["car", "bike", "scooter", "commercial"]),
  vehicleNumber: z.string().min(3),
  brand: z.string().min(1),
  model: z.string().min(1),
  color: z.string().min(1),
  primaryContact: z.string().min(10),
  whatsappNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  preferredContactMethod: z.enum(["call", "whatsapp", "both"]),
  privacyMode: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function EditVehicle() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateVehicle = useUpdateVehicle();

  const { data: vehicle, isLoading } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId, queryKey: getGetVehicleQueryKey(vehicleId) }
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      ownerName: "",
      vehicleType: "car",
      vehicleNumber: "",
      brand: "",
      model: "",
      color: "",
      primaryContact: "",
      whatsappNumber: "",
      emergencyContact: "",
      preferredContactMethod: "call",
      privacyMode: false,
    },
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        ownerName: vehicle.ownerName,
        vehicleType: vehicle.vehicleType as any,
        vehicleNumber: vehicle.vehicleNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        color: vehicle.color,
        primaryContact: vehicle.primaryContact,
        whatsappNumber: vehicle.whatsappNumber || "",
        emergencyContact: vehicle.emergencyContact || "",
        preferredContactMethod: vehicle.preferredContactMethod as any,
        privacyMode: vehicle.privacyMode,
      });
    }
  }, [vehicle, form]);

  async function onSubmit(data: FormData) {
    updateVehicle.mutate({ vehicleId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(vehicleId) });
        queryClient.invalidateQueries({ queryKey: getGetVehiclesQueryKey() });
        toast({ title: "Vehicle updated!" });
        setLocation(`/vehicles/${vehicleId}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update vehicle.", variant: "destructive" });
      },
    });
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/vehicles/${vehicleId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Vehicle</h1>
          <p className="text-muted-foreground text-sm">{vehicle?.vehicleNumber}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="ownerName" render={({ field }) => (
                <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} data-testid="input-owner-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicleType" render={({ field }) => (
                <FormItem><FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-vehicle-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} data-testid="input-brand" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} data-testid="input-model" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="vehicleNumber" render={({ field }) => (
                  <FormItem><FormLabel>Vehicle Number</FormLabel><FormControl><Input {...field} data-testid="input-vehicle-number" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} data-testid="input-color" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="primaryContact" render={({ field }) => (
                <FormItem><FormLabel>Primary Contact</FormLabel><FormControl><Input {...field} data-testid="input-primary-contact" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                <FormItem><FormLabel>WhatsApp (optional)</FormLabel><FormControl><Input {...field} data-testid="input-whatsapp" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                <FormItem><FormLabel>Emergency Contact (optional)</FormLabel><FormControl><Input {...field} data-testid="input-emergency-contact" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="preferredContactMethod" render={({ field }) => (
                <FormItem><FormLabel>Preferred Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-contact-method"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="call">Call Only</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <FormField control={form.control} name="privacyMode" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel className="font-semibold">Privacy Mode</FormLabel>
                    <p className="text-sm text-muted-foreground">Hide contact from public scan page</p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-privacy-mode" /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={updateVehicle.isPending} data-testid="button-submit">
            {updateVehicle.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
