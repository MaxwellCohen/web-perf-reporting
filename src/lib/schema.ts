import { z } from 'zod';

export type DeviceType = 'Desktop' | 'Mobile';
const coerceNumber = z.coerce.number().default(0).catch(NaN);

const cruxHistogramItemSchema = z.object({
  start: coerceNumber,
  end: coerceNumber,
  density: coerceNumber,
});

export const cruxHistogramSchema = z.tuple([
  cruxHistogramItemSchema,
  cruxHistogramItemSchema,
  cruxHistogramItemSchema.omit({ end: true }),
]);

export type CruxHistogram = z.infer<typeof cruxHistogramSchema>;

export const cruxDateSchema = z.object({
  year: coerceNumber,
  month: coerceNumber,
  day: coerceNumber,
});

export type CruxDate = z.infer<typeof cruxDateSchema>;

export const cruxPercentileSchema = z.object({
  p75: coerceNumber,
});

export type CruxPercentile = z.infer<typeof cruxPercentileSchema>;

export const CruxHistogramItem = z.object({
  histogram: cruxHistogramSchema,
  percentiles: cruxPercentileSchema,
});

export const urlSchema = z.string().url();

const urlNormalizationDetails = z
  .object({
    originalUrl: urlSchema,
    normalizedUrl: urlSchema,
  })
  .partial()
  .optional();

const keySchema = z
  .object({
    formFactor: z.string().optional(),
    origin: z.string().optional(),
    url: z.string().optional(),
  })
  .partial();

export const FormFactorFractionsSchema = z.object({
  desktop: coerceNumber,
  phone: coerceNumber,
  tablet: coerceNumber,
});

export type FormFactorFractions = z.infer<typeof FormFactorFractionsSchema>;

export const cruxReportSchema = z.object({
  record: z.object({
    key: keySchema,
    metrics: z
      .object({
        largest_contentful_paint_resource_type: z.object({
          fractions: z.object({ image: coerceNumber, text: coerceNumber }),
        }),
        navigation_types: z
          .object({
            fractions: z.object({
              navigate: z.number(),
              navigate_cache: z.number(),
              reload: z.number(),
              restore: z.number(),
              back_forward: z.number(),
              back_forward_cache: z.number(),
              prerender: z.number(),
            }),
          })
          .optional(),
        cumulative_layout_shift: CruxHistogramItem,
        experimental_time_to_first_byte: CruxHistogramItem,
        interaction_to_next_paint: CruxHistogramItem,
        largest_contentful_paint: CruxHistogramItem,
        round_trip_time: CruxHistogramItem,
        first_contentful_paint: CruxHistogramItem,
        form_factors: z
          .object({
            fractions: FormFactorFractionsSchema,
          })
          .optional(),
        largest_contentful_paint_image_resource_load_duration:
          CruxHistogramItem.omit({ histogram: true }).optional(),
        largest_contentful_paint_image_element_render_delay:
          CruxHistogramItem.omit({ histogram: true }).optional(),
        largest_contentful_paint_image_resource_load_delay:
          CruxHistogramItem.omit({ histogram: true }).optional(),
        largest_contentful_paint_image_time_to_first_byte:
          CruxHistogramItem.omit({ histogram: true }).optional(),
      })
      .partial(),
    collectionPeriod: z.object({
      firstDate: cruxDateSchema,
      lastDate: cruxDateSchema,
    }),
  }),
  urlNormalizationDetails,
});

export type CruxReport = z.infer<typeof cruxReportSchema>;

const cruxHistogramTimeseriesItemSchema = z.object({
  start: coerceNumber,
  end: coerceNumber,
  densities: z.array(coerceNumber),
});

export const CruxHistoryHistogramTimeseries = z.tuple([
  cruxHistogramTimeseriesItemSchema,
  cruxHistogramTimeseriesItemSchema,
  cruxHistogramTimeseriesItemSchema.omit({ end: true }),
]);

export type CruxHistoryHistogramTimeseries = z.infer<
  typeof CruxHistoryHistogramTimeseries
>;

export const CruxHistoryPercentilesTimeseries = z.object({
  p75s: z.array(z.union([z.null(), z.number(), z.string()])).optional(),
});

export type CruxHistoryPercentilesTimeseries = z.infer<
  typeof CruxHistoryPercentilesTimeseries
>;

export const CruxHistoryReportCollectionPeriods = z.array(
  z.object({
    firstDate: cruxDateSchema,
    lastDate: cruxDateSchema,
  }),
);

export type CruxHistoryReportCollectionPeriods = z.infer<
  typeof CruxHistoryReportCollectionPeriods
>;

export const CruxHistoryTimeseries = z.object({
  histogramTimeseries: CruxHistoryHistogramTimeseries,
  percentilesTimeseries: CruxHistoryPercentilesTimeseries,
});

export const CruxFractionsSchema = z.object({
  fractions: z.array(coerceNumber),
});

export const CruxHistoryReportSchema = z.object({
  record: z.object({
    key: keySchema,
    metrics: z.object({
      round_trip_time: CruxHistoryTimeseries,
      experimental_time_to_first_byte: CruxHistoryTimeseries,
      first_contentful_paint: CruxHistoryTimeseries,
      interaction_to_next_paint: CruxHistoryTimeseries,
      cumulative_layout_shift: CruxHistoryTimeseries,
      largest_contentful_paint: CruxHistoryTimeseries,
      largest_contentful_paint_image_resource_load_delay:
        CruxHistoryTimeseries.omit({ histogramTimeseries: true }).optional(),
      largest_contentful_paint_image_element_render_delay:
        CruxHistoryTimeseries.omit({ histogramTimeseries: true }).optional(),
      largest_contentful_paint_image_resource_load_duration:
        CruxHistoryTimeseries.omit({ histogramTimeseries: true }).optional(),
      largest_contentful_paint_image_time_to_first_byte:
        CruxHistoryTimeseries.omit({ histogramTimeseries: true }).optional(),
      form_factors: z
        .object({
          fractionTimeseries: z.object({
            desktop: z.object({
              fractions: z.array(coerceNumber),
            }),
            phone: z.object({
              fractions: z.array(coerceNumber),
            }),
            tablet: z.object({
              fractions: z.array(coerceNumber),
            }),
          }),
        })
        .optional(),
      largest_contentful_paint_resource_type: z
        .object({
          fractionTimeseries: z.object({
            image: CruxFractionsSchema,
            text: CruxFractionsSchema,
          }),
        })
        .optional(),
      navigation_types: z
        .object({
          fractionTimeseries: z.object({
            navigate: CruxFractionsSchema,
            navigate_cache: CruxFractionsSchema,
            reload: CruxFractionsSchema,
            restore: CruxFractionsSchema,
            back_forward: CruxFractionsSchema,
            back_forward_cache: CruxFractionsSchema,
            prerender: CruxFractionsSchema,
          }),
        })
        .optional(),
    }),
    collectionPeriods: CruxHistoryReportCollectionPeriods,
  }),
  urlNormalizationDetails,
});

export type CruxHistoryReport = z.infer<typeof CruxHistoryReportSchema>;

export const UserPageLoadMetricV5schema = z.object({
  percentile: z.number(),
  distributions: z.array(
    z.object({
      min: z.number(),
      max: z.number().optional().default(0),
      proportion: z.number(),
    }),
  ),
  category: z.string(),
});

export type UserPageLoadMetricV5 = z.infer<typeof UserPageLoadMetricV5schema>;

export const PageSpeedApiLoadingExperienceV5schema = z.object({
  metrics: z.object({
    CUMULATIVE_LAYOUT_SHIFT_SCORE: UserPageLoadMetricV5schema,
    EXPERIMENTAL_TIME_TO_FIRST_BYTE: UserPageLoadMetricV5schema,
    FIRST_CONTENTFUL_PAINT_MS: UserPageLoadMetricV5schema,
    INTERACTION_TO_NEXT_PAINT: UserPageLoadMetricV5schema,
    LARGEST_CONTENTFUL_PAINT_MS: UserPageLoadMetricV5schema,
  }),
  overall_category: z.string(),
});

export type PageSpeedApiLoadingExperience = z.infer<
  typeof PageSpeedApiLoadingExperienceV5schema
>;

export const LighthouseResultV5 = z.object({
  fetchTime: z.string(),
  requestedUrl: z.string(),
  finalUrl: z.string(),
  lighthouseVersion: z.string(),
});

const artifactsSchema = z.record(z.any()).optional();

const auditRefSchema = z
  .object({
    id: z.string(),
    weight: z.number(),
    group: z.string().optional(),
    acronym: z.string().optional(),
  })
  .partial();

export type AuditRef = z.infer<typeof auditRefSchema>;



export type DebugData = {
  type: 'debugdata';
  details:{
    items: Array<Record<string, string | number>>;
    [key: string]: unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [p: string]: any;
};

export const DebugDataSchema = z.custom<DebugData>((v) => {
  if (v.type === 'debugdata') {
    return v;
  }
  return null;
});

export const RectSchema = z.object({
  width: z.number(),
  height: z.number(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

export type Rect = z.infer<typeof RectSchema>;

export const NodeValueSchema = z.object({
  type: z.literal('node').or(z.literal('text')),
  lhId: z.string().optional(),
  path: z.string().optional(),
  selector: z.string().optional(),
  boundingRect: RectSchema.optional(),
  nodeLabel: z.string().optional(),
  explanation: z.string().optional(),
  snippet: z.string().optional(),
  value: z.string().optional()  
});

export type NodeValue = z.infer<typeof NodeValueSchema>;

/** A table item for rows that are nested within a top-level TableItem (row). */
export interface TableSubItems {
  type: 'subitems';
  items: TableItem[];
}

export const AuditDetailsTableHeading = z.array(
  z
    .object({
      valueType: z.union([z.string(), z.number()]).optional(),
      key: z.string().optional(),
      label: z.string().optional(),
      granularity: z.number().optional(),
      subItemsHeading: z
        .object({
          valueType: z.union([z.string(), z.number()]).optional(),
          key: z.string().optional(),
          label: z.string().optional(),
          granularity: z.number().optional(),
        })
        .partial(),
    })
    .partial(),
);

export interface AuditDetailTable extends BaseDetails {
  type: 'table';
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

export const AuditDetailTableSchema = z.custom<AuditDetailTable>((v) => {
  if (v.type === 'table') {
    return v;
  }
  return null;
});

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
  type: 'treemap-data';
  nodes: TreeMapNode[];
}

export const TreeMapDataSchema = z.custom<TreeMapData>((v) => {
  if (v.type === 'treemap-data') {
    return v;
  }
  return null;
});

export const AuditDetailListSchema = z.object({
  type: z.literal('list'),
  items: z.array(AuditDetailTableSchema.or(DebugDataSchema)),
  debugData: DebugDataSchema.optional(),
});

export type AuditDetailList = z.infer<typeof AuditDetailListSchema>;

export const AuditDetailFilmstripSchema = z.object({
  type: z.literal('filmstrip'),
  items: z.array(
    z.object({
      timing: coerceNumber,
      timestamp: coerceNumber,
      data: z.string(),
    }),
  ),
  scale: coerceNumber,
});

export type AuditDetailFilmstrip = z.infer<typeof AuditDetailFilmstripSchema>;

interface OpportunityItem extends TableItem {
  url: string;
  wastedBytes?: number;
  totalBytes?: number;
  wastedMs?: number;
  debugData?: DebugData;
  [p: string]: undefined | ItemValue;
}
export  interface AuditDetailOpportunity  extends BaseDetails {
  type: 'opportunity';
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

export const AuditDetailOpportunitySchema = z.custom<AuditDetailOpportunity>((v) => {
  if (v.type === 'opportunity') {
    return v;
  }
  return null;
});

export interface BaseDetails {
  /** Additional information, usually used for including debug or meta information in the LHR */
  debugData?: DebugData;
}

export interface CriticalRequestChain extends BaseDetails {
  type: 'criticalrequestchain';
  longestChain: {
    duration: number;
    length: number;
    transferSize: number;
  };
  chains: SimpleCriticalRequestNode;
}

export type SimpleCriticalRequestNode = {
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

export const AuditDetailScreenshotSchema = z.object({
  type: z.literal('screenshot'),
  timing: coerceNumber,
  timestamp: coerceNumber,
  data: z.string(),
  debugData: DebugDataSchema.optional(),
});

export type AuditDetailScreenshot = z.infer<typeof AuditDetailScreenshotSchema>;

/** String enum of possible types of values found within table items. */
export const ItemValueTypeSchema = z.union([
  z.literal('bytes'),
  z.literal('ms'),
  z.literal('url'),
  z.literal('code'),
  z.literal('link'),
  z.literal('node'),
  z.literal('source-location'),
  z.literal('numeric'),
  z.literal('text'),
  z.literal('thumbnail'),
  z.literal('timespanMs'),
  z.literal('multi'), // not sure what this is 
]);

/** String enum of possible types of values found within table items. */
export type ItemValueType = z.infer<typeof ItemValueTypeSchema>;

export const SourceLocationValueSchema = z.object({
  type: z.literal('source-location'),
  url: z.string(),
  urlProvider: z.enum(['network', 'comment']),
  line: z.number(),
  column: z.number(),
  original: z
    .object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
    })
    .optional(),
});

export type SourceLocationValue = z.infer<typeof SourceLocationValueSchema>;

export const LinkValueSchema = z.object({
  type: z.literal('link'),
  text: z.string(),
  url: z.string(),
});

export type LinkValue = z.infer<typeof LinkValueSchema>;

export const UrlValueSchema = z.object({
  type: z.literal('url'),
  value: z.string(),
});

export type UrlValue = z.infer<typeof UrlValueSchema>;

export const IcuMessageSchema = z.object({
  i18nId: z.string(),
  values: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  formattedDefault: z.string(),
});

export type IcuMessage = z.infer<typeof IcuMessageSchema>;

export const CodeValueSchema = z.object({
  type: z.literal('code'),
  value: z.union([IcuMessageSchema, z.string()]),
});

export type CodeValue = z.infer<typeof CodeValueSchema>;

export const NumericValueSchema = z.object({
  type: z.literal('numeric'),
  value: z.number(),
  granularity: z.number().optional(),
});

export type NumericValue = z.infer<typeof NumericValueSchema>;

export const TextValueSchema = z.object({
  type: z.literal('text'),
  value: z.string(),
});

export type TextValue = z.infer<typeof TextValueSchema>;

/** Possible types of values found within table items. */
export const ItemValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  DebugDataSchema,
  NodeValueSchema,
  SourceLocationValueSchema,
  LinkValueSchema,
  UrlValueSchema,
  CodeValueSchema,
  NumericValueSchema,
  IcuMessageSchema,
  TextValueSchema,
]);

export type ItemValue = z.infer<typeof ItemValueSchema> | TableSubItems;

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

export const TableColumnHeadingSchema = z.custom<TableColumnHeading>((v) => {
  if (v.key === null) {
    return v;
  }
  return null;
});

export type TableItem = {
  debugData?: DebugData;
  subItems?: TableSubItems;
  _device?: DeviceType;
  [key: string]: ItemValue | undefined;
};

export const AuditDetailChecklistSchema = z.object({
  type: z.literal('checklist'),
  items: z.record(
    z.object({
      value: z.boolean(),
      label: z.string(),
    }),
  ),
  debugData: DebugDataSchema.optional(),
});

export type AuditDetailChecklist = z.infer<typeof AuditDetailChecklistSchema>;

export const AuditDetailCriticalRequestChainSchema =
  z.custom<CriticalRequestChain>((v) => {
    if (v.type === 'criticalrequestchain') {
      return v;
    }
    return null;
  });

const auditResultsRecordSchema = z.record(
  z.object({
    description: z.string().optional(),
    details: AuditDetailTableSchema.or(AuditDetailFilmstripSchema)
      .or(AuditDetailOpportunitySchema)
      .or(AuditDetailChecklistSchema)
      .or(AuditDetailListSchema)
      .or(TreeMapDataSchema)
      .or(AuditDetailCriticalRequestChainSchema)
      .or(AuditDetailScreenshotSchema)
      .or(DebugDataSchema)
      .optional(),
    errorMessage: z.string().optional(),
    explanation: z.string().optional(),
    id: z.string(),
    numericValue: z.number().optional(),
    // sore is 0 to 1 where 0-.49 is bad and .50-.89 is needs improvement and .90-1 is good
    score: z.number().nullable(),
    scoreDisplayMode: z
      .literal('numeric')
      .or(z.literal('binary'))
      .or(z.literal('metricSavings'))
      .or(z.literal('manual'))
      .or(z.literal('informative'))
      .or(z.literal('notApplicable'))
      .or(z.literal('error')),
    title: z.string(),
    warnings: z.array(z.any()).optional(),
    numericUnit: z.string().optional(),
    displayValue: z.string().optional(),
    metricSavings: z.record(z.number()).optional(),
  }),
);

export type AuditResultsRecord = z.infer<typeof auditResultsRecordSchema>;

const categoryResultSchema = z
  .object({
    auditRefs: z.array(auditRefSchema),
    description: z.string(),
    id: z.string(),
    title: z.string(),
    manualDescription: z.string().optional(),
    score: z.number(),
  })
  .partial();

export type CategoryResult = z.infer<typeof categoryResultSchema>;

const configSettingsSchema = z.record(z.any());

const environmentSchema = z
  .object({
    benchmarkIndex: z.number(),
    cpuThreads: z.number(),
    hostUserAgent: z.string(),
    networkUserAgent: z.string(),
    userAgent: z.string(),
  })
  .partial();

const categorySchema = z
  .object({
    auditRefs: z.array(auditRefSchema),
    description: z.string(),
    id: z.string(),
    title: z.string(),
    manualDescription: z.string().optional(),
  })
  .partial();

export type Category = z.infer<typeof categorySchema>;

const entitiesSchema = z.array(
  z
    .object({
      name: z.string(),
      isFirstParty: z.boolean(),
      isUnrecognized: z.boolean(),
      origins: z.array(z.string()),
    })
    .optional(),
);

export type Entities = z.infer<typeof entitiesSchema>;

const FullPageScreenshotSchema = z.object({
  nodes: z.record(
    z.object({
      bottom: coerceNumber,
      height: coerceNumber,
      left: coerceNumber,
      right: coerceNumber,
      top: coerceNumber,
      width: coerceNumber,
    }),
  ),
  screenshot: z.object({
    data: z.string(),
    height: z.number(),
    width: z.number(),
  }),
});

export type FullPageScreenshot = z.infer<typeof FullPageScreenshotSchema>;

const lighthouseResultV5Schema = z
  .object({
    finalDisplayedUrl: urlSchema,
    artifacts: artifactsSchema,
    categories: z.record(categoryResultSchema.partial()),
    categoryGroups: z.record(categorySchema).optional(),
    configSettings: configSettingsSchema,
    environment: environmentSchema,
    fetchTime: z.string(),
    finalUrl: z.string(),
    generatedTime: z.string(),
    lighthouseVersion: z.string(),
    requestedUrl: z.string(),
    runWarnings: z.array(z.string()),
    fullPageScreenshot: FullPageScreenshotSchema,
    entities: entitiesSchema,
    runtimeError: z
      .object({
        message: z.string(),
        stack: z.string().optional(),
      })
      .optional(),
    timing: z.object({
      entries: z
        .array(
          z
            .object({
              name: z.string().optional(),
              startTime: z.number().optional(),
              duration: z.number(),
            })
            .partial(),
        )
        .optional(),
    }),
    userAgent: z.string(),
    audits: auditResultsRecordSchema,
  })
  .partial();

export const pageSpeedInsightsSchema = z.object({
  kind: z.string(),
  captchaResult: z.string(),
  id: z.string(),
  loadingExperience: PageSpeedApiLoadingExperienceV5schema,
  originLoadingExperience: PageSpeedApiLoadingExperienceV5schema,
  analysisUTCTimestamp: z.string(),
  lighthouseResult: lighthouseResultV5Schema,
  version: z.object({ major: z.string(), minor: z.string() }).optional(),
});

export type PageSpeedInsights = z.infer<typeof pageSpeedInsightsSchema>;

export const cruxHistoryItemSchema = z.object({
  url: z.string(),
  origin: z.enum(['url', 'origin']),
  formFactor: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  metric_name: z.string(),
  P75: z.coerce.number().default(0),
  good_max: z.coerce.number().default(0),
  ni_max: z.coerce.number().default(0),
  good_density: z.coerce.number().default(0),
  ni_density: z.coerce.number().default(0),
  poor_density: z.coerce.number().default(0),
});

export type CruxHistoryItem = z.infer<typeof cruxHistoryItemSchema>;
