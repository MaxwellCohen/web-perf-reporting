/** LCP subpart colors, shared by the waterfall and the loading story. Avoids rating hues (emerald/amber/rose). */
export const LCP_PHASE_COLORS: Record<string, string> = {
  timeToFirstByte: "bg-sky-500",
  resourceLoadDelay: "bg-violet-500",
  resourceLoadDuration: "bg-teal-500",
  elementRenderDelay: "bg-fuchsia-500",
};
