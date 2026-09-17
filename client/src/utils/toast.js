import { toast } from "react-hot-toast";

export function showToast(message, tone = "success") {
  if (!message) return;
  if (tone === "error") return toast.error(message);
  if (tone === "info") return toast(message, { icon: "i" });
  return toast.success(message);
}
