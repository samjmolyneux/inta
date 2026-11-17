/* global Plotly */
// TODO: Check that the no js message is shown for all

// F4 uses beta = 4 in the F-beta formula.
const F4_BETA_SQUARED = 4 ** 2;

// Keep the density plots' ranges and threshold lines aligned.
const SCORE_AXIS_PADDING_FRACTION = 0.05;
// Leave headroom above the tallest density for the outcome labels.
const DENSITY_Y_MAX_FACTOR = 1.2;

// Outcome labels sit this far in from the left and right edges of each density panel.
const OUTCOME_LABEL_INSET_FRACTION = 0.015;
// Width in pixels reserved for an outcome label; the threshold line hides a label it would cross.
const OUTCOME_LABEL_WIDTH_PX = 72;

// Gap in pixels between the gains point and its readout.
const GAINS_READOUT_OFFSET_PX = 10;
// Approximate readout sizes in pixels, on one line or, on narrow charts, two.
const GAINS_READOUT_SIZE_PX = {
  wide: { width: 190, height: 26 },
  compact: { width: 104, height: 42 },
};
// Charts narrower than this show the readout on two lines.
const GAINS_COMPACT_WIDTH_PX = 480;
// Approximate pixels taken by the gains chart's axis labels and titles.
const GAINS_AXES_ALLOWANCE_PX = { x: 64, y: 52 };

// Clear space in pixels kept either side of a confusion-matrix count.
const CELL_COUNT_INSET_PX = 8;

// Interval ends within this many hundredths of a percent of a rounding step are taken
// to be on it, so float error never rounds an exact value outwards.
const PERCENT_ROUNDING_SLACK = 1e-6;
// How long the interval explanation stays open after the pointer leaves its key.
const INFO_HIDE_DELAY_MS = 150;
// Space kept between the explanation and the top or bottom of the viewport.
const INFO_VIEWPORT_GAP_PX = 8;
// Fixed examples in the interval table; the current positive count is added in order.
const INTERVAL_TABLE_SIZES = [10, 100, 1000, 10_000];
// Share of each tail outside a 95% interval.
const INTERVAL_TAIL = 0.025;
// Lanczos approximation of the log gamma function (g = 7, nine coefficients).
const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531,
  -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6,
  1.5056327351493116e-7,
];
// Limits for the incomplete beta continued fraction and the quantile search.
const BETA_FRACTION_MAX_TERMS = 100_000;
const BETA_FRACTION_PRECISION = 1e-14;
const BETA_FRACTION_FLOOR = 1e-300;
const QUANTILE_STEPS = 60;

// Must match the max-width media query in style.css that stacks the three panels.
const STACKED_LAYOUT_QUERY = "(max-width: 1000px)";
// How the moved panels settle into their new places when the layout switches.
const LAYOUT_ANIMATION_MS = 320;
const LAYOUT_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const LAYOUT_FADE_FROM_OPACITY = 0.25;
const LAYOUT_FADE_SHIFT_PX = 14;
const LAYOUT_FADE_STAGGER_MS = 50;

const PLOT_FONT = {
  family: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  size: 12,
};

/**
 * @typedef {object} ClassificationMetrics
 * @property {number} TN - Number of true negatives
 * @property {number} FP - Number of false positives
 * @property {number} FN - Number of false negatives
 * @property {number} TP - Number of true positives
 * @property {number} accuracy - Overall accuracy
 * @property {number} TPR - True positive rate (recall)
 * @property {number} FPR - False positive rate
 * @property {number} precision - Precision
 * @property {number} balancedAccuracy - Balanced accuracy
 * @property {number} F4 - F4 score
 */

/**
 * Select-threshold plot configuration.
 * Loaded from #plot-config JSON, then augmented in initConfig().
 * Note: Jinja renders this file, so avoid double braces in comments and code.
 * @typedef {object} SelectThresholdCfg
 * @property {Map<string, number>} distributionTraceIndex - distribution trace name to index
 * @property {Map<string, number>} gainsTraceIndex - gains trace name to index
 * @property {Palette} palette - colours read from the stylesheet
 * @property {number} minScore - dataset min score
 * @property {number} maxScore - dataset max score
 * @property {number} scoreRange - convenience: maxScore - minScore
 * @property {number[]} scoreAxisRange - [min, max] of the shared score axis
 * @property {number} maxDistributionY - y-axis max for distribution plots
 * @property {number[]} xN - negative density: x
 * @property {number[]} yN - negative density: y
 * @property {number[]} xP - positive density: x
 * @property {number[]} yP - positive density: y
 * @property {number[]} posScores - positive-class scores sorted ascending
 * @property {number[]} negScores - negative-class scores sorted ascending
 * @property {number[]} xGains - gains curve x (proportion examined)
 * @property {number[]} yGains - gains curve y (recall)
 * @property {number[]} [gainsRecallLower] - pointwise 95% lower recall limits
 * @property {number[]} [gainsRecallUpper] - pointwise 95% upper recall limits
 * @property {number[]} gainsThresholds - threshold per gains point
 * @property {number} rocAuc - ROC AUC of model
 * @property {number} prAuc - PR AUC of model
 * @property {number} dp - decimal places for thresholds
 * @property {number} currentThreshold - threshold currently shown
 * @property {ClassificationMetrics} [intervalMetrics] - metrics the interval explanation describes
 * @property {string} imageSavepath - savepath to save image of plot when plotly save button clicked
 */

/**
 * Colours shared by the charts and the HTML, read from the stylesheet.
 * @typedef {object} Palette
 * @property {string} ink - main text
 * @property {string} chartInk - threshold line and axis titles
 * @property {string} muted - tick labels and secondary text
 * @property {string} border - card and annotation borders
 * @property {string} grid - chart grid lines
 * @property {string} surface - card background
 * @property {string} accent - gains curve and its point
 * @property {string} accentFill - shaded recall interval
 * @property {string} guide - dotted guide lines on the gains chart
 * @property {string} tn - true negatives (correct, negative class)
 * @property {string} fp - false positives (error, negative class)
 * @property {string} fn - false negatives (error, positive class)
 * @property {string} tp - true positives (correct, positive class)
 */

/**
 * Select-threshold UI elements.
 * Resolved once in initUI().
 * @typedef {object} SelectThresholdUI
 * @property {HTMLInputElement} recallInput - input for recall percentage
 * @property {HTMLInputElement} thresholdInput - input for decision threshold
 * @property {HTMLInputElement} thresholdSlider - range slider for decision threshold
 * @property {HTMLElement} inputStatus - validation feedback
 * @property {HTMLButtonElement} resetButton - restore the initial threshold
 * @property {HTMLElement} distributionPlot - container of the density chart
 * @property {HTMLElement} gainsPlot - container of the gains chart
 * @property {Map<string, HTMLElement>} text - elements whose text shows a live value
 * @property {Map<string, HTMLElement>} metricValues - metric name to its table cell
 * @property {HTMLTableElement} matrix - confusion matrix table
 * @property {HTMLElement[]} cellCounts - confusion-matrix counts, in TN, FP, FN, TP order
 */

/**
 * TN/FP split of the negative-density trace at a threshold.
 * @typedef {object} NegativeSplitSegments
 * @property {number[]} xTN - x values for TN segment
 * @property {number[]} yTN - y values for TN segment
 * @property {number[]} xFP - x values for FP segment
 * @property {number[]} yFP - y values for FP segment
 */

/**
 * FN/TP split of the positive-density trace at a threshold.
 * @typedef {object} PositiveSplitSegments
 * @property {number[]} xFN - x values for FN segment
 * @property {number[]} yFN - y values for FN segment
 * @property {number[]} xTP - x values for TP segment
 * @property {number[]} yTP - y values for TP segment
 */

/**
 * Layout pieces drawn over a chart at a threshold.
 * @typedef {object} ChartOverlays
 * @property {object[]} annotations - text labels
 * @property {object[]} [shapes] - lines
 */

/**
 * Size of a chart container in pixels.
 * @typedef {object} PlotSize
 * @property {number} width - container width
 * @property {number} height - container height
 */

/**
 * Lines and proportion for the gains plot at a threshold.
 * @typedef {object} GainsGuideLines
 * @property {number[]} gainsVx - vertical line x values [proportion, proportion]
 * @property {number[]} gainsVy - vertical line y values [0, recall]
 * @property {number[]} gainsHx - horizontal line x values [0, proportion]
 * @property {number[]} gainsHy - horizontal line y values [recall, recall]
 * @property {number} proportionAbove - proportion of examples above threshold
 */

/**
 * Binary search to find smallest array index i s.t. threshold <= arr[i].
 * If all elements in arr are < threshold, returns arr.length.
 * @param {number[]} arr - Sorted array to search
 * @param {number} threshold - Threshold value
 * @returns {number} - Array index or arr.length
 */
const findSplitIndex = (arr, threshold) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] < threshold) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
};

/**
 * Computes common binary classification metrics at a given decision threshold.
 * A score is predicted **positive** if `score >= threshold`,
 * @param {number} threshold - Classification decision threshold.
 * @param {number[]} posScores - Scores for positive class (sorted ascending).
 * @param {number[]} negScores - Scores for negative class (sorted ascending).
 * @returns {ClassificationMetrics} - Object containing classification metrics.
 */
const computeClassificationMetrics = (threshold, posScores, negScores) => {
  const posSplitIdx = findSplitIndex(posScores, threshold);
  const negSplitIdx = findSplitIndex(negScores, threshold);

  const FN = posSplitIdx;
  const TP = posScores.length - posSplitIdx;
  const TN = negSplitIdx;
  const FP = negScores.length - negSplitIdx;

  const accuracy = (TP + TN) / (TP + TN + FP + FN);
  const TPR = TP + FN > 0 ? TP / (TP + FN) : 0; // Recall
  const FPR = FP + TN > 0 ? FP / (FP + TN) : 0;
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const balancedAccuracy = 0.5 * (TPR + (1 - FPR));

  let F4;
  if (precision === 0 && TPR === 0) {
    F4 = 0;
  } else {
    F4 =
      ((1 + F4_BETA_SQUARED) * precision * TPR) / (F4_BETA_SQUARED * precision + TPR);
  }

  return {
    TN,
    FP,
    FN,
    TP,
    accuracy,
    TPR,
    FPR,
    precision,
    balancedAccuracy,
    F4,
  };
};

/**
 * Read the chart colours from the stylesheet's custom properties.
 * @returns {Palette} Colours, falling back to the defaults if a property is missing.
 */
const readPalette = () => {
  const styles = getComputedStyle(document.documentElement);
  const read = (property, fallback) =>
    styles.getPropertyValue(property).trim() || fallback;
  return {
    ink: read("--ink", "#243447"),
    chartInk: read("--chart-ink", "#344c68"),
    muted: read("--muted", "#68788b"),
    border: read("--border", "#dfe5ed"),
    grid: read("--grid", "#edf1f5"),
    surface: read("--surface", "#fff"),
    accent: read("--accent", "#3479b8"),
    // Use the uncertainty demo's explicit RGBA colour for Plotly's fill.
    accentFill: "rgba(52, 121, 184, 0.15)",
    guide: read("--guide", "#8293a7"),
    tn: read("--tn", "salmon"),
    fp: read("--fp", "pink"),
    fn: read("--fn", "lightgreen"),
    tp: read("--tp", "green"),
  };
};

/**
 * Format a fraction as a percentage with two decimal places.
 * That is four significant figures from 10% up, matching the other metrics.
 * @param {number} fraction - Value between 0 and 1.
 * @returns {string} Formatted percentage, e.g. "79.04%".
 */
const formatPercent = (fraction) => `${(100 * fraction).toFixed(2)}%`;

// Counts from this size up are shown in compact form, e.g. 596,039 as "596K".
const COMPACT_COUNT_FROM = 1000;
// Formats a count to exactly three significant figures, e.g. 1,598,380 as "1.60M".
// Numbers are always written in English, so they read the same for every viewer.
const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  minimumSignificantDigits: 3,
  maximumSignificantDigits: 3,
});

/**
 * Format a count for a confusion-matrix cell, in compact form from a thousand up.
 * Smaller counts stay whole numbers, since three figures would turn 42 into "42.0".
 * @param {number} count - Number of items.
 * @returns {string} Formatted count, e.g. "42", "40.2K" or "1.60M".
 */
const formatCount = (count) =>
  count < COMPACT_COUNT_FROM ? count.toLocaleString("en") : compactNumber.format(count);

/**
 * Format a count in full, for running text.
 * @param {number} count - Number of items.
 * @returns {string} Formatted count, e.g. "1,598,380".
 */
const formatFullCount = (count) => count.toLocaleString("en");

// Table counts from this size up are shown in compact form, e.g. 2,000,000 as "2.000M".
const TABLE_COMPACT_FROM = 100_000;
// Formats a table count to four significant figures, keeping trailing zeros.
const tableCompactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  minimumSignificantDigits: 4,
  maximumSignificantDigits: 4,
});

/**
 * Format a count for a table: in full up to 99,999, then compact to four figures.
 * @param {number} count - Number of items.
 * @returns {string} Formatted count, e.g. "99,999" or "250.0K".
 */
const formatTableCount = (count) => {
  if (count < TABLE_COMPACT_FROM) return formatFullCount(count);
  return tableCompactNumber.format(count);
};

/**
 * Format an interval's ends as percentages, rounded outwards to two decimal places.
 * The shown interval then always contains the exact one.
 * So a lower end just under 100% is never shown as 100.00%, nor an upper end just over 0% as 0.00%.
 * @param {number} lower - Lower end, from 0 to 1.
 * @param {number} upper - Upper end, from 0 to 1.
 * @returns {string[]} The formatted [lower, upper].
 */
const formatInterval = (lower, upper) => {
  // Work in hundredths of a percent, nudged so float error never moves an exact value.
  let low = Math.floor(10_000 * lower + PERCENT_ROUNDING_SLACK) / 100;
  let high = Math.ceil(10_000 * upper - PERCENT_ROUNDING_SLACK) / 100;
  // Even an extremely narrow interval must not imply certainty at either end.
  if (lower < 1) low = Math.min(low, 99.99);
  if (upper > 0) high = Math.max(high, 0.01);
  return [`${low.toFixed(2)}%`, `${high.toFixed(2)}%`];
};

/**
 * Map each name to its position in the list.
 * @param {string[]} names - Names in order.
 * @returns {Map<string, number>} Name to index.
 */
const toIndexMap = (names) =>
  new Map(names.map((traceName, index) => [traceName, index]));

/**
 * Shared Plotly settings: only the image export button, shown on hover.
 * Plotly's own responsive mode waits until resizing pauses before redrawing, which
 * leaves charts at their old size while a window is dragged. initResponsiveLayout()
 * redraws them on every frame instead.
 * @param {string} filename - Base filename for the exported image.
 * @returns {object} Plotly config object.
 */
const createPlotlySettings = (filename) => {
  return {
    responsive: false,
    scrollZoom: false,
    modeBarButtons: [["toImage"]],
    displaylogo: false,
    toImageButtonOptions: {
      format: "png",
      filename,
      // eslint-disable-next-line unicorn/no-null -- Plotly uses null for the current graph size.
      height: null,
      // eslint-disable-next-line unicorn/no-null -- Plotly uses null for the current graph size.
      width: null,
      scale: 3,
    },
  };
};

/**
 * Build one filled density segment trace.
 * @param {object} options - Trace options.
 * @param {string} options.outcome - Outcome name, e.g. "TN".
 * @param {string} options.color - Outline colour; Plotly fills beneath at half opacity.
 * @param {string} options.yaxis - Plotly y-axis id.
 * @returns {object} Plotly scatter trace.
 */
const createDensityTrace = ({ outcome, color, yaxis }) => {
  return {
    x: [],
    y: [],
    mode: "lines",
    fill: "tozeroy",
    line: { color, width: 2 },
    name: outcome,
    xaxis: "x",
    yaxis,
    hoverinfo: "skip",
  };
};

/**
 * Create the stacked negative/positive score density chart.
 * Negatives sit above positives and both share the score axis.
 * @param {SelectThresholdCfg} cfg - Plot config data
 * @returns {Promise<HTMLElement>} The initialized Plotly figure.
 */
const createDistributionPlot = (cfg) => {
  const { distributionTraceIndex, palette, maxDistributionY, scoreAxisRange } = cfg;

  const traces = {
    TN: createDensityTrace({ outcome: "TN", color: palette.tn, yaxis: "y2" }),
    FP: createDensityTrace({ outcome: "FP", color: palette.fp, yaxis: "y2" }),
    FN: createDensityTrace({ outcome: "FN", color: palette.fn, yaxis: "y" }),
    TP: createDensityTrace({ outcome: "TP", color: palette.tp, yaxis: "y" }),
  };

  const data = [];
  for (const [traceName, trace] of Object.entries(traces)) {
    data[distributionTraceIndex.get(traceName)] = trace;
  }

  const scoreAxis = {
    range: scoreAxisRange,
    showgrid: true,
    gridcolor: palette.grid,
    zeroline: false,
    showline: false,
    fixedrange: true,
  };

  const densityYAxis = {
    range: [0, maxDistributionY * DENSITY_Y_MAX_FACTOR],
    showticklabels: false,
    showgrid: false,
    // The zero line doubles as each panel's baseline.
    zeroline: true,
    zerolinecolor: palette.border,
    zerolinewidth: 1,
    fixedrange: true,
  };

  const layout = {
    autosize: true,
    margin: { l: 0, r: 4, t: 24, b: 44 },
    font: { ...PLOT_FONT, color: palette.muted },
    showlegend: false,
    xaxis: {
      ...scoreAxis,
      anchor: "y",
      title: { text: "Model score", standoff: 8, font: { color: palette.chartInk } },
    },
    xaxis2: { ...scoreAxis, matches: "x", anchor: "y2", showticklabels: false },
    yaxis: { ...densityYAxis, domain: [0, 0.44] },
    yaxis2: { ...densityYAxis, domain: [0.56, 1] },
    annotations: [],
    shapes: [],
    dragmode: false,
    hovermode: false,
  };

  return Plotly.newPlot(
    "distribution-plot",
    data,
    layout,
    createPlotlySettings(`${cfg.imageSavepath}-distributions`),
  );
};

/**
 * Check that the configuration has a recall interval for every gains point.
 * Older saved configurations have none, and still draw without it.
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @returns {boolean} Whether the interval can be shown.
 */
const hasRecallInterval = (cfg) => {
  const count = cfg.xGains.length;
  return (
    cfg.gainsRecallLower?.length === count && cfg.gainsRecallUpper?.length === count
  );
};

/**
 * Create the cumulative gain chart with guide lines to the current threshold.
 * @param {SelectThresholdCfg} cfg - Plot config data
 * @returns {Promise<HTMLElement>} The initialized Plotly figure.
 */
const createGainsPlot = (cfg) => {
  const { gainsTraceIndex, palette, xGains, yGains, gainsThresholds } = cfg;
  const hasInterval = hasRecallInterval(cfg);
  const intervalX = hasInterval ? xGains : [];
  const intervalStyle = {
    mode: "lines",
    line: { width: 0, shape: "hv" },
    hoverinfo: "skip",
  };

  const guideLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { color: palette.guide, width: 1, dash: "dot" },
    hoverinfo: "skip",
  };

  const traces = {
    gainsUpperInterval: {
      ...intervalStyle,
      x: intervalX,
      y: hasInterval ? cfg.gainsRecallUpper : [],
    },
    gainsLowerInterval: {
      ...intervalStyle,
      x: intervalX,
      y: hasInterval ? cfg.gainsRecallLower : [],
      fill: "tonexty",
      fillcolor: palette.accentFill,
    },
    gainsVerticalProportionLine: guideLine,
    gainsHorizontalRecallLine: { ...guideLine },
    gainsCurve: {
      x: xGains,
      y: yGains,
      mode: "lines",
      line: { width: 2.5, color: palette.accent, shape: "hv" },
      customdata: gainsThresholds,
      // Plotly replaces %{...} placeholders when rendering hover text.
      hovertemplate:
        "Reviewed %{x:.1%}<br>Recall %{y:.1%}<br>Threshold %{customdata:.4f}<extra></extra>",
      hoverlabel: {
        bgcolor: palette.surface,
        bordercolor: palette.accent,
        font: { ...PLOT_FONT, color: palette.ink },
      },
    },
    gainsMarker: {
      x: [],
      y: [],
      mode: "markers",
      cliponaxis: false,
      marker: {
        size: 12,
        color: palette.accent,
        line: { color: palette.surface, width: 2 },
      },
      hoverinfo: "skip",
    },
  };

  const data = [];
  for (const [traceName, trace] of Object.entries(traces)) {
    data[gainsTraceIndex.get(traceName)] = trace;
  }

  const percentAxis = {
    // Pad slightly so the two 0% labels do not collide at the origin.
    range: [-0.02, 1.02],
    tickformat: ".0%",
    dtick: 0.2,
    gridcolor: palette.grid,
    zeroline: false,
    showline: false,
    fixedrange: true,
    automargin: true,
  };

  const layout = {
    autosize: true,
    // The top margin keeps room for the 100% label, which Plotly hides if it pokes out.
    margin: { l: 4, r: 12, t: 8, b: 4 },
    font: { ...PLOT_FONT, color: palette.muted },
    showlegend: false,
    xaxis: {
      ...percentAxis,
      title: { text: "Items reviewed", standoff: 8, font: { color: palette.chartInk } },
    },
    yaxis: {
      ...percentAxis,
      title: { text: "Recall", standoff: 8, font: { color: palette.chartInk } },
    },
    annotations: [],
    dragmode: false,
    hovermode: "closest",
  };

  return Plotly.newPlot(
    "gains-plot",
    data,
    layout,
    createPlotlySettings(`${cfg.imageSavepath}-gains`),
  );
};

/**
 * Split negative-density trace into TN/FP segments at a threshold.
 * @param {number[]} xN - negative density x values
 * @param {number[]} yN - negative density y values
 * @param {number} threshold - decision threshold
 * @returns {NegativeSplitSegments} - TN (left) and FP (right) segments
 */
const splitNegativeTraceByClassification = (xN, yN, threshold) => {
  const idxN = findSplitIndex(xN, threshold);

  if (idxN > 0 && idxN < xN.length) {
    const xNDiff = xN[idxN] - xN[idxN - 1];
    const yNDiff = yN[idxN] - yN[idxN - 1];
    const yInterpolated = yN[idxN] + ((threshold - xN[idxN]) * yNDiff) / xNDiff;

    return {
      xTN: [...xN.slice(0, idxN), threshold],
      yTN: [...yN.slice(0, idxN), yInterpolated],
      xFP: [threshold, ...xN.slice(idxN)],
      yFP: [yInterpolated, ...yN.slice(idxN)],
    };
  }

  if (idxN === xN.length) {
    return {
      xTN: [...xN],
      yTN: [...yN],
      xFP: [],
      yFP: [],
    };
  }

  return {
    xTN: [],
    yTN: [],
    xFP: [...xN],
    yFP: [...yN],
  };
};

/**
 * Split positive-density trace into FN/TP segments at a threshold.
 * @param {number[]} xP - positive density x values
 * @param {number[]} yP - positive density y values
 * @param {number} threshold - decision threshold
 * @returns {PositiveSplitSegments} - FN (left) and TP (right) segments
 */
const splitPositiveTraceByClassification = (xP, yP, threshold) => {
  const idxP = findSplitIndex(xP, threshold);

  if (idxP > 0 && idxP < xP.length) {
    const xPDiff = xP[idxP] - xP[idxP - 1];
    const yPDiff = yP[idxP] - yP[idxP - 1];
    const yInterpolated = yP[idxP] + ((threshold - xP[idxP]) * yPDiff) / xPDiff;

    return {
      xFN: [...xP.slice(0, idxP), threshold],
      yFN: [...yP.slice(0, idxP), yInterpolated],
      xTP: [threshold, ...xP.slice(idxP)],
      yTP: [yInterpolated, ...yP.slice(idxP)],
    };
  }

  if (idxP === xP.length) {
    return {
      xFN: [...xP],
      yFN: [...yP],
      xTP: [],
      yTP: [],
    };
  }

  return {
    xFN: [],
    yFN: [],
    xTP: [...xP],
    yTP: [...yP],
  };
};

/**
 * Compute gains-plot guide lines and proportion examined at a threshold.
 * @param {number} threshold - decision threshold
 * @param {ClassificationMetrics} metrics - metrics at threshold (for recall/TPR)
 * @param {number[]} posScores - positive-class scores (sorted ascending)
 * @param {number[]} negScores - negative-class scores (sorted ascending)
 * @returns {GainsGuideLines} - vertical/horizontal line coords and examined proportion
 */
const computeGainsHozVerLines = (threshold, metrics, posScores, negScores) => {
  const negIdx = findSplitIndex(negScores, threshold);
  const posIdx = findSplitIndex(posScores, threshold);

  const numNegAbove = negScores.length - negIdx;
  const numPosAbove = posScores.length - posIdx;
  const totalNumScores = negScores.length + posScores.length;

  const proportionAbove = (numNegAbove + numPosAbove) / totalNumScores;

  return {
    gainsVx: [proportionAbove, proportionAbove],
    gainsVy: [0, metrics.TPR],
    gainsHx: [0, proportionAbove],
    gainsHy: [metrics.TPR, metrics.TPR],
    proportionAbove,
  };
};

/**
 * Build the dashed threshold lines, panel titles and corner outcome counts.
 * A corner label is hidden while the threshold line would run through it.
 * @param {number} threshold - decision threshold
 * @param {ClassificationMetrics} metrics - metrics at threshold
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @param {number} plotWidth - width of the density chart in pixels
 * @returns {ChartOverlays} Plotly layout annotations and shapes.
 */
const createDistributionOverlays = (threshold, metrics, cfg, plotWidth) => {
  const { palette, scoreAxisRange, posScores, negScores } = cfg;
  const [axisMin, axisMax] = scoreAxisRange;
  const position = (threshold - axisMin) / (axisMax - axisMin);
  const labelZone = OUTCOME_LABEL_INSET_FRACTION + OUTCOME_LABEL_WIDTH_PX / plotWidth;
  const isLeftLabelVisible = position > labelZone;
  const isRightLabelVisible = position < 1 - labelZone;

  const outcomeLabel = (outcome, count, yref, isLeft) => {
    return {
      text: `${outcome} <b>${count.toLocaleString("en")}</b>`,
      x: isLeft ? OUTCOME_LABEL_INSET_FRACTION : 1 - OUTCOME_LABEL_INSET_FRACTION,
      xref: "paper",
      y: 0.97,
      yref,
      xanchor: isLeft ? "left" : "right",
      yanchor: "top",
      showarrow: false,
      visible: isLeft ? isLeftLabelVisible : isRightLabelVisible,
      font: { size: 13, color: palette.ink },
    };
  };

  const panelTitle = (text, yref) => {
    return {
      text,
      x: 0,
      xref: "paper",
      y: 1,
      yref,
      xanchor: "left",
      yanchor: "bottom",
      yshift: 4,
      showarrow: false,
      font: { size: 13, color: palette.chartInk },
    };
  };

  const scoreNotes = [
    { scores: negScores, yref: "y2 domain" },
    { scores: posScores, yref: "y domain" },
  ]
    // eslint-disable-next-line unicorn/prefer-at -- Support Safari 15.1, which lacks Array.at.
    .filter(({ scores }) => scores[0] === scores[scores.length - 1])
    .map(({ scores, yref }) => {
      const label = scores.length === 1 ? "One score" : "All scores";
      return {
        text: `${label}: ${scores[0].toPrecision(4)}<br>No density estimate`,
        x: 0.5,
        xref: "paper",
        y: 0.5,
        yref,
        showarrow: false,
        font: { size: 12, color: palette.muted },
      };
    });

  return {
    annotations: [
      panelTitle(
        `Actual negatives (${negScores.length.toLocaleString("en")})`,
        "y2 domain",
      ),
      panelTitle(
        `Actual positives (${posScores.length.toLocaleString("en")})`,
        "y domain",
      ),
      outcomeLabel("TN", metrics.TN, "y2 domain", true),
      outcomeLabel("FP", metrics.FP, "y2 domain", false),
      outcomeLabel("FN", metrics.FN, "y domain", true),
      outcomeLabel("TP", metrics.TP, "y domain", false),
      ...scoreNotes,
    ],
    shapes: ["y2 domain", "y domain"].map((yref) => {
      return {
        type: "line",
        xref: "x",
        yref,
        x0: threshold,
        x1: threshold,
        y0: 0,
        y1: 1,
        line: { color: palette.chartInk, width: 1.5, dash: "dash" },
      };
    }),
  };
};

/**
 * Lowest the gains curve can be at or beyond a point on the x-axis.
 * The curve never falls as more items are reviewed.
 * So its last recorded point before x is a lower bound from x onwards.
 * @param {SelectThresholdCfg} cfg - plot config with the gains curve
 * @param {number} x - share of items reviewed
 * @returns {number} Recall the curve stays at or above from x onwards.
 */
const gainsFloorFrom = (cfg, x) => {
  const { xGains, yGains } = cfg;
  return yGains[Math.max(0, findSplitIndex(xGains, x) - 1)];
};

/**
 * Build the readout for the current point on the gains curve.
 * It sits below and to the right of the point, in the empty space under the curve.
 * At the right edge it slides left; near the origin it slides right until it fits.
 * Either way it never covers the line.
 * @param {number} proportionAbove - share of items reviewed at the threshold
 * @param {number} recall - recall at the threshold
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @param {PlotSize} plotSize - chart size in pixels
 * @returns {ChartOverlays} Plotly layout annotations.
 */
const createGainsOverlays = (proportionAbove, recall, cfg, plotSize) => {
  const { palette, xGains, yGains } = cfg;
  const isCompact = plotSize.width < GAINS_COMPACT_WIDTH_PX;
  const separator = isCompact ? "<br>" : " · ";
  const reviewText = `Review ${formatPercent(proportionAbove)}`;
  const text = `${reviewText}${separator}Recall ${formatPercent(recall)}`;

  // Convert the readout's size in pixels to data units on the 0-1 axes.
  const areaWidth = Math.max(plotSize.width - GAINS_AXES_ALLOWANCE_PX.x, 1);
  const areaHeight = Math.max(plotSize.height - GAINS_AXES_ALLOWANCE_PX.y, 1);
  const boxSize = GAINS_READOUT_SIZE_PX[isCompact ? "compact" : "wide"];
  const offsetX = GAINS_READOUT_OFFSET_PX / areaWidth;
  const offsetY = GAINS_READOUT_OFFSET_PX / areaHeight;
  const boxWidth = boxSize.width / areaWidth;
  const boxHeight = boxSize.height / areaHeight;

  let readoutLeft = Math.min(proportionAbove + offsetX, 1 - boxWidth);
  let readoutTop = Math.min(recall, gainsFloorFrom(cfg, readoutLeft)) - offsetY;
  if (readoutTop < boxHeight) {
    // Near the origin, move right until the curve is high enough to fit beneath.
    const index = Math.min(
      findSplitIndex(yGains, boxHeight + 2 * offsetY) + 1,
      xGains.length - 1,
    );
    readoutLeft = Math.min(Math.max(readoutLeft, xGains[index]), 1 - boxWidth);
    readoutTop = boxHeight;
  }

  return {
    annotations: [
      {
        text,
        align: "left",
        x: readoutLeft,
        y: readoutTop,
        xref: "x",
        yref: "y",
        xanchor: "left",
        yanchor: "top",
        showarrow: false,
        font: { size: 12, color: palette.chartInk },
        bgcolor: palette.surface,
        bordercolor: palette.border,
        borderwidth: 1,
        borderpad: 5,
      },
    ],
  };
};

/**
 * Replace every digit with 0, so texts that take the same width compare equal.
 * @param {string} text - text to reduce
 * @returns {string} The text's shape, e.g. "5.96M" becomes "0.00M".
 */
const textShape = (text) =>
  Array.from(text, (char) => ("0123456789".includes(char) ? "0" : char)).join("");

/**
 * Measure the width of an element's text, rather than of the box around it.
 * @param {HTMLElement} element - element holding the text
 * @returns {number} Text width in pixels.
 */
const measureTextWidth = (element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect().width;
};

/**
 * Show the confusion-matrix counts at one shared size that fits their cells.
 * The exact count is kept as a tooltip; the density plots and summary show it as well.
 * Digits are tabular, so a count's width depends only on its shape, such as "0.00M".
 * So the fit is measured again only when a count changes shape or the cells resize.
 * @param {SelectThresholdUI} ui - UI elements
 * @returns {void}
 */
const showCellCounts = (ui) => {
  const { matrix, cellCounts } = ui;
  for (const count of cellCounts) {
    const value = Number(count.dataset.value);
    count.textContent = formatCount(value);
    count.title = value < COMPACT_COUNT_FROM ? "" : value.toLocaleString("en");
  }

  const available = cellCounts[0].clientWidth - 2 * CELL_COUNT_INSET_PX;
  const shapes = cellCounts.map((count) => textShape(count.textContent));
  const fitKey = `${shapes.join(" ")} ${available}`;
  if (matrix.dataset.fitKey === fitKey) return;
  matrix.dataset.fitKey = fitKey;

  matrix.style.setProperty("--count-scale", "1");
  const widest = Math.max(...cellCounts.map((count) => measureTextWidth(count)));
  const scale = Math.max(0, Math.min(1, available / widest));
  matrix.style.setProperty("--count-scale", String(scale));
};

/**
 * Update the inputs, summary sentence, confusion matrix and metrics table.
 * @param {SelectThresholdUI} ui - UI elements
 * @param {number} threshold - current decision threshold
 * @param {ClassificationMetrics} metrics - computed metrics at threshold
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @param {number} proportionAbove - share of all items at or above the threshold
 * @returns {void}
 */
const updateInputElements = (ui, threshold, metrics, cfg, proportionAbove) => {
  const { dp, posScores, negScores } = cfg;

  ui.recallInput.value = (100 * metrics.TPR).toFixed(2);
  // Round inwards at the endpoints so the shown value stays in the input's valid range.
  const factor = 10 ** dp;
  let shownThreshold = Number(threshold.toFixed(dp));
  if (shownThreshold > Number(ui.thresholdInput.max)) {
    shownThreshold = Math.floor(threshold * factor) / factor;
  } else if (shownThreshold < Number(ui.thresholdInput.min)) {
    shownThreshold = Math.ceil(threshold * factor) / factor;
  }
  ui.thresholdInput.value = shownThreshold.toFixed(dp);
  ui.thresholdSlider.value = String(threshold);
  ui.thresholdSlider.setAttribute("aria-valuetext", threshold.toFixed(dp));

  ui.recallInput.setAttribute("aria-invalid", "false");
  ui.thresholdInput.setAttribute("aria-invalid", "false");
  ui.inputStatus.textContent = "";

  ui.recallInput.dataset.committedValue = ui.recallInput.value;
  ui.thresholdInput.dataset.committedValue = ui.thresholdInput.value;

  const total = posScores.length + negScores.length;
  const reviewed = metrics.TP + metrics.FP;

  const textUpdates = {
    "summary-reviewed": `${formatFullCount(reviewed)} of ${formatFullCount(total)}`,
    "summary-reviewed-share": `(${formatPercent(proportionAbove)})`,
    "summary-found": `${formatFullCount(metrics.TP)} of ${formatFullCount(posScores.length)}`,
    "summary-recall": `(${formatPercent(metrics.TPR)} recall).`,
  };
  for (const [id, text] of Object.entries(textUpdates)) {
    ui.text.get(id).textContent = text;
  }

  const cellValues = [metrics.TN, metrics.FP, metrics.FN, metrics.TP];
  for (const [index, count] of ui.cellCounts.entries()) {
    count.dataset.value = String(cellValues[index]);
  }
  showCellCounts(ui);

  const metricUpdates = [
    ["Accuracy", metrics.accuracy],
    ["Balanced accuracy", metrics.balancedAccuracy],
    ["Recall", metrics.TPR],
    ["Precision", metrics.precision],
    ["Specificity", 1 - metrics.FPR],
    ["False positive rate", metrics.FPR],
  ];
  for (const [metricName, value] of metricUpdates) {
    ui.metricValues.get(metricName).textContent = formatPercent(value);
  }
};

/**
 * Work out the natural log of the gamma function, for x of at least 1/2.
 * @param {number} x - Argument.
 * @returns {number} ln Γ(x).
 */
const logGamma = (x) => {
  const shifted = x - 1;
  const [first, ...rest] = LANCZOS_COEFFICIENTS;
  let sum = first;
  for (const [index, coefficient] of rest.entries()) {
    sum += coefficient / (shifted + index + 1);
  }
  const base = shifted + LANCZOS_G + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(base) -
    base +
    Math.log(sum)
  );
};

/**
 * Keep a continued fraction term away from zero, so it can be divided by.
 * @param {number} value - Term.
 * @returns {number} The term, or a tiny number in its place.
 */
const awayFromZero = (value) =>
  Math.abs(value) < BETA_FRACTION_FLOOR ? BETA_FRACTION_FLOOR : value;

/**
 * Evaluate the continued fraction for the incomplete beta function by Lentz's method.
 * @param {number} a - First shape parameter.
 * @param {number} b - Second shape parameter.
 * @param {number} x - Point, where the fraction converges quickly.
 * @returns {number} Value of the continued fraction.
 */
const betaContinuedFraction = (a, b, x) => {
  let c = 1;
  let d = 1 / awayFromZero(1 - ((a + b) * x) / (a + 1));
  let result = d;
  for (let term = 1; term <= BETA_FRACTION_MAX_TERMS; term += 1) {
    const twice = 2 * term;
    const even = (term * (b - term) * x) / ((a + twice - 1) * (a + twice));
    d = 1 / awayFromZero(1 + even * d);
    c = awayFromZero(1 + even / c);
    result *= d * c;
    const odd = -((a + term) * (a + b + term) * x) / ((a + twice) * (a + twice + 1));
    d = 1 / awayFromZero(1 + odd * d);
    c = awayFromZero(1 + odd / c);
    const change = d * c;
    result *= change;
    if (Math.abs(change - 1) < BETA_FRACTION_PRECISION) return result;
  }
  return result;
};

/**
 * Work out the regularized incomplete beta function: the beta distribution's CDF.
 * @param {number} x - Point from 0 to 1.
 * @param {number} a - First shape parameter.
 * @param {number} b - Second shape parameter.
 * @returns {number} Probability at or below x.
 */
const regularizedBeta = (x, a, b) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x),
  );
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(a, b, x)) / a;
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
};

/**
 * Find the beta distribution's quantile by bisection.
 * @param {number} probability - Probability from 0 to 1.
 * @param {number} a - First shape parameter.
 * @param {number} b - Second shape parameter.
 * @returns {number} The point with that probability at or below it.
 */
const betaQuantile = (probability, a, b) => {
  let low = 0;
  let high = 1;
  for (let step = 0; step < QUANTILE_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (regularizedBeta(middle, a, b) < probability) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
};

/**
 * Work out the exact (Clopper-Pearson) 95% interval for recall, as the Python side does.
 * @param {number} found - Positives found.
 * @param {number} total - All positives.
 * @returns {number[]} The interval's [lower, upper].
 */
const clopperPearson = (found, total) => {
  let lower = 0;
  let upper = 1;
  if (found > 0) lower = betaQuantile(INTERVAL_TAIL, found, total - found + 1);
  if (found < total) upper = betaQuantile(1 - INTERVAL_TAIL, found + 1, total - found);
  return [lower, upper];
};

/**
 * Fill the interval explanation with the interval at the current threshold.
 * Its table illustrates other sample sizes using rounded whole-number counts found.
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @returns {void}
 */
const fillIntervalInfo = (cfg) => {
  const { intervalMetrics: metrics } = cfg;
  const positives = cfg.posScores.length;
  const foundText = `${formatFullCount(metrics.TP)} of ${formatFullCount(positives)}`;
  const currentInterval = clopperPearson(metrics.TP, positives);
  const [lower, upper] = formatInterval(...currentInterval);
  document.querySelector("#interval-info-now").textContent = [
    `At this threshold, ${foundText} positives are found: recall ${formatPercent(metrics.TPR)},`,
    `with a 95% confidence interval of ${lower} to ${upper}.`,
  ].join(" ");
  const sizes = [...new Set([...INTERVAL_TABLE_SIZES, positives])];
  sizes.sort((a, b) => a - b);
  const rows = sizes.map((size) => {
    const isCurrent = size === positives;
    let found = Math.round(metrics.TPR * size);
    if (isCurrent) found = metrics.TP;
    const row = document.createElement("tr");
    row.classList.toggle("is-current", isCurrent);
    const sizeCell = document.createElement("th");
    sizeCell.scope = "row";
    sizeCell.textContent = formatTableCount(size);
    sizeCell.title =
      `${formatFullCount(size)} positives; ${formatFullCount(found)} found ` +
      `(${formatPercent(found / size)} recall)`;
    if (isCurrent) sizeCell.textContent += " (this data)";
    const interval = isCurrent ? currentInterval : clopperPearson(found, size);
    const bounds = formatInterval(...interval).map((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    });
    row.append(sizeCell, ...bounds);
    return row;
  });
  document.querySelector("#interval-info-rows").replaceChildren(...rows);
};

/**
 * Keep the interval explanation in step with the threshold.
 * Its intervals take some work, so they are only worked out while it is open.
 * @param {ClassificationMetrics} metrics - computed metrics at threshold
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @returns {void}
 */
const updateIntervalInfo = (metrics, cfg) => {
  if (!hasRecallInterval(cfg)) return;
  cfg.intervalMetrics = metrics;
  if (!document.querySelector("#interval-info").hidden) fillIntervalInfo(cfg);
};

/**
 * Recompute traces, annotations and UI for a threshold and apply them.
 * @param {number} threshold - decision threshold
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @param {SelectThresholdUI} ui - UI elements
 * @returns {Promise<HTMLElement[]>} The updated Plotly figures.
 */
const updatePlot = (threshold, cfg, ui) => {
  const {
    distributionTraceIndex,
    gainsTraceIndex,
    xN,
    yN,
    xP,
    yP,
    posScores,
    negScores,
  } = cfg;

  const { xTN, yTN, xFP, yFP } = splitNegativeTraceByClassification(xN, yN, threshold);
  const { xFN, yFN, xTP, yTP } = splitPositiveTraceByClassification(xP, yP, threshold);

  const metrics = computeClassificationMetrics(threshold, posScores, negScores);

  const { gainsVx, gainsVy, gainsHx, gainsHy, proportionAbove } =
    computeGainsHozVerLines(threshold, metrics, posScores, negScores);

  updateInputElements(ui, threshold, metrics, cfg, proportionAbove);
  updateIntervalInfo(metrics, cfg);
  cfg.currentThreshold = threshold;

  const distributionUpdates = [
    { name: "TN", x: xTN, y: yTN },
    { name: "FP", x: xFP, y: yFP },
    { name: "FN", x: xFN, y: yFN },
    { name: "TP", x: xTP, y: yTP },
  ];

  const gainsUpdates = [
    { name: "gainsVerticalProportionLine", x: gainsVx, y: gainsVy },
    { name: "gainsHorizontalRecallLine", x: gainsHx, y: gainsHy },
    { name: "gainsMarker", x: [proportionAbove], y: [metrics.TPR] },
  ];

  const plotWidth = Math.max(ui.distributionPlot.clientWidth, 1);

  return Promise.all([
    Plotly.update(
      "distribution-plot",
      {
        x: distributionUpdates.map((update) => update.x),
        y: distributionUpdates.map((update) => update.y),
      },
      createDistributionOverlays(threshold, metrics, cfg, plotWidth),
      distributionUpdates.map((update) => distributionTraceIndex.get(update.name)),
    ),
    Plotly.update(
      "gains-plot",
      {
        x: gainsUpdates.map((update) => update.x),
        y: gainsUpdates.map((update) => update.y),
      },
      createGainsOverlays(proportionAbove, metrics.TPR, cfg, {
        width: ui.gainsPlot.clientWidth,
        height: ui.gainsPlot.clientHeight,
      }),
      gainsUpdates.map((update) => gainsTraceIndex.get(update.name)),
    ),
  ]);
};

/**
 * @param {number} val - The value to clamp.
 * @param {number} min - Inclusive lower bound.
 * @param {number} max - Inclusive upper bound.
 * @returns {number} The clamped value within `[min, max]`.
 */
const clip = (val, min, max) => {
  if (val < min) {
    return min;
  }

  if (val > max) {
    return max;
  }
  return val;
};

/**
 * Creates threshold from recallPct and calls updatePlot.
 * posScores is sorted, so recall is proportion of posScores above the threshold.
 * @param {number} recallPct - desired recall as a percentage
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @param {SelectThresholdUI} ui - UI elements
 */
const updatePlotWRecall = (recallPct, cfg, ui) => {
  const { posScores } = cfg;

  const recallFrac = recallPct / 100;
  const clippedRecallFrac = clip(recallFrac, 0, 1);

  const idx = Math.floor(posScores.length - clippedRecallFrac * posScores.length);

  const threshold =
    idx === posScores.length ? Number(ui.thresholdSlider.max) : posScores[idx];

  updatePlot(threshold, cfg, ui);
};

/**
 * Select an input's existing value without hiding the currently applied setting.
 * @param {FocusEvent} e - Focus event.
 * @returns {void}
 */
const handleFocus = (e) => {
  e.target.select();
};

/**
 * Limit slider rendering to one update per animation frame.
 * @param {SelectThresholdCfg} cfg - Plot configuration/data.
 * @param {SelectThresholdUI} ui - UI elements.
 * @returns {() => void} Input handler for the threshold slider.
 */
const makeHandleSliderInput = (cfg, ui) => {
  let frame = 0;
  return () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      updatePlot(ui.thresholdSlider.valueAsNumber, cfg, ui);
    });
  };
};

/**
 * Apply a numeric field on Enter or change, with inline validation feedback.
 * Escape restores the last applied value.
 * @param {SelectThresholdCfg} cfg - Plot configuration/data.
 * @param {SelectThresholdUI} ui - UI elements.
 * @param {boolean} isRecall - Whether the field selects a target recall.
 * @returns {(e: Event | KeyboardEvent) => void} Numeric field event handler.
 */
const makeHandleNumberInput = (cfg, ui, isRecall) => {
  const input = isRecall ? ui.recallInput : ui.thresholdInput;
  return (e) => {
    if (e.type === "keydown") {
      if (e.key === "Escape") {
        input.value = input.dataset.committedValue;
        input.setAttribute("aria-invalid", "false");
        ui.inputStatus.textContent = "";
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
    }

    if (!Number.isFinite(input.valueAsNumber) || !input.checkValidity()) {
      input.setAttribute("aria-invalid", "true");
      let message = "Enter a recall between 0 and 100%.";
      if (!isRecall) {
        const minimum = Number(input.min).toFixed(cfg.dp);
        const maximum = Number(input.max).toFixed(cfg.dp);
        message = `Enter a threshold between ${minimum} and ${maximum}.`;
      }
      ui.inputStatus.textContent = message;
      return;
    }

    if (isRecall) {
      updatePlotWRecall(input.valueAsNumber, cfg, ui);
    } else {
      updatePlot(input.valueAsNumber, cfg, ui);
    }
  };
};

/**
 * Initialise and return the select-threshold plot configuration.
 * @returns {SelectThresholdCfg} - Plot config and data
 */
const initConfig = () => {
  const plotConfig = JSON.parse(document.querySelector("#plot-config").textContent);

  // We cannot pass in Infinity via JSON, so set it here
  plotConfig.gainsThresholds[0] = Infinity;
  plotConfig.gainsThresholds[plotConfig.gainsThresholds.length - 1] = -Infinity;

  plotConfig.distributionTraceIndex = toIndexMap(["TN", "FP", "FN", "TP"]);
  plotConfig.gainsTraceIndex = toIndexMap([
    "gainsUpperInterval",
    "gainsLowerInterval",
    "gainsVerticalProportionLine",
    "gainsHorizontalRecallLine",
    "gainsCurve",
    "gainsMarker",
  ]);

  plotConfig.scoreAxisRange = [
    plotConfig.minScore - SCORE_AXIS_PADDING_FRACTION * plotConfig.scoreRange,
    plotConfig.maxScore + SCORE_AXIS_PADDING_FRACTION * plotConfig.scoreRange,
  ];
  plotConfig.palette = readPalette();
  plotConfig.dp = 4;

  return plotConfig;
};

/**
 * Build the metrics table rows once and return their value cells by metric name.
 * @param {HTMLElement} tableBody - The table body to fill.
 * @param {string[]} names - Metric names in display order.
 * @returns {Map<string, HTMLElement>} Metric name to its value cell.
 */
const createMetricsRows = (tableBody, names) => {
  const values = new Map();
  for (const metricName of names) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = metricName;
    const valueCell = document.createElement("td");
    valueCell.textContent = "–";
    row.append(nameCell, valueCell);
    tableBody.append(row);
    values.set(metricName, valueCell);
  }
  return values;
};

/**
 * Resolve and return the UI elements.
 * @returns {SelectThresholdUI} - resolved UI elements
 */
const initUI = () => {
  const textIds = [
    "summary-reviewed",
    "summary-reviewed-share",
    "summary-found",
    "summary-recall",
  ];
  return {
    recallInput: document.querySelector("#recall-input"),
    thresholdInput: document.querySelector("#threshold-input"),
    thresholdSlider: document.querySelector("#threshold-slider"),
    inputStatus: document.querySelector("#input-status"),
    resetButton: document.querySelector("#threshold-reset"),
    distributionPlot: document.querySelector("#distribution-plot"),
    gainsPlot: document.querySelector("#gains-plot"),
    text: new Map(textIds.map((id) => [id, document.querySelector(`#${id}`)])),
    metricValues: createMetricsRows(document.querySelector("#threshold-metrics"), [
      "Accuracy",
      "Balanced accuracy",
      "Recall",
      "Precision",
      "Specificity",
      "False positive rate",
    ]),
    matrix: document.querySelector(".confusion-matrix"),
    cellCounts: [...document.querySelectorAll(".cell-count")],
  };
};

/**
 * Size both charts to their frames and refresh the overlays that depend on size.
 * @param {SelectThresholdCfg} cfg - Plot configuration/data.
 * @param {SelectThresholdUI} ui - UI elements.
 * @returns {Promise<HTMLElement[]>} The resized Plotly figures.
 */
const resizePlots = (cfg, ui) => {
  const { currentThreshold, posScores, negScores } = cfg;
  const metrics = computeClassificationMetrics(currentThreshold, posScores, negScores);
  const { proportionAbove } = computeGainsHozVerLines(
    currentThreshold,
    metrics,
    posScores,
    negScores,
  );
  const distributionSize = {
    width: ui.distributionPlot.clientWidth,
    height: ui.distributionPlot.clientHeight,
  };
  const gainsSize = {
    width: ui.gainsPlot.clientWidth,
    height: ui.gainsPlot.clientHeight,
  };

  return Promise.all([
    Plotly.relayout("distribution-plot", {
      ...distributionSize,
      ...createDistributionOverlays(
        currentThreshold,
        metrics,
        cfg,
        distributionSize.width,
      ),
    }),
    Plotly.relayout("gains-plot", {
      ...gainsSize,
      ...createGainsOverlays(proportionAbove, metrics.TPR, cfg, gainsSize),
    }),
  ]);
};

/**
 * Redraw the charts whenever their frames resize, so they follow a dragged window.
 * ResizeObserver runs after layout and before paint, so the redraw lands in the same frame.
 * A frame's size never depends on its chart, so redrawing cannot trigger another resize.
 * The confusion-matrix counts are refitted the same way when their cells change width.
 * @param {SelectThresholdCfg} cfg - Plot configuration/data.
 * @param {SelectThresholdUI} ui - UI elements.
 * @returns {void}
 */
const initResponsiveLayout = (cfg, ui) => {
  const observer = new ResizeObserver(() => {
    resizePlots(cfg, ui);
  });
  observer.observe(ui.distributionPlot);
  observer.observe(ui.gainsPlot);

  const countObserver = new ResizeObserver(() => {
    showCellCounts(ui);
  });
  countObserver.observe(ui.cellCounts[0]);
};

/**
 * Settle the moved panels into their new places when the layout switches.
 * The distributions panel stays put and only changes width, so it is left alone.
 * The outcomes and gains panels rise and fade in from partly visible, one after the other.
 * Only opacity and a small shift animate, which the browser runs alongside chart redraws.
 * Sliding panels across the page stutters instead, because the charts redraw every frame.
 * Skipped when the viewer prefers reduced motion.
 * @returns {void}
 */
const initLayoutAnimation = () => {
  const panels = [...document.querySelectorAll(".panel-outcomes, .panel-gains")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  matchMedia(STACKED_LAYOUT_QUERY).addEventListener("change", () => {
    if (reduceMotion.matches) return;
    for (const [index, panel] of panels.entries()) {
      for (const running of panel.getAnimations()) running.cancel();
      panel.animate(
        [
          {
            opacity: LAYOUT_FADE_FROM_OPACITY,
            transform: `translateY(${LAYOUT_FADE_SHIFT_PX}px)`,
          },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: LAYOUT_ANIMATION_MS,
          delay: index * LAYOUT_FADE_STAGGER_MS,
          easing: LAYOUT_ANIMATION_EASING,
          fill: "backwards",
        },
      );
    }
  });
};

/**
 * Attach all event handlers for the select-threshold widget.
 * @param {SelectThresholdCfg} cfg - Plot configuration/data
 * @param {SelectThresholdUI} ui - resolved UI elements
 * @returns {void}
 */
const initEventListeners = (cfg, ui) => {
  ui.thresholdSlider.addEventListener("input", makeHandleSliderInput(cfg, ui));

  const thresholdHandler = makeHandleNumberInput(cfg, ui, false);
  const recallHandler = makeHandleNumberInput(cfg, ui, true);
  ui.thresholdInput.addEventListener("keydown", thresholdHandler);
  ui.thresholdInput.addEventListener("change", thresholdHandler);
  ui.thresholdInput.addEventListener("focus", handleFocus);
  ui.recallInput.addEventListener("keydown", recallHandler);
  ui.recallInput.addEventListener("change", recallHandler);
  ui.recallInput.addEventListener("focus", handleFocus);
  ui.resetButton.addEventListener("click", () => {
    updatePlot(Number(ui.thresholdSlider.defaultValue), cfg, ui);
  });
};

/**
 * Show the key to the shaded recall interval, with its explanation behind the "i" button.
 * The explanation opens while the pointer is over the key.
 * A click or tap keeps it open until the button, Escape or the page outside is pressed.
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @returns {void}
 */
const initIntervalInfo = (cfg) => {
  if (!hasRecallInterval(cfg)) return;
  const key = document.querySelector("#interval-key");
  const button = document.querySelector("#interval-info-button");
  const popover = document.querySelector("#interval-info");
  key.hidden = false;
  document.querySelector("#interval-info-positives").textContent = formatFullCount(
    cfg.posScores.length,
  );

  let isPinned = false;
  let hideTimer = 0;
  const show = (isShown) => {
    clearTimeout(hideTimer);
    if (isShown === !popover.hidden) return;
    popover.hidden = !isShown;
    button.setAttribute("aria-expanded", String(isShown));
    if (!isShown) return;
    fillIntervalInfo(cfg);
    // Use the side with more room when the full explanation does not fit below.
    popover.classList.remove("is-above");
    popover.style.maxHeight = "";
    const box = popover.getBoundingClientRect();
    const roomAbove =
      key.closest(".card").getBoundingClientRect().top - INFO_VIEWPORT_GAP_PX;
    const roomBelow = innerHeight - box.top - INFO_VIEWPORT_GAP_PX;
    const isAbove = box.height > roomBelow && roomAbove > roomBelow;
    popover.classList.toggle("is-above", isAbove);
    let available = roomBelow;
    if (isAbove) {
      available = popover.getBoundingClientRect().bottom - INFO_VIEWPORT_GAP_PX;
    }
    popover.style.maxHeight = `${Math.max(0, Math.floor(available))}px`;
  };
  key.addEventListener("mouseenter", () => {
    show(true);
  });
  // A short delay lets the pointer cross the gap between the key and the explanation.
  key.addEventListener("mouseleave", () => {
    if (isPinned) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      show(false);
    }, INFO_HIDE_DELAY_MS);
  });
  button.addEventListener("click", () => {
    isPinned = !isPinned;
    show(isPinned);
  });
  document.addEventListener("click", (clickEvent) => {
    if (key.contains(clickEvent.target)) return;
    isPinned = false;
    show(false);
  });
  document.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key !== "Escape" || popover.hidden) return;
    isPinned = false;
    show(false);
    button.focus();
  });
};

const main = async () => {
  const loader = document.querySelector("#plot-loading");

  if (!("Plotly" in globalThis)) {
    document.querySelector("#cdn-fail").hidden = false;
    loader.hidden = true;
    return;
  }

  try {
    const cfg = initConfig();
    const ui = initUI();
    document.querySelector("#roc-auc-value").textContent = cfg.rocAuc.toFixed(4);
    document.querySelector("#average-precision-value").textContent =
      cfg.prAuc.toFixed(4);
    document.querySelector("#threshold-min").textContent = Number(
      ui.thresholdSlider.min,
    ).toFixed(cfg.dp);
    document.querySelector("#threshold-max").textContent = Number(
      ui.thresholdSlider.max,
    ).toFixed(cfg.dp);

    await Promise.all([createDistributionPlot(cfg), createGainsPlot(cfg)]);
    await updatePlot(ui.thresholdSlider.valueAsNumber, cfg, ui);
    initEventListeners(cfg, ui);
    initResponsiveLayout(cfg, ui);
    initLayoutAnimation();
    initIntervalInfo(cfg);
  } catch {
    const message = document.querySelector("#cdn-fail");
    message.textContent =
      "The plot could not be displayed. Try reloading or regenerating the HTML file.";
    message.hidden = false;
  } finally {
    loader.hidden = true;
  }
};

// eslint-disable-next-line n/no-top-level-await -- This script runs as a browser module.
await main();
