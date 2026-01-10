"use client";
import { useContext, useMemo } from "react";
import { InsightsContext } from "../PageSpeedContext";
import { AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
import { AuditDetailTable, TableItem } from "@/lib/schema";
import { BootupTimeCard } from "./BootupTimeCard";
import { MainThreadWorkCard } from "./MainThreadWorkCard";
import { UnusedJavaScriptCard } from "./UnusedJavaScriptCard";
import { UnminifiedJavaScriptCard } from "./UnminifiedJavaScriptCard";
import { LegacyJavaScriptCard } from "./LegacyJavaScriptCard";
import { JavaScriptSummaryCard } from "./JavaScriptSummaryCard";

export function JavaScriptPerformanceComponent() {
  const items = useContext(InsightsContext);
  
  const jsMetrics = useMemo(() => {
    return items.map(({ item, label }) => {
      // Get bootup time audit
      const bootupTimeAudit = item?.lighthouseResult?.audits?.['bootup-time'];
      const bootupTimeDetails = bootupTimeAudit?.details as AuditDetailTable;
      
      // Get main thread work breakdown audit
      const mainThreadWorkAudit = item?.lighthouseResult?.audits?.['mainthread-work-breakdown'];
      const mainThreadWorkDetails = mainThreadWorkAudit?.details as AuditDetailTable;
      
      // Get unused JavaScript audit
      const unusedJSAudit = item?.lighthouseResult?.audits?.['unused-javascript'];
      const unusedJSDetails = unusedJSAudit?.details as AuditDetailTable;
      
      // Get unminified JavaScript audit
      const unminifiedJSAudit = item?.lighthouseResult?.audits?.['unminified-javascript'];
      const unminifiedJSDetails = unminifiedJSAudit?.details as AuditDetailTable;
      
      // Get legacy JavaScript audit
      const legacyJSAudit = item?.lighthouseResult?.audits?.['legacy-javascript-insight'];
      const legacyJSDetails = legacyJSAudit?.details as AuditDetailTable;
      
      // Get network requests to filter JavaScript resources
      const networkRequestsAudit = item?.lighthouseResult?.audits?.['network-requests'];
      const networkRequestsDetails = networkRequestsAudit?.details as AuditDetailTable;
      const jsResources = (networkRequestsDetails?.items || []).filter((item: TableItem) => {
        const resourceType = item?.resourceType;
        return typeof resourceType === 'string' && resourceType.toLowerCase() === 'script';
      });
      
      return {
        label,
        bootupTime: bootupTimeDetails?.items || [],
        mainThreadWork: mainThreadWorkDetails?.items || [],
        unusedJS: unusedJSDetails?.items || [],
        unminifiedJS: unminifiedJSDetails?.items || [],
        legacyJS: legacyJSDetails?.items || [],
        jsResources: jsResources,
      };
    });
  }, [items]);

  // Calculate JavaScript statistics
  const jsStats = useMemo(() => {
    return jsMetrics.map(({ jsResources, label }) => {
      if (!jsResources.length) {
        return {
          label,
          totalScripts: 0,
          totalTransferSize: 0,
          totalResourceSize: 0,
        };
      }
      
      const totalScripts = jsResources.length;
      const totalTransferSize = jsResources.reduce((acc, curr) => {
        const value = curr?.transferSize;
        return acc + (typeof value === 'number' ? value : 0);
      }, 0);
      const totalResourceSize = jsResources.reduce((acc, curr) => {
        const value = curr?.resourceSize;
        return acc + (typeof value === 'number' ? value : 0);
      }, 0);
      
      return {
        label,
        totalScripts,
        totalTransferSize,
        totalResourceSize,
      };
    });
  }, [jsMetrics]);

  if (!items.length) {
    return null;
  }

  return (
    <AccordionItem value={'javascriptPerformance'}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">JavaScript Performance</div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <JavaScriptSummaryCard stats={jsStats} />
          <BootupTimeCard metrics={jsMetrics.map(({ label, bootupTime }) => ({ label, bootupTime }))} />
          <MainThreadWorkCard metrics={jsMetrics.map(({ label, mainThreadWork }) => ({ label, mainThreadWork }))} />
          <UnusedJavaScriptCard metrics={jsMetrics.map(({ label, unusedJS }) => ({ label, unusedJS }))} />
          <UnminifiedJavaScriptCard metrics={jsMetrics.map(({ label, unminifiedJS }) => ({ label, unminifiedJS }))} />
          <LegacyJavaScriptCard metrics={jsMetrics.map(({ label, legacyJS }) => ({ label, legacyJS }))} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

