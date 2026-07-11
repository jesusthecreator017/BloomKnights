import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

const glassBadgeVariants = cva(
	cn(
		"inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
		"backdrop-blur-xl border transition-all duration-300",
	),
	{
		variants: {
			variant: {
				default: "bg-white/15 border-white/25 text-white",
				primary: cn(
					"bg-linear-to-r from-navy-500/30 to-navy-700/30",
					"border-navy-400/30 text-navy-100",
				),
				success: cn("bg-forest-500/20 border-forest-400/30 text-forest-100"),
				warning: cn("bg-amber-500/20 border-amber-400/30 text-amber-100"),
				destructive: cn("bg-red-500/20 border-red-400/30 text-red-100"),
				outline: "bg-transparent border-white/30 text-white/80",
			},
			size: {
				sm: "px-2 py-0.5 text-xs",
				md: "px-3 py-1 text-sm",
				lg: "px-4 py-2 text-base",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	},
);

export interface GlassBadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof glassBadgeVariants> {}

function GlassBadge({ className, variant, ...props }: GlassBadgeProps) {
	return (
		<div
			className={cn(glassBadgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { GlassBadge, glassBadgeVariants };
