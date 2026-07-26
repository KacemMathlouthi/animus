import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareDialogLinks } from "@/features/studio/components/share-dialog-links";

// The share link is created lazily inside ShareDialogLinks, which mounts only
// while the dialog is open — so merely having a video doesn't publish it.
export function ShareDialog({
  videoKey,
  title,
  open,
  onOpenChange,
}: {
  videoKey: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share video</DialogTitle>
          <DialogDescription>
            Anyone with this link can watch the video. The link stays live.
          </DialogDescription>
        </DialogHeader>
        <ShareDialogLinks title={title} videoKey={videoKey} />
      </DialogContent>
    </Dialog>
  );
}
