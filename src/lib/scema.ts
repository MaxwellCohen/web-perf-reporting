import exp from "constants";
import { z } from "zod"

export const cruxHistogramSchema = z.array(
    z.object({
      start: z.coerce.number().catch((e)=> NaN),
      end: z.coerce.number().catch((e)=> NaN).optional(),
      density: z.union([z.coerce.number().catch((e)=> NaN), z.nan()]),
    })
);

export type CruxHistogram = z.infer<typeof cruxHistogramSchema>;

export const cruxDateSchema = z.object({
    year: z.coerce.number().catch((e)=> NaN),
    month: z.coerce.number().catch((e)=> NaN),
    day: z.coerce.number().catch((e)=> NaN),
  });

export type CruxDate = z.infer<typeof cruxDateSchema>;

export const cruxPercentileSchema = z.object({ p75: z.union([z.number() , z.string()]) })

export type CruxPercentile = z.infer<typeof cruxPercentileSchema>;

export const cruxReportSchema = z.object({
  record: z.object({
    key: z.object({ formFactor: z.string(), origin: z.string() }),
    metrics: z.object({
      largest_contentful_paint_resource_type: z.object({
        fractions: z.object({ image: z.number(), text: z.number() })
      }),
      navigation_types: z.object({
        fractions: z.object({
          navigate: z.number(),
          navigate_cache: z.number(),
          reload: z.number(),
          restore: z.number(),
          back_forward: z.number(),
          back_forward_cache: z.number(),
          prerender: z.number()
        })
      }).optional(),
      cumulative_layout_shift: z.object({
        histogram: cruxHistogramSchema,
        percentiles: cruxPercentileSchema
      }),
      experimental_time_to_first_byte: z.object({
        histogram: cruxHistogramSchema,
        percentiles: cruxPercentileSchema
      }),
      interaction_to_next_paint: z.object({
        histogram: cruxHistogramSchema,
        percentiles: cruxPercentileSchema
      }),
      largest_contentful_paint: z.object({
        histogram: cruxHistogramSchema,
        percentiles: cruxPercentileSchema
      }),
      largest_contentful_paint_image_resource_load_duration: z.object({
        percentiles: cruxPercentileSchema
      }),
      round_trip_time: z.object({
        histogram: cruxHistogramSchema,
        percentiles: cruxPercentileSchema
      }),
      first_contentful_paint: z.object({
        histogram: cruxHistogramSchema,
        percentiles: cruxPercentileSchema
      }),
      largest_contentful_paint_image_element_render_delay: z.object({
        percentiles: cruxPercentileSchema
      }),
      largest_contentful_paint_image_resource_load_delay: z.object({
        percentiles: cruxPercentileSchema
      }),
      largest_contentful_paint_image_time_to_first_byte: z.object({
        percentiles: cruxPercentileSchema
      })
    }),
    collectionPeriod: z.object({
      firstDate:cruxDateSchema,
      lastDate: cruxDateSchema
    })
  })
})

export type CruxReport = z.infer<typeof cruxReportSchema>;

export const urlSchema = z.string().url();


export const CruxHistoryHistogramTimeseries = z.array(
    z.object({
      start: z.coerce.number().catch((e)=> NaN),
      end: z.coerce.number().catch((e)=> NaN).optional(),
      densities: z.array(z.coerce.number().catch((e)=> NaN))
    })
);

export type CruxHistoryHistogramTimeseries = z.infer<typeof CruxHistoryHistogramTimeseries>;

export const CruxHistoryPercentilesTimeseries = z.object({
  p75s: z.array(z.union([z.null(), z.number(), z.string()]))
})

export type CruxHistoryPercentilesTimeseries = z.infer<typeof CruxHistoryPercentilesTimeseries>;

export const CruxHistoryReportCollectionPeriods = z.array(
  z.object({
    firstDate: cruxDateSchema,
    lastDate: cruxDateSchema
  })
)

export type CruxHistoryReportCollectionPeriods = z.infer<typeof CruxHistoryReportCollectionPeriods>;

export const CruxHistoryReport = z.object({
  record: z.object({
    key: z.object({ formFactor: z.string().optional(), origin: z.string() }),
    metrics: z.object({
      round_trip_time: z.object({
        histogramTimeseries:CruxHistoryHistogramTimeseries,
        percentilesTimeseries: CruxHistoryPercentilesTimeseries,
      }),
      experimental_time_to_first_byte: z.object({
        histogramTimeseries: CruxHistoryHistogramTimeseries,
        percentilesTimeseries: CruxHistoryPercentilesTimeseries,
      }),
      first_contentful_paint: z.object({
        histogramTimeseries: CruxHistoryHistogramTimeseries,
        percentilesTimeseries: CruxHistoryPercentilesTimeseries,
      }),
      interaction_to_next_paint: z.object({
        histogramTimeseries:CruxHistoryHistogramTimeseries,
        percentilesTimeseries: CruxHistoryPercentilesTimeseries,
      }),
      largest_contentful_paint_image_resource_load_delay: z.object({
        percentilesTimeseries: CruxHistoryPercentilesTimeseries
      }),
      cumulative_layout_shift: z.object({
        histogramTimeseries: CruxHistoryHistogramTimeseries,
        percentilesTimeseries: CruxHistoryPercentilesTimeseries
      }),
      largest_contentful_paint: z.object({
        histogramTimeseries: CruxHistoryHistogramTimeseries,
        percentilesTimeseries: CruxHistoryPercentilesTimeseries,
      }),
      largest_contentful_paint_image_element_render_delay: z.object({
        percentilesTimeseries: CruxHistoryPercentilesTimeseries
      }),
      largest_contentful_paint_image_resource_load_duration: z.object({
        percentilesTimeseries: CruxHistoryPercentilesTimeseries
      }),
      largest_contentful_paint_image_time_to_first_byte: z.object({
        percentilesTimeseries: CruxHistoryPercentilesTimeseries
      }),
      largest_contentful_paint_resource_type: z.object({
        fractionTimeseries: z.object({
          image: z.object({
            fractions: z.array(z.union([z.string(), z.number()]))
          }),
          text: z.object({
            fractions: z.array(z.union([z.string(), z.number()]))
          })
        })
      }),
      navigation_types: z.object({
        fractionTimeseries: z.object({
          navigate: z.object({ fractions: z.array(z.number()) }),
          navigate_cache: z.object({ fractions: z.array(z.number()) }),
          reload: z.object({ fractions: z.array(z.number()) }),
          restore: z.object({ fractions: z.array(z.number()) }),
          back_forward: z.object({ fractions: z.array(z.number()) }),
          back_forward_cache: z.object({ fractions: z.array(z.number()) }),
          prerender: z.object({ fractions: z.array(z.number()) })
        })
      }).optional()
    }),
    collectionPeriods: CruxHistoryReportCollectionPeriods
  })
})

export type CruxHistoryReport = z.infer<typeof CruxHistoryReport>;