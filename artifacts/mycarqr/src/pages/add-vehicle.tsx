import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCreateVehicle, getGetVehiclesQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Car } from "lucide-react";
import { Link } from "wouter";
import { UpgradeModal } from "@/components/premium-gate";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";

const schema = z.object({
  ownerName: z.string().min(2, "Name is required"),
  vehicleType: z.enum(["car", "bike", "scooter", "commercial"]),
  vehicleNumber: z.string().min(3, "Vehicle number required"),
  brand: z.string().min(1, "Brand required"),
  model: z.string().min(1, "Model required"),
  color: z.string().min(1, "Color required"),
  primaryContact: z.string().min(10, "Valid phone number required"),
  whatsappNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  preferredContactMethod: z.enum(["call", "whatsapp", "both"]),
  privacyMode: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function AddVehicle() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createVehicle = useCreateVehicle();
  const { data: me } = useGetMe();
  const { open, openModal, setOpen } = useUpgradeModal();

  // Free users can only have 1 vehicle
  const isBlocked = me?.plan === "free" && (me?.vehicleCount ?? 0) >= 1;

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

  async function onSubmit(data: FormData) {
    createVehicle.mutate({ data }, {
      onSuccess: (vehicle) => {
        queryClient.invalidateQueries({ queryKey: getGetVehiclesQueryKey() });
        toast({ title: "Vehicle added!", description: "Your QR code has been generated." });
        setLocation(`/vehicles/${vehicle.id}`);
      },
      onError: (err: any) => {
        const detail = err?.data?.error || err?.message || "Please try again.";
        toast({ title: "Failed to add vehicle", description: detail, variant: "destructive" });
      },
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <UpgradeModal open={open} onOpenChange={setOpen} featureName="Multiple Vehicles" />

      <div className="flex items-center gap-3">
        <Link href="/vehicles">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Vehicle</h1>
          <p className="text-muted-foreground text-sm">Register your vehicle and get a smart QR code</p>
        </div>
      </div>

      {isBlocked && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold">Multiple Vehicles — Premium Feature</h3>
          <p className="text-sm text-muted-foreground">The Free plan includes 1 vehicle. Upgrade to Premium to add unlimited vehicles.</p>
          <Button onClick={openModal} className="gap-2">Upgrade to Premium</Button>
        </div>
      )}

      {!isBlocked && <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" />Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="ownerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} data-testid="input-owner-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="vehicleType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl><Input placeholder="e.g. Toyota" {...field} data-testid="input-brand" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input placeholder="e.g. Camry" {...field} data-testid="input-model" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="vehicleNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl><Input placeholder="e.g. MH01AB1234" {...field} data-testid="input-vehicle-number" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl><Input placeholder="e.g. White" {...field} data-testid="input-color" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="primaryContact" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Contact Number</FormLabel>
                  <FormControl><Input placeholder="+91 9999999999" {...field} data-testid="input-primary-contact" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number (optional)</FormLabel>
                  <FormControl><Input placeholder="+91 9999999999" {...field} data-testid="input-whatsapp" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact (optional)</FormLabel>
                  <FormControl><Input placeholder="+91 9999999999" {...field} data-testid="input-emergency-contact" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="preferredContactMethod" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Contact Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-contact-method">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="call">Call Only</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                      <SelectItem value="both">Both Call & WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <FormField control={form.control} name="privacyMode" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel className="text-base font-semibold">Privacy Mode</FormLabel>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Hide your phone number from the public scan page. Scanners can still send you in-app alerts.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-privacy-mode" />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={createVehicle.isPending} data-testid="button-submit-vehicle">
            {createVehicle.isPending ? "Adding vehicle..." : "Add Vehicle & Generate QR"}
          </Button>
        </form>
      </Form>}
    </div>
  );
}
