import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "#/lib/utils.ts";

const glassButtonVariants = cva(
	cn(
		"relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl cursor-pointer",
		"text-sm font-medium transition-all duration-300 ease-out",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
		"disabled:pointer-events-none disabled:opacity-50",
		"hover:scale-105 active:scale-95",
		"[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	),
	{
		variants: {
			variant: {
				// theme-aware (foreground/background tokens) since these sit
				// directly on the page shell, not always on a dark glass card
				default: cn(
					"bg-foreground/10 backdrop-blur-xl border border-foreground/20 text-foreground",
					"shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
					"hover:bg-foreground/15 hover:border-foreground/30",
					"before:absolute before:inset-0 before:rounded-xl",
					"before:bg-linear-to-b before:from-white/25 before:to-transparent before:pointer-events-none before:opacity-70",
				),
				primary: cn(
					"bg-linear-to-r from-forest-500/80 via-forest-600/70 to-navy-700/80",
					"backdrop-blur-xl border border-white/30 text-white",
					"shadow-[0_4px_20px_rgba(24,62,128,0.4)]",
					"hover:shadow-[0_4px_30px_rgba(24,62,128,0.6)]",
					"before:absolute before:inset-0 before:rounded-xl",
					"before:bg-linear-to-b before:from-white/30 before:to-transparent before:pointer-events-none",
				),
				outline: cn(
					"bg-transparent backdrop-blur-sm border-2 border-foreground/30 text-foreground",
					"hover:bg-foreground/10 hover:border-foreground/50",
				),
				ghost: cn(
					"bg-transparent text-foreground/70",
					"hover:bg-foreground/10 hover:text-foreground",
				),
				destructive: cn(
					"bg-red-500/30 backdrop-blur-xl border border-red-400/40 text-red-100",
					"shadow-[0_4px_16px_rgba(239,68,68,0.3)]",
					"hover:bg-red-500/40 hover:border-red-400/60",
					"before:absolute before:inset-0 before:rounded-xl",
					"before:bg-linear-to-b before:from-white/10 before:to-transparent before:pointer-events-none",
				),
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-8 px-3 text-xs",
				lg: "h-12 px-6 text-base",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface GlassButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof glassButtonVariants> {
	glowEffect?: boolean;
	asChild?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
	(
		{
			className,
			variant,
			asChild = false,
			size,
			glowEffect = false,
			children,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		return (
			<div className="relative inline-block">
				{glowEffect && (
					<div className="absolute -inset-1 rounded-xl bg-linear-to-r from-forest-400/40 via-forest-500/40 to-navy-600/40 blur-lg opacity-70 transition-opacity group-hover:opacity-100" />
				)}
				<Comp
					className={cn(glassButtonVariants({ variant, size, className }))}
					ref={ref}
					{...props}
				>
					<span className="relative z-10 flex items-center gap-2">
						{children}
					</span>
				</Comp>
			</div>
		);
	},
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
