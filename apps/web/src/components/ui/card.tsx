import * as React from "react";

import { cn } from "@/lib/cn";

function forwardCardDiv(displayName: string, defaultClass: string) {
  const Comp = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={cn(defaultClass, className)} {...props} />
    ),
  );
  Comp.displayName = displayName;
  return Comp;
}

const Card = forwardCardDiv("Card", "rounded-xl border bg-card text-card-foreground shadow");
const CardHeader = forwardCardDiv("CardHeader", "flex flex-col space-y-1.5 p-6");
const CardTitle = forwardCardDiv("CardTitle", "font-semibold leading-none tracking-tight");
const CardDescription = forwardCardDiv("CardDescription", "text-sm text-muted-foreground");
const CardContent = forwardCardDiv("CardContent", "p-6 pt-0");
const CardFooter = forwardCardDiv("CardFooter", "flex items-center p-6 pt-0");

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
