import { useState } from "react";

export function useUpgradeModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false), setOpen };
}
