import { z } from "zod"

export const cruxHistogramSchema = z.array(
    z.object({
      start: z.union([z.number() , z.string()]),
      end: z.union([z.number() , z.string()]).optional(),
      density: z.number()
    })
);

export type CruxHistogram = z.infer<typeof cruxHistogramSchema>;

export const cruxDateSchema = z.object({
    year: z.number(),
    month: z.number(),
    day: z.number()
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