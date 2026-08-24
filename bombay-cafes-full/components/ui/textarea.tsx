import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[108px] w-full rounded-lg border border-white/14 bg-white/[0.04] px-3.5 py-3 text-[15px] leading-relaxed text-paper placeholder:text-paper/35 transition-colors focus-visible:border-white/40 focus-visible:outline-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
export { Textarea };
