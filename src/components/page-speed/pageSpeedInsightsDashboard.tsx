/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  TableHeader,
  TableRow,
  Table,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  AuditDetailChecklistSchema,
  AuditDetailFilmstripSchema,
  AuditRef,
  AuditResult,
  CategoryResult,
  Entities,
  FullPageScreenshot,
  PageSpeedInsights,
} from '@/lib/schema';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

import ReactMarkdown from 'react-markdown';

import { HorizontalScoreChart } from '@/components/common/PageSpeedGaugeChart';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { createContext, Fragment, useContext } from 'react';
import { Timeline } from './Timeline';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { ScoreDisplay, sortByScoreDisplayModes } from './ScoreDisplay';

const fullPageScreenshotContext = createContext<{
  desktopFullPageScreenshot: FullPageScreenshot | null;
  mobileFullPageScreenshot: FullPageScreenshot | null;
}>({
  desktopFullPageScreenshot: null,
  mobileFullPageScreenshot: null,
});

export function PageSpeedInsightsDashboard({
  desktopData,
  mobileData,
}: {
  desktopData?: PageSpeedInsights | null;
  mobileData?: PageSpeedInsights | null;
}) {
  const DesktopTimeline = AuditDetailFilmstripSchema.safeParse(
    desktopData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;
  const MobileTimeline = AuditDetailFilmstripSchema.safeParse(
    mobileData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;

  const desktopEntities: Entities | undefined =
    desktopData?.lighthouseResult?.entities;
  const desktopAuditRecords: AuditResult | undefined =
    desktopData?.lighthouseResult?.audits;
  const desktopCategories = desktopData?.lighthouseResult?.categories;
  const desktopCategoryGroups = desktopData?.lighthouseResult?.categoryGroups;
  const mobileAuditRecords: AuditResult | undefined =
    mobileData?.lighthouseResult?.audits;
  const mobileCategoryGroups = mobileData?.lighthouseResult?.categoryGroups;
  const mobileCategories = mobileData?.lighthouseResult?.categories;
  const desktopFullPageScreenshotData =
    desktopData?.lighthouseResult.fullPageScreenshot || null;
  const mobileFullPageScreenshotData =
    mobileData?.lighthouseResult.fullPageScreenshot || null;

  const categoryKeys = [
    ...new Set<string>([
      ...Object.keys(desktopCategories || {}),
      ...Object.keys(mobileCategories || {}),
    ]),
  ];

  console.log('categoryKeys', categoryKeys);

  return (
    <fullPageScreenshotContext.Provider
      value={{
        desktopFullPageScreenshot: desktopFullPageScreenshotData,
        mobileFullPageScreenshot: mobileFullPageScreenshotData,
      }}
    >
      <div
        style={
          {
            '--desktopFullPageScreenshot': `url(${desktopFullPageScreenshotData?.screenshot.data})`,
            '--mobileFullPageScreenshot': `url(${mobileFullPageScreenshotData?.screenshot.data})`,
          } as React.CSSProperties
        }
      >
        <Accordion
          type="multiple"
          defaultValue={[
            'page-loading-experience',
            'origin-loading-experience',
            'screenshot',
            'entities',
            'audits',
            ...Object.keys(desktopCategories || {}),
          ]}
        >
          <h2 className="text-center text-2xl font-bold">
            Report for{' '}
            {new Date(
              desktopData?.analysisUTCTimestamp ||
                mobileData?.analysisUTCTimestamp ||
                0,
            ).toLocaleDateString()}
          </h2>
          <LoadingExperience
            title="Page Loading Experience"
            experienceDesktop={desktopData?.loadingExperience}
            experienceMobile={mobileData?.loadingExperience}
          />
          <div className="screen:hidden print:break-before-page"></div>
          <LoadingExperience
            title="Origin Loading Experience"
            experienceDesktop={desktopData?.originLoadingExperience}
            experienceMobile={mobileData?.originLoadingExperience}
          />

          <div className="grid grid-rows-[auto_1fr] print:break-before-page">
            <CWVMetricsComponent
              desktopCategoryGroups={desktopCategoryGroups}
              desktopAudits={desktopAuditRecords}
              mobileCategoryGroups={mobileCategoryGroups}
              mobileAudits={mobileAuditRecords}
            />
            <div className="flex flex-row flex-wrap gap-2">
              <Timeline timeline={MobileTimeline} device="Mobile" />
              <Timeline timeline={DesktopTimeline} device="Desktop" />
            </div>
          </div>

          {categoryKeys
            .map((key) => ({
              key,
              desktopCategory: desktopCategories?.[key],
              mobileCategory: mobileCategories?.[key],
            }))
            .filter(({ desktopCategory, mobileCategory }) => {
              if (!desktopCategory && !mobileCategory) {
                return false;
              }
              if (desktopCategory?.id && mobileCategory?.id) {
                return desktopCategory.id === mobileCategory.id;
              }
              return true;
            })
            .map(({ key, desktopCategory, mobileCategory }) => (
              <CategoryAuditSection
                key={key}
                categoryKey={key}
                desktopCategory={desktopCategory}
                mobileCategory={mobileCategory}
                desktopAuditRecords={desktopAuditRecords}
                mobileAuditRecords={mobileAuditRecords}
              />
            ))}
          <AccordionItem value="entities">
            <AccordionTrigger>
              <div className="text-lg font-bold group-hover:underline">
                Entities
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <EntitiesTable entities={desktopEntities} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </fullPageScreenshotContext.Provider>
  );
}

function CategoryAuditSection({
  categoryKey,
  mobileCategory,
  desktopCategory,
  desktopAuditRecords,
  mobileAuditRecords,
}: {
  mobileCategory?: CategoryResult | null;
  desktopCategory?: CategoryResult | null;
  categoryKey: string;
  desktopAuditRecords?: AuditResult;
  mobileAuditRecords?: AuditResult;
}) {
  if (!desktopCategory || !mobileCategory) {
    return null;
  }
  return (
    <AccordionItem key={categoryKey} value={categoryKey}>
      <AccordionTrigger className="flex flex-row justify-start gap-2 text-lg font-bold">
        <div className="flex flex-1 flex-row flex-wrap items-center justify-between">
          <div className="flex w-[200px] whitespace-nowrap group-hover:underline">
            {desktopCategory?.title || mobileCategory?.title}
          </div>
          <CategoryScoreInfo category={mobileCategory} device="Mobile" />
          <CategoryScoreInfo category={desktopCategory} device="Desktop" />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="w-full" role="table" aria-label="Audit Table">
          {desktopCategory.auditRefs && desktopAuditRecords ? (
            <Accordion type="multiple">
              {desktopCategory.auditRefs
                .filter((auditRef) => {
                  if (!auditRef.id) {
                    return false;
                  }
                  if (auditRef.group === 'metrics') {
                    return false;
                  }
                  if (!auditRef.id) {
                    return null;
                  }
                  if (auditRef.group === 'metrics') {
                    return null;
                  }
                  const desktopAuditData = desktopAuditRecords?.[auditRef.id];
                  const mobileAuditData = mobileAuditRecords?.[auditRef.id];
                  if (!desktopAuditData && !mobileAuditData) {
                    return null;
                  }
                  if (
                    desktopAuditData?.details?.type !==
                    mobileAuditData?.details?.type
                  ) {
                    return null;
                  }

                  if (desktopAuditData?.details?.type === 'filmstrip') {
                    return null;
                  }
                  if (!desktopAuditData && !mobileAuditData) {
                    return false;
                  }
                  if (
                    desktopAuditData?.details?.type !==
                    mobileAuditData?.details?.type
                  ) {
                    return false;
                  }

                  if (desktopAuditData?.details?.type === 'filmstrip') {
                    return false;
                  }
                  return true;
                })
                .sort((a, b) => {
                  const aDetails =
                    desktopAuditRecords?.[a.id || ''] ||
                    mobileAuditRecords?.[a.id || ''];
                  const bDetails =
                    desktopAuditRecords?.[b.id || ''] ||
                    mobileAuditRecords?.[b.id || ''];

                  return sortByScoreDisplayModes(aDetails, bDetails);
                })
                .map((auditRef) => (
                  <AuditDetailsSection
                    key={auditRef.id}
                    auditRef={auditRef}
                    desktopAuditRecords={desktopAuditRecords || {}}
                    mobileAuditRecords={mobileAuditRecords || {}}
                    acronym={auditRef.acronym}
                  />
                ))}
            </Accordion>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function CategoryScoreInfo({
  category,
  device,
}: {
  category: CategoryResult;
  device: 'Mobile' | 'Desktop';
}) {
  if (!category.score) {
    return null;
  }
  return (
    <div className="flex-0 flex w-64 flex-col gap-2 align-top hover:no-underline">
      <div className="text-center text-xs hover:no-underline">
        {' '}
        {device} - {Math.round(category.score * 100)}
      </div>
      <HorizontalScoreChart
        score={category.score || 0}
        className="h-2 min-w-11 flex-1 overflow-hidden"
      />
    </div>
  );
}

function AuditDetailsSection({
  auditRef,
  desktopAuditRecords,
  mobileAuditRecords,
  acronym,
}: {
  auditRef: AuditRef;
  desktopAuditRecords: AuditResult;
  mobileAuditRecords: AuditResult;
  acronym?: string;
}) {
  const desktopAuditData = desktopAuditRecords?.[auditRef.id || ''];
  const mobileAuditData = mobileAuditRecords?.[auditRef.id || ''];
  const scoreDisplayMode =
    desktopAuditData.scoreDisplayMode ||
    mobileAuditData.scoreDisplayMode ||
    'numeric';

  let emptyTable = false;
  if ((desktopAuditData.details?.type === 'table' && desktopAuditData.details.items.length === 0 )&& (mobileAuditData.details?.type === 'table' && mobileAuditData.details.items.length === 0)) {
    emptyTable = true;
  } 
  if ((desktopAuditData.details?.type === 'opportunity' && desktopAuditData.details.items.length === 0 )&& (mobileAuditData.details?.type === 'opportunity' && mobileAuditData.details.items.length === 0)) {
    emptyTable = true;
  } 
  const noDetails = !desktopAuditData.details && !mobileAuditData.details;

  const disabled = emptyTable  || noDetails|| ['notApplicable', 'manual',].includes(scoreDisplayMode);

  return (
    <AccordionItem key={desktopAuditData.id} value={desktopAuditData.id}>
      <AccordionTrigger className="flex flex-row gap-4" disabled={disabled}>
        <AuditDetailsSummary
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
          acronym={acronym}
        />
      </AccordionTrigger>
      <RenderJSONDetails data={{ desktopAuditData, mobileAuditData }} />
      <AccordionContent>
        <RenderMetricSavings auditData={desktopAuditData} />
        <RenderDetails
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

function AuditDetailsSummary({
  desktopAuditData,
  mobileAuditData,
  acronym,
}: {
  desktopAuditData: AuditResult[string];
  mobileAuditData: AuditResult[string];
  acronym?: string;
}) {
  return (
    <div className="flex flex-1 flex-col flex-wrap gap-4 md:flex-row">
      <div className="flex flex-col gap-1 font-bold md:flex-[0_0_300px]">
        <span className="group-hover:underline">
          {desktopAuditData.title} {acronym ? `(${acronym})` : ''}
        </span>
        <ScoreDisplay audit={mobileAuditData} device={'Mobile'} />
        <ScoreDisplay audit={desktopAuditData} device={'Desktop'} />
        <div className="text-xs">
          {desktopAuditData.scoreDisplayMode === 'notApplicable'
            ? 'Not Applicable'
            : ''}
          {desktopAuditData.scoreDisplayMode === 'manual'
            ? 'Manual validation required'
            : ''}
        </div>
      </div>
      <div className="align-top no-underline hover:no-underline focus:no-underline md:flex-1">
        <ReactMarkdown>
          {desktopAuditData.description || mobileAuditData.description || ''}
        </ReactMarkdown>
      </div>
      {/* <div className="align-top no-underline hover:no-underline focus:no-underline md:flex-1">
      {desktopAuditData.scoreDisplayMode ||
        mobileAuditData.scoreDisplayMode ||
        ''}
    </div> */}
    </div>
  );
}

function RenderMetricSavings({
  auditData,
}: {
  auditData: AuditResult[string];
}) {
  if (!auditData.metricSavings) {
    return null;
  }

  const totalSavings = Object.values(auditData.metricSavings).reduce(
    (acc, savings) => acc + savings,
    0,
  );
  if (totalSavings === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Possible Savings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(auditData.metricSavings).map(([metric, savings]) => (
            <TableRow key={metric}>
              <TableCell>{metric}</TableCell>
              <TableCell>{savings}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RenderDetails({
  desktopAuditData,
  mobileAuditData,
}: {
  desktopAuditData?: AuditResult[string];
  mobileAuditData?: AuditResult[string];
}) {
  if (!desktopAuditData?.details) {
    return null;
  }
  if (!mobileAuditData?.details) {
    return null;
  }

  const details = desktopAuditData.details;
  console.log('list', details);
  switch (details.type) {
    case 'filmstrip':
      return <Timeline timeline={details} device={'Desktop'} />;
    case 'list':
      console.log('list', details);
      return (
        <RenderList
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
      );
    case 'checklist':
      return (
        <RenderChecklist
          desktopAuditData={desktopAuditData}
          mobileAuditData={mobileAuditData}
        />
      );
    case 'table':
    case 'opportunity':
      console.log('table', details);
      return (
        <DetailTable
          device={'Desktop'}
          headings={details.headings}
          items={details.items}
          isEntityGrouped={details.isEntityGrouped}
          skipSumming={details.skipSumming}
          sortedBy={details.sortedBy}
          entities={details.entities}
        />
      );
    case 'criticalrequestchain':
      // return CriticalRequestChainRenderer.render(this._dom, details, this);
      return (
        <div>
          Critical Request Chain
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </div>
      );
    // Internal-only details, not for rendering.
    case 'screenshot':
      return null;
    // case 'debugdata':
    case 'treemap-data':
      return <RenderJSONDetails data={details} />;

    default:
      return <RenderUnknown details={details} />;
  }
}

function RenderList({
  desktopAuditData,
  mobileAuditData,
}: {
  desktopAuditData?: AuditResult[string];
  mobileAuditData?: AuditResult[string];
}) {
  const details = desktopAuditData?.details;
  if (details.type !== 'list') {
    return null;
  }
  return (
    <div>
      {details.items.map((item: any, index: number) => {
        console.log('item', item);
        switch (item.type) {
          case 'filmstrip':
            return <Timeline key={index} timeline={item} device={'Desktop'} />;
          case 'list':
            console.log('list', details);
            return (
              <RenderList
                key={index}
                desktopAuditData={item}
                mobileAuditData={mobileAuditData?.details?.items[index]}
              />
            );
          case 'checklist':
            return (
              <RenderChecklist
                key={index}
                desktopAuditData={item}
                mobileAuditData={mobileAuditData?.details?.items[index]}
              />
            );
          case 'table':
          case 'opportunity':
            console.log('table', details);
            return (
              <DetailTable
                key={index}
                device={'Desktop'}
                headings={item.headings}
                items={item.items}
                isEntityGrouped={item.isEntityGrouped}
                skipSumming={item.skipSumming}
                sortedBy={item.sortedBy}
                entities={item.entities}
              />
            );
          case 'criticalrequestchain':
            // return CriticalRequestChainRenderer.render(this._dom, details, this);
            return (
              <div key={index}>
                Critical Request Chain
                <pre>{JSON.stringify(details, null, 2)}</pre>
              </div>
            );
          // Internal-only details, not for rendering.
          // case 'screenshot':
          // case 'debugdata':
          // case 'treemap-data':
          //   return null;

          default:
            return <RenderUnknown key={index} details={details} />;
        }
      })}
    </div>
  );
}

function RenderChecklist({
  desktopAuditData,
  mobileAuditData,
}: {
  desktopAuditData: AuditResult[string];
  mobileAuditData: AuditResult[string];
}) {
  const desktopDetails = AuditDetailChecklistSchema.safeParse(
    desktopAuditData.details,
  );
  const mobileDetails = AuditDetailChecklistSchema.safeParse(
    mobileAuditData.details,
  );
  if (!desktopDetails.success || !mobileDetails.success) {
    return null;
  }
  const checklistItems = Object.keys(desktopDetails.data.items);
  const mobileChecklistItems = Object.keys(mobileDetails.data.items);
  const allKeys = [...new Set([...checklistItems, ...mobileChecklistItems])];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Checklist Item</TableHead>
          <TableHead>Mobile</TableHead>
          <TableHead>Desktop</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allKeys.map((key) => {
          const desktopItem = desktopDetails.data.items[key];
          const mobileItem = mobileDetails.data.items[key];
          const label = desktopItem?.label || mobileItem?.label || '';
          return (
            <TableRow key={key}>
              <TableCell>{label}</TableCell>
              <TableCell>
                {mobileItem ? (
                  mobileItem.value ? (
                    <span title="true">✅</span>
                  ) : (
                    <span title="false"> ❌</span>
                  )
                ) : null}{' '}
              </TableCell>
              <TableCell>
                {desktopItem ? (
                  desktopItem.value ? (
                    <span title="true">✅</span>
                  ) : (
                    <span title="false"> ❌</span>
                  )
                ) : null}{' '}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RenderUnknown({
  details,
}: {
  details: AuditResult[string]['details'];
}) {
  return (
    <div className="overflow-x-auto">
      We don&apos;t know how to render audit details of type{' '}
      {details?.type || ' unknown '}
      The Lighthouse version that collected this data is likely newer than the
      Lighthouse version of the report renderer. Expand for the raw JSON.
      <pre>{JSON.stringify(details, null, 2)}</pre>
    </div>
  );
}

type ValueType =
  | 'bytes'
  | 'code'
  | 'ms'
  | 'numeric'
  | 'text'
  | 'thumbnail'
  | 'timespanMs'
  | 'url';

export type IcuMessage = {
  // NOTE: `i18nId` rather than just `id` to make tsc typing easier (vs type branding which won't survive JSON roundtrip).
  /** The id locating this message in the locale message json files. */
  i18nId: string;
  /** The dynamic values, if any, to insert into the localized string. */
  values?: Record<string, string | number>;
  /**
   * A formatted version of the string, usually as found in a file's `UIStrings`
   * entry, and used as backup if the `i18nId` doesn't refer to an existing
   * message in the requested locale. Used when serialized and a new version of
   * Lighthouse no longer contains the needed message (or in development and
   * the locale files don't yet contain it).
   */
  formattedDefault: string;
};

type ItemValueType =
  | 'bytes'
  | 'code'
  | 'link'
  | 'ms'
  | 'multi'
  | 'node'
  | 'source-location'
  | 'numeric'
  | 'text'
  | 'thumbnail'
  | 'timespanMs'
  | 'url';

interface TableColumnHeading {
  /**
   * The name of the property within items being described.
   * If null, subItemsHeading must be defined, and the first table row in this column for
   * every item will be empty.
   * See legacy-javascript for an example.
   */
  key: string | null;
  /** Readable text label of the field. */
  label: IcuMessage | string;
  /**
   * The data format of the column of values being described. Usually
   * those values will be primitives rendered as this type, but the values
   * could also be objects with their own type to override this field.
   */
  valueType: ItemValueType;
  /**
   * Optional - defines an inner table of values that correspond to this column.
   * Key is required - if other properties are not provided, the value for the heading is used.
   */
  subItemsHeading?: {
    key: string;
    valueType?: ItemValueType;
    displayUnit?: string;
    granularity?: number;
    label?: IcuMessage | string;
  };

  displayUnit?: string;
  granularity?: number;
}

interface TableItem {
  entity?: string;
  subItems?: {
    items: TableItem[];
  };
  [key: string]: any;
}

interface EntityInfo {
  name: string;
  category?: string;
  isFirstParty?: boolean;
  homepage?: string;
}

interface TableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  isEntityGrouped?: boolean;
  skipSumming?: string[];
  sortedBy?: string[];
  entities?: EntityInfo[];
  device: 'Desktop' | 'Mobile';
}

const SUMMABLE_VALUETYPES: ValueType[] = [
  'bytes',
  'numeric',
  'ms',
  'timespanMs',
];

function getTableItemSortComparator(sortedBy: string[]) {
  return (a: any, b: any) => {
    for (const key of sortedBy) {
      const aVal = a[key];
      const bVal = b[key];
      if (
        typeof aVal !== typeof bVal ||
        !['number', 'string'].includes(typeof aVal)
      ) {
        console.warn(
          `Warning: Attempting to sort unsupported value type: ${key}.`,
        );
      }
      if (
        typeof aVal === 'number' &&
        typeof bVal === 'number' &&
        aVal !== bVal
      ) {
        return bVal - aVal;
      }
      if (
        typeof aVal === 'string' &&
        typeof bVal === 'string' &&
        aVal !== bVal
      ) {
        return aVal.localeCompare(bVal);
      }
    }
    return 0;
  };
}

const getEntityGroupItems = ({
  items,
  headings,
  isEntityGrouped,
  skipSumming,
  sortedBy,
}: {
  items: TableItem[];
  headings: TableColumnHeading[];
  isEntityGrouped: boolean;
  skipSumming: string[];
  sortedBy?: string[];
}) => {
  // Exclude entity-grouped audits and results without entity classification
  if (!items.length || isEntityGrouped || !items.some((item) => item.entity)) {
    return [];
  }

  const skippedColumns = new Set(skipSumming);
  const summableColumns: string[] = [];

  for (const heading of headings) {
    if (!heading.key || skippedColumns.has(heading.key)) continue;
    if (SUMMABLE_VALUETYPES.includes(heading.valueType as ValueType)) {
      summableColumns.push(heading.key);
    }
  }

  const firstColumnKey = headings[0].key;
  if (!firstColumnKey) return [];

  const byEntity = new Map<string | undefined, TableItem>();

  for (const item of items) {
    const entityName =
      typeof item.entity === 'string' ? item.entity : undefined;
    const groupedItem = byEntity.get(entityName) || {
      [firstColumnKey]: entityName || 'Unattributable',
      entity: entityName,
    };

    for (const key of summableColumns) {
      groupedItem[key] = Number(groupedItem[key] || 0) + Number(item[key] || 0);
    }
    byEntity.set(entityName, groupedItem);
  }

  const result = Array.from(byEntity.values());
  if (sortedBy) {
    result.sort(getTableItemSortComparator(sortedBy));
  }
  return result;
};

function DetailTable({
  headings,
  items,
  isEntityGrouped = false,
  skipSumming = [],
  sortedBy,
  device,
}: TableProps) {
  console.log('headings', headings);
  if (!items?.length) return null;
  if (!headings?.length) return null;

  const entityItems = getEntityGroupItems({
    items,
    headings,
    isEntityGrouped,
    skipSumming,
    sortedBy,
  });

  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings.length}, auto)` }}
    >
      <div
        className="grid grid-cols-subgrid border-b-2"
        style={{
          gridColumn: `span ${headings.length} / span ${headings.length}`,
        }}
      >
        {headings.map((heading, index) => (
          <div
            key={index}
            className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            {typeof heading.label === 'string'
              ? heading.label
              : heading.label?.formattedDefault}
          </div>
        ))}
      </div>

      {entityItems.length > 0
        ? // Render entity-grouped rows
          entityItems.map((entityItem, index) => (
            <Fragment key={index}>
              <div
                className="grid grid-cols-subgrid border-b-2 transition-colors hover:bg-muted/50"
                style={{
                  gridColumn: `span ${headings.length} / span ${headings.length}`,
                }}
              >
                {headings.map((heading, colIndex) => (
                  <div
                    key={colIndex}
                    className="whitespace-nowrap px-6 py-4 text-sm"
                    style={{
                      gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                    }}
                  >
                    {heading.key && (
                      <>
                        {typeof entityItem[heading.key] === 'object'
                          ? JSON.stringify(entityItem[heading.key])
                          : entityItem[heading.key]}
                      </>
                    )}
                  </div>
                ))}
              </div>
              {items
                .filter((item) => item.entity === entityItem.entity)
                .map((item, subIndex) => (
                  <Fragment key={`${index}-${subIndex}`}>
                    <div
                      className="grid grid-cols-subgrid border-b-2 transition-colors hover:bg-muted/50"
                      style={{
                        gridColumn: `span ${headings.length} / span ${headings.length}`,
                      }}
                    >
                      {headings.map((heading, colIndex) => (
                        <div
                          key={colIndex}
                          className="whitespace-nowrap px-6 py-4 text-xs"
                        >
                          {heading.key ? (
                            <RenderTableValue
                              value={item[heading.key]}
                              heading={heading}
                              device={device}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {item.subItems?.items.map((subItem, subIndex) => (
                      <div
                        key={subIndex}
                        className="grid grid-cols-subgrid border-b-2 px-4 transition-colors hover:bg-muted/50"
                        style={{
                          gridColumn: `span ${headings.length} / span ${headings.length}`,
                        }}
                      >
                        {headings.map((heading, colIndex) => (
                          <div key={colIndex} className="px-6 py-4 text-xs ">
                            {heading.subItemsHeading?.key ? (
                              <RenderTableValue
                                value={subItem[heading.subItemsHeading.key]}
                                heading={heading.subItemsHeading}
                                device={device}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ))}
                  </Fragment>
                ))}
            </Fragment>
          ))
        : items.map((item, index) => (
            <Fragment key={index}>
              <div
                className="0 grid grid-cols-subgrid border-b-2 transition-colors hover:bg-muted/50"
                style={{
                  gridColumn: `span ${headings.length} / span ${headings.length}`,
                }}
              >
                {headings.map((heading, colIndex) => (
                  <div key={colIndex} className="px-6 py-4 text-xs">
                    {heading.key ? (
                      <RenderTableValue
                        value={item[heading.key]}
                        heading={heading}
                        device={device}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              {item.subItems?.items ? (
                <div
                  className="1 grid grid-cols-subgrid border-2 px-4 transition-colors hover:bg-muted/50 whitespace-nowrap text-left font-medium uppercase tracking-wider text-gray-500"

                  style={{
                    gridColumn: `span ${headings.length} / span ${headings.length}`,
                  }}
                >
                  {headings.map((heading, colIndex) => {
                    const headingKey = heading.subItemsHeading?.key;
                    if (!headingKey) {
                      return null;
                      return <div key={colIndex}> </div>;
                    }
                    const headingInfo = headings.find(
                      ({ key }) => key === headingKey,
                    );
                    if (!headingInfo ) {
                      return null;
                      // return <div key={colIndex}> </div>;
                    }
                    if (headingInfo.key === heading.subItemsHeading?.key) {
                      return null;
                    }

                    return (
                      <div key={colIndex} className="px-6 py-4 text-sm" style={{ gridColumn: `${colIndex + 1} / ${colIndex + 2}` }}>
                        {typeof headingInfo.label === 'string'
                          ? headingInfo.label
                          : headingInfo.label?.formattedDefault}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {item.subItems?.items.map((subItem, subIndex) => (
                <div
                  key={subIndex}
                  className="2 grid grid-cols-subgrid border-2 px-4 transition-colors hover:bg-muted/50"
                  style={{
                    gridColumn: `span ${headings.length} / span ${headings.length}`,
                  }}
                >
                  {headings.map((heading, colIndex) => (
                    <div key={colIndex} className="px-6 py-4 text-sm">
                      {heading.subItemsHeading?.key ? (
                        <RenderTableValue
                          value={subItem[heading.subItemsHeading.key]}
                          heading={heading.subItemsHeading}
                          device={device}
                        />
                      ) : (
                        ' '
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </Fragment>
          ))}
    </div>
  );
}

const URL_PREFIXES = ['http://', 'https://', 'data:'];

/**
 * Render a details item value for embedding in a table. Renders the value
 * based on the heading's valueType, unless the value itself has a `type`
 * property to override it.
 * @param {TableItemValue} value
 * @param {LH.Audit.Details.TableColumnHeading} heading
 * @return {Element|null}
 */
function RenderTableValue({
  value,
  heading,
  device,
}: {
  value: any;
  heading: TableColumnHeading | TableColumnHeading['subItemsHeading'];
  device: 'Desktop' | 'Mobile';
}) {
  if (value === undefined || value === null) {
    return null;
  }

  // First deal with the possible object forms of value.
  if (typeof value === 'object') {
    // The value's type overrides the heading's for this column.
    switch (value.type) {
      case 'code': {
        return (
          <pre title="code" className="text-xs">
            {value.value}
          </pre>
        );
      }
      case 'link': {
        return (
          <a href={value.value} title="link" className="w-[50ch] overflow-hidden whitespace-nowrap text-ellipsis">
            {value.value}
          </a>
        );
      }
      case 'node': {
        return <NodeComponent item={value} device={device} />;
      }
      case 'numeric': {
        if (heading?.granularity) {
          return (
            <div title="numeric">
              {value.value.toFixed(-Math.log10(heading.granularity))}
            </div>
          );
        }

        return <div title="numeric">{value.value}</div>;
      }
      case 'source-location': {
        return (
          <div title="source-location" className="font-mono text-xs">
            {JSON.stringify(value, null, 2)}
          </div>
        );
      }
      case 'url': {
        return (
          <a href={value.value} title="url" className="w-[50ch] overflow-hidden whitespace-nowrap text-ellipsis">
            {value.value}
          </a>
        );
      }
      case 'text': {
        return <div title="text">{value.value}</div>;
      }
      default: {
        console.log('default', value);
        return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
      }
    }
  }

  // Next, deal with primitives.
  switch (heading?.valueType) {
    case 'bytes': {
      const bytes = Number(value);
      const kb = bytes / 1024;
      const mb = kb / 1024;
      return (
        <div title="bytes" className="align-right">
          {mb > 1
            ? `${mb.toFixed(2)} MB`
            : kb > 1
              ? `${kb.toFixed(2)} KB`
              : `${bytes} bytes`}
        </div>
      );
    }
    case 'code': {
      const strValue = String(value);
      return (
        <code title="code" className="font-mono text-xs">
          {strValue}
        </code>
      );
    }
    case 'ms': {
      return <div title="ms" className="align-right"> {value.toFixed(2)} ms</div>;
    }
    case 'numeric': {
      if (heading?.granularity && value) {
        return (
          <div title="numeric" className="align-right">
            {value.toFixed(-Math.log10(heading.granularity))}
          </div>
        );
      }

      return <div title="numeric" className="align-right">{value}</div>;
    }
    case 'text': {
      const strValue = String(value);
      return <div title="text">{strValue}</div>;
    }
    case 'thumbnail': {
      const strValue = String(value);
      return <div title="thumbnail">{strValue}</div>;
    }
    case 'timespanMs': {
      const numValue = Number(value);
      return <div title="timespanMs" className="align-right">{numValue}</div>;
    }
    case 'url': {
      const strValue = String(value);
      if (URL_PREFIXES.some((prefix) => strValue.startsWith(prefix))) {
        return (
          <a href={strValue} className="w-[50ch] overflow-hidden whitespace-nowrap text-ellipsis">
            {strValue}
          </a>
        );
      } else {
        // Fall back to <pre> rendering if not actually a URL.
        return <div title="url">{strValue}</div>;
      }
    }
    default: {
      console.log('default', value);
      return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
    }
  }
}

/**
 * React component that renders a node element similar to the renderNode function
 * in the Lighthouse details-renderer.js
 */
function NodeComponent({
  item,
  device,
}: {
  item: any;
  device: 'Desktop' | 'Mobile';
}) {
 
  return (
    <div className="flex flex-col gap-2">
        <RenderNodeImage item={item} device={device} />
      
      {item.nodeLabel ? <div>{item.nodeLabel}</div> : null}

      {item.snippet && (
        <div className="whitespace-pre-wrap font-mono text-sm leading-5 text-blue-500">
          {item.snippet}
        </div>
      )}

      <RenderJSONDetails data={item} />
    </div>
  );
}


function RenderNodeImage({ item, device,  imageSize = 150 }: { item: any, device: 'Desktop' | 'Mobile', imageSize?: number }) {
  const screenshotData = useContext(fullPageScreenshotContext);
  const fullPageScreenshot =
    device === 'Desktop'
      ? screenshotData?.desktopFullPageScreenshot
      : screenshotData?.mobileFullPageScreenshot;


  if (!fullPageScreenshot || !item?.boundingRect) {
    return null;
  }


  const scale: number | undefined = item?.boundingRect?.width ? imageSize / item?.boundingRect?.width : undefined;
  return (<div
  className="relative overflow-hidden"
  style={{
    aspectRatio: (item?.boundingRect?.width / item?.boundingRect?.height) || undefined,
    width: `${imageSize}px`,
  }}
>
  <div className="absolute" style={{ scale: scale }}>
    <div
      className="absolute"
      style={{
        width: `${fullPageScreenshot.screenshot.width}px`,
        height: `${fullPageScreenshot.screenshot.height}px`,
        backgroundImage: `var(--${device.toLowerCase()}FullPageScreenshot)`,
        backgroundSize: 'cover',
        left: `-${fullPageScreenshot?.nodes[item.lhId]?.left}px`,
        top: `-${fullPageScreenshot?.nodes[item.lhId]?.top}px`,
        backgroundRepeat: 'no-repeat',
      }}
    ></div>
  </div>
</div>)
}

function RenderJSONDetails({ data }: { data: any }) {
  return (
    <details>
      <summary>All Data</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
