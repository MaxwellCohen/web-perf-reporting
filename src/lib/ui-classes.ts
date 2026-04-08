export const overlayStyles = "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const contentStyles = "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg";

export const focusRingStyles = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const transitionOpacityStyles = "transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none";

export const dialogCloseButtonStyles = "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background data-[state=open]:bg-accent data-[state=open]:text-muted-foreground";

export const listContainerStyles = "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground";

export const triggerStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow";

export const contentPrimitiveStyles = "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const labelStyles = "px-2 py-1.5 text-sm font-semibold";

export const separatorStyles = "-mx-1 my-1 h-px bg-muted";

export const dropdownLabelStyles = labelStyles;

export const selectScrollEdgeButtonStyles = "flex cursor-default items-center justify-center py-1";

export const contentPrimitiveScrollStyles = "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

export const itemStyles = "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const checkableMenuItemStyles = "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const checkboxItemStyles = checkableMenuItemStyles;

export const itemIndicatorStyles = "absolute left-2 flex h-3.5 w-3.5 items-center justify-center";

export const accordionContentStyles = "overflow-hidden text-sm";

export const titleStyles = "text-lg font-semibold leading-none tracking-tight";

export const descriptionStyles = "text-sm text-muted-foreground";

export const headerStyles = "flex flex-col space-y-1.5 text-center sm:text-left";

export const footerStyles = "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2";

export const navigationTriggerStyles = "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50";

export const navigationContentStyles = "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto";

export const dropdownSubContentStyles = "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";
