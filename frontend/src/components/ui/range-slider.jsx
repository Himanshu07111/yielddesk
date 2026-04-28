import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const RangeSlider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden bg-[#1e2a40]">
      <SliderPrimitive.Range className="absolute h-full bg-[#FFA500]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3.5 w-3.5 border-2 border-[#FFA500] bg-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500] disabled:pointer-events-none disabled:opacity-50" />
    <SliderPrimitive.Thumb className="block h-3.5 w-3.5 border-2 border-[#FFA500] bg-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500] disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
RangeSlider.displayName = "RangeSlider";

export { RangeSlider };
