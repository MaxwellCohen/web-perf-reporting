type DeviceType = "Desktop" | "Mobile";

interface CruxHistogramItemBins {
  start: number;
  end: number;
  density: number;
}

type CruxHistogram = [
  CruxHistogramItemBins,
  CruxHistogramItemBins,
  Omit<CruxHistogramItemBins, "end">,
];

export type CruxDate = {
  year: number;
  month: number;
  day: number;
};

type CruxHistogramItem = {
  histogram: CruxHistogram;
  percentiles: { p75: number };
};
type CruxP75Item = Omit<CruxHistogramItem, "histogram"> | undefined;

export type CruxReport = {
  record: {
    key: {
      formFactor?: string;
      origin?: string;
      url?: string;
    };
    metrics: {
      largest_contentful_paint_resource_type?: {
        fractions: { image: number; text: number };
      };
      navigation_types?: {
        fractions: {
          navigate: number;
          navigate_cache: number;
          reload: number;
          restore: number;
          back_forward: number;
          back_forward_cache: number;
          prerender: number;
        };
      };
      cumulative_layout_shift?: CruxHistogramItem;
      experimental_time_to_first_byte?: CruxHistogramItem;
      interaction_to_next_paint?: CruxHistogramItem;
      largest_contentful_paint?: CruxHistogramItem;
      round_trip_time?: CruxHistogramItem;
      first_contentful_paint?: CruxHistogramItem;
      form_factors?: {
        fractions: { desktop: number; phone: number; tablet: number };
      };
      largest_contentful_paint_image_resource_load_duration?: CruxP75Item;
      largest_contentful_paint_image_element_render_delay?: CruxP75Item;
      largest_contentful_paint_image_resource_load_delay?: CruxP75Item;
      largest_contentful_paint_image_time_to_first_byte?: CruxP75Item;
      // Experimental: CWVs that include soft (SPA route) navigations as well as full page loads.
      experimental_largest_contentful_paint_with_softnavs?: CruxHistogramItem;
      experimental_interaction_to_next_paint_with_softnavs?: CruxHistogramItem;
      experimental_cumulative_layout_shift_with_softnavs?: CruxHistogramItem;
      // Experimental ad metrics: p75 only, no thresholds.
      experimental_ad_count?: CruxP75Item;
      experimental_ad_density?: CruxP75Item;
      experimental_ad_cpu?: CruxP75Item;
      experimental_ad_kilobytes?: CruxP75Item;
    };
    collectionPeriod: {
      firstDate: CruxDate;
      lastDate: CruxDate;
    };
  };
  urlNormalizationDetails?: {
    originalUrl?: string;
    normalizedUrl?: string;
  };
};

export type UserPageLoadMetricV5 = {
  percentile: number;
  distributions: Array<{
    min: number;
    max: number;
    proportion: number;
  }>;
  category: string;
};

type PageSpeedApiLoadingExperienceV5 = {
  metrics: {
    CUMULATIVE_LAYOUT_SHIFT_SCORE: UserPageLoadMetricV5;
    EXPERIMENTAL_TIME_TO_FIRST_BYTE: UserPageLoadMetricV5;
    FIRST_CONTENTFUL_PAINT_MS: UserPageLoadMetricV5;
    INTERACTION_TO_NEXT_PAINT: UserPageLoadMetricV5;
    LARGEST_CONTENTFUL_PAINT_MS: UserPageLoadMetricV5;
  };
  overall_category: string;
};

export type AuditRef = {
  id?: string;
  weight?: number;
  group?: string;
  acronym?: string;
};

export type DebugData = {
  type: "debugdata";
  details: {
    items: Array<Record<string, string | number>>;
    [key: string]: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [p: string]: any;
};

export type Rect = {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type NodeValue = {
  type: "node" | "text";
  lhId?: string;
  path?: string;
  selector?: string;
  boundingRect?: Rect;
  nodeLabel?: string;
  explanation?: string;
  snippet?: string;
  value?: string;
};

/** A table item for rows that are nested within a top-level TableItem (row). */
interface TableSubItems {
  type: "subitems";
  items: TableItem[];
}

export interface AuditDetailTable extends BaseDetails {
  type: "table";
  headings: TableColumnHeading[];
  items: TableItem[];
  summary?: {
    wastedMs?: number;
    wastedBytes?: number;
  };
  /**
   * Columns to sort the items by, during grouping.
   * If omitted, entity groups will be sorted by the audit ordering vs. the new totals.
   */
  sortedBy?: Array<string>;
  /** Will be true if the table is already grouped by entities. */
  isEntityGrouped?: boolean;
  /** Column keys to skip summing. If omitted, all column types supported are summed. */
  skipSumming?: Array<string>;
}

export interface TreeMapNode {
  /** Could be a url, a path component from a source map, or an arbitrary string. */
  name: string;
  resourceBytes: number;
  unusedBytes?: number;
  /** If present, this module is a duplicate. String is normalized source path. See ModuleDuplication.normalizeSource */
  duplicatedNormalizedModuleName?: string;
  children?: TreeMapNode[];
}
export interface TreeMapData extends BaseDetails {
  type: "treemap-data";
  nodes: TreeMapNode[];
}

export type AuditDetailList = {
  type: "list";
  items: Array<AuditDetailTable | DebugData>;
  debugData?: DebugData;
};

export type AuditDetailFilmstrip = {
  type: "filmstrip";
  items: Array<{
    timing: number;
    timestamp: number;
    data: string;
  }>;
  scale: number;
};

export interface OpportunityItem extends TableItem {
  url: string;
  wastedBytes?: number;
  totalBytes?: number;
  wastedMs?: number;
  debugData?: DebugData;
  [p: string]: undefined | ItemValue;
}
export interface AuditDetailOpportunity extends BaseDetails {
  type: "opportunity";
  headings: TableColumnHeading[];
  items: OpportunityItem[];
  /**
   * Columns to sort the items by, during grouping.
   * If omitted, entity groups will be sorted by the audit ordering vs. the new totals.
   */
  sortedBy?: Array<string>;
  /** Will be true if the table is already grouped by entities. */
  isEntityGrouped?: boolean;
  /** Column keys to skip summing. If omitted, all column types supported are summed. */
  skipSumming?: Array<string>;
  /**
   * @deprecated
   * Historically this represents the time saved on the entire page load. It's mostly used as an
   * alias for `metricSavings.LCP` now. We recommend using `metricSavings` directly for more
   * metric-specific savings estimates.
   */
  overallSavingsMs?: number;
  /** Total byte savings covered by this audit. */
  overallSavingsBytes?: number;
}

interface BaseDetails {
  /** Additional information, usually used for including debug or meta information in the LHR */
  debugData?: DebugData;
}

export interface CriticalRequestChain extends BaseDetails {
  type: "criticalrequestchain";
  longestChain: {
    duration: number;
    length: number;
    transferSize: number;
  };
  chains: SimpleCriticalRequestNode;
}

type SimpleCriticalRequestNode = {
  [id: string]: {
    request: {
      url: string;
      startTime: number;
      endTime: number;
      responseReceivedTime: number;
      transferSize: number;
    };
    children?: SimpleCriticalRequestNode;
  };
};

type AuditDetailScreenshot = {
  type: "screenshot";
  timing: number;
  timestamp: number;
  data: string;
  debugData?: DebugData;
};

/** String enum of possible types of values found within table items. */
export type ItemValueType =
  | "bytes"
  | "ms"
  | "url"
  | "code"
  | "link"
  | "node"
  | "source-location"
  | "numeric"
  | "text"
  | "thumbnail"
  | "timespanMs"
  | "multi" // not sure what this is
  | "baseline-status";

export type SourceLocationValue = {
  type: "source-location";
  url: string;
  urlProvider: "network" | "comment";
  line: number;
  column: number;
  original?: {
    file: string;
    line: number;
    column: number;
  };
};

export type LinkValue = {
  type: "link";
  text: string;
  url: string;
};

export type UrlValue = {
  type: "url";
  value: string;
};

type IcuMessage = {
  i18nId: string;
  values?: Record<string, string | number>;
  formattedDefault: string;
};

export type CodeValue = {
  type: "code";
  value: IcuMessage | string;
};

export type NumericValue = {
  type: "numeric";
  value: number;
  granularity?: number;
};

export type TextValue = {
  type: "text";
  value: string;
};

export type BaselineStatusValue = {
  type: "baseline-status";
  status: string;
  displayString: IcuMessage | string;
};

/** Possible types of values found within table items. */
export type ItemValue =
  | string
  | number
  | boolean
  | DebugData
  | NodeValue
  | SourceLocationValue
  | LinkValue
  | UrlValue
  | CodeValue
  | NumericValue
  | IcuMessage
  | TextValue
  | BaselineStatusValue
  | TableSubItems;

export interface TableColumnHeading {
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
  _device?: DeviceType;
  /**
   * Optional - defines an inner table of values that correspond to this column.
   * Key is required - if other properties are not provided, the value for the heading is used.
   */
  subItemsHeading?: {
    key: string;
    valueType?: ItemValueType;
    displayUnit?: string;
    granularity?: number;
  };

  displayUnit?: string;
  granularity?: number;
}

export type TableItem = {
  debugData?: DebugData;
  subItems?: TableSubItems;
  _device?: DeviceType;
  [key: string]: ItemValue | undefined;
};

export type AuditDetailChecklist = {
  type: "checklist";
  items: Record<string, { value: boolean; label: string }>;
  debugData?: DebugData;
};

export type AuditResult = {
  description?: string;
  details?:
    | AuditDetailTable
    | AuditDetailFilmstrip
    | AuditDetailOpportunity
    | AuditDetailChecklist
    | AuditDetailList
    | TreeMapData
    | CriticalRequestChain
    | AuditDetailScreenshot
    | DebugData;
  errorMessage?: string;
  explanation?: string;
  id: string;
  numericValue?: number;
  // sore is 0 to 1 where 0-.49 is bad and .50-.89 is needs improvement and .90-1 is good
  score: number | null;
  scoreDisplayMode:
    | "numeric"
    | "binary"
    | "metricSavings"
    | "manual"
    | "informative"
    | "notApplicable"
    | "error";
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warnings?: any[];
  numericUnit?: string;
  displayValue?: string;
  metricSavings?: Record<string, number>;
};

export type AuditResultsRecord = Record<string, AuditResult>;

export type CategoryResult = {
  auditRefs?: AuditRef[];
  description?: string;
  id?: string;
  title?: string;
  manualDescription?: string;
  score?: number;
};

export type FullPageScreenshot = {
  nodes: Record<
    string,
    {
      bottom: number;
      height: number;
      left: number;
      right: number;
      top: number;
      width: number;
    }
  >;
  screenshot: {
    data: string;
    height: number;
    width: number;
  };
};

type LighthouseResultV5 = {
  finalDisplayedUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifacts?: Record<string, any>;
  categories?: Record<string, CategoryResult>;
  categoryGroups?: Record<
    string,
    {
      auditRefs?: AuditRef[];
      description?: string;
      id?: string;
      title?: string;
      manualDescription?: string;
    }
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configSettings?: Record<string, any>;
  environment?: {
    benchmarkIndex?: number;
    cpuThreads?: number;
    hostUserAgent?: string;
    networkUserAgent?: string;
    userAgent?: string;
  };
  fetchTime?: string;
  finalUrl?: string;
  generatedTime?: string;
  lighthouseVersion?: string;
  requestedUrl?: string;
  runWarnings?: string[];
  fullPageScreenshot?: FullPageScreenshot;
  entities?: Array<
    | {
        name: string;
        isFirstParty: boolean;
        isUnrecognized: boolean;
        origins: string[];
      }
    | undefined
  >;
  runtimeError?: {
    message: string;
    stack?: string;
  };
  timing?: {
    entries?: Array<{
      name?: string;
      startTime?: number;
      duration?: number;
    }>;
  };
  userAgent?: string;
  audits?: AuditResultsRecord;
};

export type PageSpeedInsights = {
  kind: string;
  captchaResult: string;
  id: string;
  loadingExperience: PageSpeedApiLoadingExperienceV5;
  originLoadingExperience: PageSpeedApiLoadingExperienceV5;
  analysisUTCTimestamp: string;
  lighthouseResult: LighthouseResultV5;
  status?: string;
  version?: { major: string; minor: string };
};
export type NullablePageSpeedInsights = PageSpeedInsights | null | undefined;

export type CruxHistoryItem = {
  url: string;
  origin: "url" | "origin";
  formFactor: string;
  start_date: string;
  end_date: string;
  metric_name: string;
  P75: number;
  good_max: number;
  ni_max: number;
  good_density: number;
  ni_density: number;
  poor_density: number;
};
