import { z } from 'zod';

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

export const cruxReportSchema = z.object({
  record: z.object({
    key: keySchema,
    metrics: z.object({
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
          fractions: z.object({
            desktop: coerceNumber,
            phone: coerceNumber,
            tablet: coerceNumber,
          }),
        })
        .optional(),
      largest_contentful_paint_image_resource_load_duration:
        CruxHistogramItem.omit({ histogram: true }).optional(),
      largest_contentful_paint_image_element_render_delay:
        CruxHistogramItem.omit({ histogram: true }).optional(),
      largest_contentful_paint_image_resource_load_delay:
        CruxHistogramItem.omit({ histogram: true }).optional(),
      largest_contentful_paint_image_time_to_first_byte: CruxHistogramItem.omit(
        { histogram: true },
      ).optional(),
    }).partial(),
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
      form_factors: z.object({
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
      }).optional(),
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
      max: z.number().optional(),
      proportion: z.number(),
    }),
  ),
  category: z.string(),
});

export type UserPageLoadMetricV5 = z.infer<typeof UserPageLoadMetricV5schema>;

export const PageSpeedApiLoadingExperienceV5 = z.object({
  metrics: z.object({
    CUMULATIVE_LAYOUT_SHIFT_SCORE: UserPageLoadMetricV5schema,
    EXPERIMENTAL_TIME_TO_FIRST_BYTE: UserPageLoadMetricV5schema,
    FIRST_CONTENTFUL_PAINT_MS: UserPageLoadMetricV5schema,
    INTERACTION_TO_NEXT_PAINT: UserPageLoadMetricV5schema,
    LARGEST_CONTENTFUL_PAINT_MS: UserPageLoadMetricV5schema,
  }),
  overall_category: z.string(),
});

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
  })
  .partial();

const auditResultSchema = z
  .object({
    description: z.string().optional(),
    details: z.any().optional(),
    errorMessage: z.string().optional(),
    explanation: z.string().optional(),
    id: z.string(),
    numericValue: z.number().optional(),
    score: z.number().nullable(),
    scoreDisplayMode: z.string(),
    title: z.string(),
    warnings: z.array(z.any()).optional(),
  })
  .partial();

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

const lighthouseResultV5Schema = z
  .object({
    artifacts: artifactsSchema,
    categories: z.record(categoryResultSchema),
    categoryGroups: z.record(categorySchema).optional(),
    configSettings: configSettingsSchema,
    environment: environmentSchema,
    fetchTime: z.string(),
    finalUrl: z.string(),
    generatedTime: z.string(),
    lighthouseVersion: z.string(),
    requestedUrl: z.string(),
    runWarnings: z.array(z.string()),
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
    audits: z.record(auditResultSchema),
  })
  .partial();

export const pageSpeedInsightsSchema = z.object({
  kind: z.string(),
  captchaResult: z.string(),
  id: z.string(),
  loadingExperience: PageSpeedApiLoadingExperienceV5,
  originLoadingExperience: PageSpeedApiLoadingExperienceV5,
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
  P75: z.number().default(0),
  good_max: z.number().default(0),
  ni_max: z.number().default(0),
  good_density: z.number().default(0),
  ni_density: z.number().default(0),
  poor_density: z.number().default(0),
});

export type CruxHistoryItem = z.infer<typeof cruxHistoryItemSchema>;
