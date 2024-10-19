import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "~/components/ui/multi-select";

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Incident title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"], {
    required_error: "Please select a status.",
  }),
  impact: z.enum(["none", "minor", "major", "critical"], {
    required_error: "Please select an impact level.",
  }),
  serviceIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Service = {
  id: string;
  name: string;
};

type ServiceOption = {
  value: string;
  label: string;
};

type IncidentFormProps = {
  initialData?: FormValues;
  onSubmit: (data: FormValues) => void;
  isSubmitting: boolean;
  services: Service[];
};

export function IncidentForm({
  initialData,
  onSubmit,
  isSubmitting,
  services,
}: IncidentFormProps) {
  // Convert services to options
  const serviceOptions: ServiceOption[] = services.map((service) => ({
    value: service.id,
    label: service.name,
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      status: "investigating",
      impact: "none",
      serviceIds: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incident Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter incident title" {...field} />
              </FormControl>
              <FormDescription>
                A brief title describing the incident.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter incident description" {...field} />
              </FormControl>
              <FormDescription>
                Detailed description of the incident (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The current status of the incident.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="impact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impact</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The impact level of the incident.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serviceIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Affected Services</FormLabel>
              <MultiSelector
                onValuesChange={(values) => field.onChange(values)}
                values={field.value || []}
                options={serviceOptions}
              >
                <MultiSelectorTrigger>
                  <MultiSelectorInput placeholder="Select affected services" />
                </MultiSelectorTrigger>
                <MultiSelectorContent>
                  <MultiSelectorList>
                    {serviceOptions.map((option) => (
                      <MultiSelectorItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MultiSelectorItem>
                    ))}
                  </MultiSelectorList>
                </MultiSelectorContent>
              </MultiSelector>
              <FormDescription>
                Select the services affected by this incident.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Submitting..."
            : initialData
            ? "Update Incident"
            : "Add Incident"}
        </Button>
      </form>
    </Form>
  );
}
