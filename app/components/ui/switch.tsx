import * as React from "react"
import { cn } from "~/lib/utils"

const Switch = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <label className="inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            className="peer sr-only"
            ref={ref}
            {...props}
        />
        <div className={cn(
            "relative w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 peer-focus:ring-offset-background rounded-full peer transition-colors",
            "peer-checked:bg-primary",
            "after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm",
            "peer-checked:after:translate-x-full peer-checked:after:border-white",
            className
        )}></div>
    </label>
))
Switch.displayName = "Switch"

export { Switch }
