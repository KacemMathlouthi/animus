/** The credit-depletion dialog. Opens when a metered turn is refused (the chat
 * transport signals `out-of-credits`), pointing the user at BYOK — the way to
 * keep generating for free. Mounted once in the app header. */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { onOutOfCredits } from "@/lib/credit-events";

export function OutOfCreditsDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => onOutOfCredits(() => setOpen(true)), []);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You're out of credits</DialogTitle>
          <DialogDescription>
            Your free credits are used up. Add your own keys to keep generating
            for free: a model key for the writing and an ElevenLabs key for the
            narration. Whichever you bring runs on your own account, with no
            limit.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="ghost">
            Not now
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              navigate("/settings/secrets");
            }}
          >
            Add your keys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
