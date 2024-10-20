import { useState, useEffect } from "react";
import { useNavigate, MetaFunction } from "@remix-run/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSupabase } from "~/hooks/useSupabase";
import { useUser } from "~/hooks/useUser";
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
import { toast } from "~/hooks/use-toast";
import { metaGenerator } from "~/utils/metaGenerator";
import { useDebounce } from "~/hooks/useDebounce";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  }),
  slug: z
    .string()
    .min(2, {
      message: "Slug must be at least 2 characters.",
    })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        "Slug must contain only lowercase letters, numbers, and hyphens.",
    }),
});

export const meta: MetaFunction = () => {
  return metaGenerator({
    title: "Create Organization",
    description:
      "Set up your new organization to start monitoring your services.",
  });
};

export default function CreateOrganization() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const supabase = useSupabase();
  const { user } = useUser();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const slug = form.watch("slug");
  const debouncedSlug = useDebounce(slug, 500);

  useEffect(() => {
    async function checkSlugAvailability() {
      if (debouncedSlug.length < 2) {
        setIsSlugAvailable(null);
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", debouncedSlug)
        .maybeSingle();

      if (error) {
        console.error("Error checking slug availability:", error);
        return;
      }

      setIsSlugAvailable(data === null);
    }

    checkSlugAvailability();
  }, [debouncedSlug, supabase]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an organization.",
        variant: "destructive",
      });
      return;
    }

    if (!isSlugAvailable) {
      toast({
        title: "Error",
        description: "The chosen slug is not available. Please choose another.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name: values.name, slug: values.slug, created_by: user.id })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("users")
        .update({ organization_id: data.id, role: "admin" })
        .eq("id", user.id);

      toast({
        title: "Success",
        description: "Organization created successfully.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-md space-y-6"
        >
          <h1 className="text-2xl font-bold">Create Your Organization</h1>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} />
                </FormControl>
                <FormDescription>
                  This is your organization's display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Slug</FormLabel>
                <FormControl>
                  <Input placeholder="acme-inc" {...field} />
                </FormControl>
                <FormDescription>
                  This will be used in URLs and API requests.
                </FormDescription>
                {debouncedSlug.length >= 2 && (
                  <p
                    className={
                      isSlugAvailable ? "text-green-600" : "text-red-600"
                    }
                  >
                    {isSlugAvailable
                      ? "✓ Slug is available"
                      : "✗ Slug is not available"}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading || !isSlugAvailable}>
            {isLoading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
