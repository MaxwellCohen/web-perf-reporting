"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { radixClassForward } from "@/components/ui/radixClassForward";
import { contentPrimitiveStyles, listContainerStyles, triggerStyles } from "@/lib/ui-classes";

const Tabs = TabsPrimitive.Root;

const TabsList = radixClassForward(TabsPrimitive.List, listContainerStyles);
const TabsTrigger = radixClassForward(TabsPrimitive.Trigger, triggerStyles);
const TabsContent = radixClassForward(TabsPrimitive.Content, contentPrimitiveStyles);

export { Tabs, TabsList, TabsTrigger, TabsContent };
