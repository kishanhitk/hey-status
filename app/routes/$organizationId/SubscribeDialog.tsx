import { useState } from "react";
import { Button } from "~/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "~/hooks/use-toast";
import { useSupabase } from "~/hooks/useSupabase";

export function SubscribeDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useSupabase();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("subscribers")
      .insert({ organization_id: organizationId, email });

    if (error) {
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subscribed successfully",
        description: "You will now receive updates for this organization.",
      });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Subscribe to Updates</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Subscribe to Updates</DialogTitle>
          <DialogDescription>
            Enter your email to receive updates about incidents and maintenance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubscribe} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <Button type="submit" className="ml-auto">
            Subscribe
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
