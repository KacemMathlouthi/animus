import { Button } from "@/components/ui/button";

// Footer with a Save button that enables only when there are unsaved changes,
// plus a Reset to discard them.
export function SettingsSaveBar({
	dirty,
	onSave,
	onReset,
	saving = false,
}: {
	dirty: boolean;
	onSave: () => void;
	onReset: () => void;
	/** Disable the controls and show a pending label while a save is in flight. */
	saving?: boolean;
}) {
	return (
		<div className="mt-2 flex items-center justify-end gap-2 border-t pt-5">
			{dirty ? (
				<Button
					className="animate-in fade-in slide-in-from-right-1 duration-150 ease-snappy"
					disabled={saving}
					onClick={onReset}
					variant="ghost"
				>
					Reset
				</Button>
			) : null}
			<Button disabled={!dirty || saving} onClick={onSave}>
				{saving ? "Saving…" : "Save changes"}
			</Button>
		</div>
	);
}
