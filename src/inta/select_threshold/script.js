/* global Plotly */
// TODO: Check that the no js message is shown for all

// F4 uses beta = 4 in the F-beta formula.
const F4_BETA_SQUARED = 4 ** 2;

// Keep the density plots' ranges and threshold lines aligned.
const SCORE_AXIS_PADDING_FRACTION = 0.05;
const DENSITY_Y_MAX_FACTOR = 1.1;

// Place distribution labels 2.5% from each edge; hide them within a 4% segment.
const DISTRIBUTION_LABEL_INSET_FRACTION = 0.025;
const DISTRIBUTION_LABEL_HIDE_MARGIN_FRACTION = 0.04;

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
 * @typedef {object} SelectThresholdCfg
 * @property {Map<string, number>} traceToIndex - map from trace names to plotly data array indices
 * @property {number} minScore - dataset min score
 * @property {number} maxScore - dataset max score
 * @property {number} scoreRange - convenience: maxScore - minScore
 * @property {number} maxDistributionY - y-axis max for distribution plots
 * @property {number[]} xN - negative density: x
 * @property {number[]} yN - negative density: y
 * @property {number[]} xP - positive density: x
 * @property {number[]} yP - positive density: y
 * @property {number[]} posScores - positive-class scores sorted ascending
 * @property {number[]} negScores - negative-class scores sorted ascending
 * @property {number[]} xGains - gains curve x (proportion examined)
 * @property {number[]} yGains - gains curve y (recall)
 * @property {number[]} gainsThresholds - threshold per gains point
 * @property {number} rocAuc - ROC AUC of model
 * @property {number} prAuc - PR AUC of model
 * @property {number} dp - decimal places for UI/labels
 * @property {string} imageSavepath - savepath to save image of plot when plotly save button clicked
 */

/**
 * Select-threshold UI elements.
 * Resolved once in initUI().
 * @typedef {object} SelectThresholdUI
 * @property {HTMLInputElement} recallInput - input for recall percentage
 * @property {HTMLInputElement} thresholdInput - input for decision threshold
 * @property {HTMLInputElement} thresholdSlider - range slider for decision threshold
 * @property {HTMLElement} thresholdDisplay - element displaying the formatted threshold text
 * @property {HTMLElement} inputStatus - validation feedback
 * @property {HTMLButtonElement} resetButton - restore the initial threshold
 * @property {HTMLElement} plotDiv - responsive Plotly container
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
 * Visibility flags for distribution annotations.
 * @typedef {object} DistributionAnnotationVisibility
 * @property {boolean} distributionTNAnnotationVisible - show TN label
 * @property {boolean} distributionFNAnnotationVisible - show FN label
 * @property {boolean} distributionFPAnnotationVisible - show FP label
 * @property {boolean} distributionTPAnnotationVisible - show TP label
 */

/**
 * Preformatted values for the variable metrics table.
 * @typedef {object} VariableTableTraceData
 * @property {string[]} variableTableMetricNames - metric names
 * @property {string[]} variableTableMetrics - formatted metric values
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
 * Allocate enough space for the plots and table rows at each viewport size.
 * Domains use Plotly's normalized paper coordinates; tall layouts scroll vertically.
 * @param {number} width - Available plot width in pixels.
 * @returns {object} Plot height, margins, and panel domains.
 */
const getPlotPresentation = (width) => {
  if (width >= 1180) {
    return {
      height: 800,
      margin: { l: 72, r: 32, t: 48, b: 64 },
      domains: {
        negative: { x: [0, 0.42], y: [0.59, 1] },
        positive: { x: [0, 0.42], y: [0.02, 0.43] },
        confusion: { x: [0.54, 0.74], y: [0.61, 0.98] },
        gains: { x: [0.55, 1], y: [0.02, 0.41] },
        fixedMetrics: { x: [0.79, 1], y: [0.47, 0.6] },
        variableMetrics: { x: [0.79, 1], y: [0.66, 1] },
      },
    };
  }

  if (width >= 720) {
    return {
      height: 1050,
      margin: { l: 66, r: 24, t: 48, b: 64 },
      domains: {
        negative: { x: [0, 0.43], y: [0.74, 1] },
        positive: { x: [0, 0.43], y: [0.37, 0.63] },
        confusion: { x: [0.59, 0.94], y: [0.74, 1] },
        gains: { x: [0.57, 1], y: [0.37, 0.63] },
        fixedMetrics: { x: [0.57, 1], y: [0.12, 0.27] },
        variableMetrics: { x: [0, 0.49], y: [0.015, 0.27] },
      },
    };
  }

  return {
    height: 1900,
    margin: { l: 58, r: 20, t: 48, b: 40 },
    domains: {
      negative: { x: [0, 1], y: [0.86, 1] },
      positive: { x: [0, 1], y: [0.66, 0.8] },
      confusion: { x: [0.06, 0.94], y: [0.45, 0.59] },
      gains: { x: [0, 1], y: [0.25, 0.39] },
      fixedMetrics: { x: [0, 1], y: [0, 0.052] },
      variableMetrics: { x: [0, 1], y: [0.07, 0.21] },
    },
  };
};

/**
 * Anchor panel headings to their axes so they move with the responsive layout.
 * @returns {object[]} Plotly heading annotations.
 */
const createPanelTitles = () => {
  return [
    { text: "<b>Actual negatives</b>", xref: "x domain", yref: "y domain" },
    { text: "<b>Actual positives</b>", xref: "x3 domain", yref: "y3 domain" },
    { text: "<b>Classification outcomes</b>", xref: "x2 domain", yref: "y2 domain" },
    { text: "<b>Cumulative gain</b>", xref: "x4 domain", yref: "y4 domain" },
  ].map((heading) => {
    return {
      ...heading,
      x: 0,
      y: 1.09,
      xanchor: "left",
      yanchor: "bottom",
      showarrow: false,
      font: { size: 13, color: "#243447" },
    };
  });
};

/**
 * Create the initial select-threshold Plotly figure with empty/updateable traces and layout.
 * We will fill the data with `updatePlot()` calls.
 * @param {SelectThresholdCfg} cfg - Plot config data
 * @returns {Promise<HTMLElement>} The initialized Plotly figure.
 */
const createSelectThresholdPlot = (cfg) => {
  const {
    traceToIndex,
    minScore,
    maxScore,
    scoreRange,
    maxDistributionY,
    xGains,
    yGains,
    gainsThresholds,
    rocAuc,
    prAuc,
    dp,
    imageSavepath,
  } = cfg;

  const { domains, height, margin } = getPlotPresentation(
    document.querySelector("#plot-div").clientWidth,
  );

  const TNDistribution = {
    x: [],
    y: [],
    mode: "lines",
    fill: "tozeroy",
    line: { color: "salmon" },
    name: "TN",
    legendgroup: "Negative",
    xaxis: "x",
    yaxis: "y",
    hoverinfo: "skip",
  };

  const FPDistribution = {
    x: [],
    y: [],
    mode: "lines",
    fill: "tozeroy",
    line: { color: "pink" },
    name: "FP",
    legendgroup: "Negative",
    xaxis: "x",
    yaxis: "y",
    hoverinfo: "skip",
  };

  const FNDistribution = {
    x: [],
    y: [],
    mode: "lines",
    fill: "tozeroy",
    line: { color: "green" },
    name: "FN",
    legendgroup: "Positive",
    xaxis: "x3",
    yaxis: "y3",
    hoverinfo: "skip",
  };

  const TPDistribution = {
    x: [],
    y: [],
    mode: "lines",
    fill: "tozeroy",
    line: { color: "lightgreen" },
    name: "TP",
    legendgroup: "Positive",
    xaxis: "x3",
    yaxis: "y3",
    hoverinfo: "skip",
  };

  const negDistributionThresholdLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { dash: "dash", color: "#344c68", width: 1.5 },
    showlegend: false,
    xaxis: "x",
    yaxis: "y",
    hoverinfo: "skip",
  };

  const posDistributionThresholdLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { dash: "dash", color: "#344c68", width: 1.5 },
    showlegend: false,
    xaxis: "x3",
    yaxis: "y3",
    hoverinfo: "skip",
  };

  const confusionZ = [
    [0, 1],
    [2, 3],
  ];
  const confusionColorscale = [
    [0, "salmon"],
    [0.25, "salmon"],
    [0.25, "pink"],
    [0.5, "pink"],
    [0.5, "green"],
    [0.75, "green"],
    [0.75, "lightgreen"],
    [1, "lightgreen"],
  ];
  const confusionMatrix = {
    z: confusionZ,
    x: [0, 1], // Predicted label
    y: [0, 1], // True label
    type: "heatmap",
    colorscale: confusionColorscale,
    showscale: false,
    xaxis: "x2",
    yaxis: "y2",
    hoverinfo: "skip",
  };

  const fixedMetricsTableHeader = ["Model metric", "Value"];
  const fixedMetricsTableCols = [
    ["ROC AUC", "Average precision"],
    [rocAuc.toFixed(dp), prAuc.toFixed(dp)],
  ];
  const fixedMetricsTable = {
    type: "table",
    header: {
      values: fixedMetricsTableHeader,
      fill: { color: "#edf2f8" },
      line: { color: "#dfe5ed", width: 1 },
      align: ["left", "right"],
      font: { size: 12, color: "#344c68" },
      height: 28,
    },
    cells: {
      values: fixedMetricsTableCols,
      fill: { color: "white" },
      line: { color: "#e8edf3", width: 1 },
      align: ["left", "right"],
      font: { size: 12, color: "#243447" },
      height: 28,
    },
    columnwidth: [1.8, 1],
    domain: domains.fixedMetrics,
  };

  const variableMetricsTableHeader = ["Threshold metric", "Value"];
  const variableMetricsTableCols = [
    ["Accuracy", "Balanced Accuracy", "Recall", "Precision", "FPR", "F4"],
    ["--", "--", "--", "--", "--", "--"],
  ];
  const variableMetricsTable = {
    type: "table",
    header: {
      values: variableMetricsTableHeader,
      fill: { color: "#edf2f8" },
      line: { color: "#dfe5ed", width: 1 },
      align: ["left", "right"],
      font: { size: 12, color: "#344c68" },
      height: 28,
    },
    cells: {
      values: variableMetricsTableCols,
      fill: { color: "white" },
      line: { color: "#e8edf3", width: 1 },
      align: ["left", "right"],
      font: { size: 12, color: "#243447" },
      height: 28,
    },
    columnwidth: [1.8, 1],
    domain: domains.variableMetrics,
  };

  const gainsCurve = {
    x: xGains,
    y: yGains,
    mode: "lines",
    name: "",
    line: { width: 2.5, color: "#3479b8", simplify: true },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    customdata: gainsThresholds,
    // Plotly replaces %{...} placeholders when rendering hover text.
    hovertemplate: `Items reviewed: %{x:.1%}
      <br>Recall: %{y:.1%}
      <br>Threshold: %{customdata:.4f}<extra></extra>`,
    hoverlabel: {
      bgcolor: "white",
      bordercolor: "#3479b8",
      font: { color: "black" },
    },
    legendgroup: "",
  };

  const gainsVerticalProportionLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { color: "#8293a7", width: 1, dash: "dot" },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    name: "",
  };

  const gainsHorizontalRecallLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { color: "#8293a7", width: 1, dash: "dot" },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    name: "",
  };

  const confusionMatrixOutline = [
    {
      type: "rect",
      xref: "x2",
      yref: "y2",
      x0: -0.5,
      y0: -0.5,
      x1: 1.5,
      y1: 1.5,
      line: { color: "white", width: 2 },
    },
    {
      type: "line",
      xref: "x2",
      yref: "y2",
      x0: -0.5,
      y0: 0.5,
      x1: 1.5,
      y1: 0.5,
      line: { color: "white", width: 2 },
    },
    {
      type: "line",
      xref: "x2",
      yref: "y2",
      x0: 0.5,
      y0: -0.5,
      x1: 0.5,
      y1: 1.5,
      line: { color: "white", width: 2 },
    },
  ];

  const data = [];

  // Top-left negative distribution
  data[traceToIndex.get("TNDistribution")] = TNDistribution;
  data[traceToIndex.get("FPDistribution")] = FPDistribution;
  data[traceToIndex.get("negDistributionThresholdLine")] = negDistributionThresholdLine;

  // Bottom-left positive distribution
  data[traceToIndex.get("FNDistribution")] = FNDistribution;
  data[traceToIndex.get("TPDistribution")] = TPDistribution;
  data[traceToIndex.get("PosDistributionThresholdLine")] = posDistributionThresholdLine;

  // Top-right confusion matrix
  data[traceToIndex.get("ConfusionMatrix")] = confusionMatrix;

  // Top-right tables
  data[traceToIndex.get("fixedMetricsTable")] = fixedMetricsTable;
  data[traceToIndex.get("variableMetricsTable")] = variableMetricsTable;

  // Bottom-right gains line + threshold lines
  data[traceToIndex.get("gainsCurve")] = gainsCurve;
  data[traceToIndex.get("gainsVerticalProportionLine")] = gainsVerticalProportionLine;
  data[traceToIndex.get("gainsHorizontalRecallLine")] = gainsHorizontalRecallLine;

  const densityAxis = {
    range: [
      minScore - SCORE_AXIS_PADDING_FRACTION * scoreRange,
      maxScore + SCORE_AXIS_PADDING_FRACTION * scoreRange,
    ],
    zeroline: false,
    gridcolor: "#edf1f5",
    automargin: true,
    fixedrange: true,
  };
  const densityYAxis = {
    title: { text: "Density", standoff: 10 },
    range: [0, maxDistributionY * DENSITY_Y_MAX_FACTOR],
    gridcolor: "#edf1f5",
    zeroline: false,
    automargin: true,
    fixedrange: true,
  };
  const layout = {
    height,
    margin,
    autosize: true,
    font: {
      family: "system-ui, -apple-system, Segoe UI, sans-serif",
      size: 12,
      color: "#344c68",
    },
    showlegend: false,
    xaxis: { ...densityAxis, domain: domains.negative.x, anchor: "y" },
    yaxis: { ...densityYAxis, domain: domains.negative.y, anchor: "x" },
    xaxis2: {
      domain: domains.confusion.x,
      anchor: "y2",
      title: { text: "Predicted class", standoff: 8 },
      range: [-0.5, 1.5],
      tickvals: [0, 1],
      ticktext: ["Negative", "Positive"],
      showgrid: false,
      zeroline: false,
      fixedrange: true,
    },
    yaxis2: {
      domain: domains.confusion.y,
      anchor: "x2",
      title: { text: "Actual class", standoff: 8 },
      range: [1.5, -0.5],
      tickvals: [0, 1],
      ticktext: ["Negative", "Positive"],
      showgrid: false,
      zeroline: false,
      fixedrange: true,
    },
    xaxis3: {
      ...densityAxis,
      domain: domains.positive.x,
      anchor: "y3",
      title: { text: "Model score", standoff: 10 },
    },
    yaxis3: { ...densityYAxis, domain: domains.positive.y, anchor: "x3" },
    xaxis4: {
      domain: domains.gains.x,
      anchor: "y4",
      title: { text: "Items reviewed", standoff: 10 },
      range: [-0.02, 1.02],
      tickformat: ".0%",
      gridcolor: "#edf1f5",
      zeroline: false,
      fixedrange: true,
    },
    yaxis4: {
      domain: domains.gains.y,
      anchor: "x4",
      title: { text: "Recall", standoff: 10 },
      range: [-0.02, 1.02],
      tickformat: ".0%",
      gridcolor: "#edf1f5",
      zeroline: false,
      fixedrange: true,
    },
    annotations: [],
    shapes: confusionMatrixOutline,
    dragmode: false,
  };

  const plotlySettings = {
    responsive: true,
    scrollZoom: false,
    modeBarButtons: [["toImage"]],
    displaylogo: false,
    displayModeBar: true,
    toImageButtonOptions: {
      format: "png",
      filename: imageSavepath,
      // eslint-disable-next-line unicorn/no-null -- Plotly uses null for the current graph size.
      height: null,
      // eslint-disable-next-line unicorn/no-null -- Plotly uses null for the current graph size.
      width: null,
      scale: 3,
    },
  };

  return Plotly.newPlot("plot-div", data, layout, plotlySettings);
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
 * Update UI inputs/displays to reflect the current threshold.
 * @param {SelectThresholdUI} ui - UI elements
 * @param {number} threshold - current decision threshold
 * @param {ClassificationMetrics} metrics - computed metrics at threshold
 * @param {number} dp - decimal places to display
 * @returns {void}
 */
const updateInputElements = (ui, threshold, metrics, dp) => {
  ui.recallInput.value = (100 * metrics.TPR).toFixed(2);
  // Keep rounding from placing an endpoint just outside the input's valid range.
  const roundedThreshold = Number(threshold.toFixed(dp));
  const boundedThreshold = Math.min(
    Number(ui.thresholdInput.max),
    Math.max(Number(ui.thresholdInput.min), roundedThreshold),
  );
  ui.thresholdInput.value = String(boundedThreshold);
  ui.thresholdSlider.value = String(threshold);
  ui.thresholdDisplay.textContent = threshold.toFixed(dp);

  ui.recallInput.setAttribute("aria-invalid", "false");
  ui.thresholdInput.setAttribute("aria-invalid", "false");
  ui.inputStatus.textContent = "";

  ui.recallInput.dataset.committedValue = ui.recallInput.value;
  ui.thresholdInput.dataset.committedValue = ui.thresholdInput.value;
};

/**
 * Determine visibility of distribution annotations based on threshold.
 * @param {number} threshold - decision threshold
 * @param {number} minScore - minimum score in dataset
 * @param {number} scoreRange - maxScore - minScore
 * @returns {DistributionAnnotationVisibility} - visibility flags
 */
const distributionsAnnotationVisibility = (threshold, minScore, scoreRange) => {
  if (
    threshold >
    minScore + (1 - DISTRIBUTION_LABEL_HIDE_MARGIN_FRACTION) * scoreRange
  ) {
    return {
      distributionTNAnnotationVisible: true,
      distributionFNAnnotationVisible: true,
      distributionFPAnnotationVisible: false,
      distributionTPAnnotationVisible: false,
    };
  }

  if (threshold < minScore + DISTRIBUTION_LABEL_HIDE_MARGIN_FRACTION * scoreRange) {
    return {
      distributionTNAnnotationVisible: false,
      distributionFNAnnotationVisible: false,
      distributionFPAnnotationVisible: true,
      distributionTPAnnotationVisible: true,
    };
  }

  return {
    distributionTNAnnotationVisible: true,
    distributionFNAnnotationVisible: true,
    distributionFPAnnotationVisible: true,
    distributionTPAnnotationVisible: true,
  };
};

/**
 * Build variable-metrics table values (labels and formatted percentages).
 * @param {ClassificationMetrics} metrics - computed metrics at threshold
 * @param {number} dp - decimal places for formatting
 * @returns {VariableTableTraceData} - names and formatted values
 */
const computeVariableTableTraceData = (metrics, dp) => {
  const fracToPercent = (v) => `${(100 * v).toFixed(dp)}%`;

  const tableRows = [
    { mName: "Accuracy", val: metrics.accuracy },
    { mName: "Balanced Accuracy", val: metrics.balancedAccuracy },
    { mName: "Recall", val: metrics.TPR },
    { mName: "Precision", val: metrics.precision },
    { mName: "Specificity", val: 1 - metrics.FPR },
    { mName: "FPR", val: metrics.FPR },
    { mName: "F4", val: metrics.F4 },
  ];

  return {
    variableTableMetricNames: tableRows.map(({ mName }) => mName),
    variableTableMetrics: tableRows.map(({ val }) => fracToPercent(val)),
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
 * Recompute traces, annotations, tables, and UI and apply to figure.
 * @param {number} threshold - decision threshold
 * @param {SelectThresholdCfg} cfg - plot config and data
 * @param {SelectThresholdUI} ui - UI elements
 * @returns {Promise<HTMLElement>} The updated Plotly figure.
 */
const updatePlot = (threshold, cfg, ui) => {
  const {
    traceToIndex,
    xN,
    yN,
    xP,
    yP,
    posScores,
    negScores,
    minScore,
    scoreRange,
    maxDistributionY,
    dp,
  } = cfg;

  const { xTN, yTN, xFP, yFP } = splitNegativeTraceByClassification(xN, yN, threshold);

  const { xFN, yFN, xTP, yTP } = splitPositiveTraceByClassification(xP, yP, threshold);

  // Vertical dashed lines on distributions
  const lineNegX = [threshold, threshold];
  const lineNegY = [0, maxDistributionY * DENSITY_Y_MAX_FACTOR];
  const linePosX = [threshold, threshold];
  const linePosY = [0, maxDistributionY * DENSITY_Y_MAX_FACTOR];

  const metrics = computeClassificationMetrics(threshold, posScores, negScores);

  const { variableTableMetricNames, variableTableMetrics } =
    computeVariableTableTraceData(metrics, dp);

  const {
    distributionTNAnnotationVisible,
    distributionFPAnnotationVisible,
    distributionFNAnnotationVisible,
    distributionTPAnnotationVisible,
  } = distributionsAnnotationVisibility(threshold, minScore, scoreRange);

  const { gainsVx, gainsVy, gainsHx, gainsHy, proportionAbove } =
    computeGainsHozVerLines(threshold, metrics, posScores, negScores);

  const FPConfusionAnnotation = {
    text: `FP<br><b>${metrics.FP.toLocaleString()}</b>`,
    x: 1,
    y: 0,
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const TNConfusionAnnotation = {
    text: `TN<br><b>${metrics.TN.toLocaleString()}</b>`,
    x: 0,
    y: 0,
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const TPConfusionAnnotation = {
    text: `TP<br><b>${metrics.TP.toLocaleString()}</b>`,
    x: 1,
    y: 1,
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const FNConfusionAnnotation = {
    text: `FN<br><b>${metrics.FN.toLocaleString()}</b>`,
    x: 0,
    y: 1,
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const TNDistributionAnnotation = {
    text: "TN",
    xref: "x",
    y: 0.97,
    yref: "y domain",
    x: minScore + DISTRIBUTION_LABEL_INSET_FRACTION * scoreRange,
    visible: distributionTNAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const FPDistributionAnnotation = {
    text: "FP",
    xref: "x",
    y: 0.97,
    yref: "y domain",
    x: minScore + (1 - DISTRIBUTION_LABEL_INSET_FRACTION) * scoreRange,
    visible: distributionFPAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const FNDistributionAnnotation = {
    text: "FN",
    xref: "x3",
    y: 0.97,
    yref: "y3 domain",
    x: minScore + DISTRIBUTION_LABEL_INSET_FRACTION * scoreRange,
    visible: distributionFNAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const TPDistributionAnnotation = {
    text: "TP",
    xref: "x3",
    y: 0.97,
    yref: "y3 domain",
    x: minScore + (1 - DISTRIBUTION_LABEL_INSET_FRACTION) * scoreRange,
    visible: distributionTPAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const gainsSelectionAnnotation = {
    text: `Review ${(100 * proportionAbove).toFixed(1)}% · Recall ${(
      100 * metrics.TPR
    ).toFixed(1)}%`,
    x: proportionAbove,
    y: metrics.TPR,
    xref: "x4",
    yref: "y4",
    xanchor: proportionAbove > 0.5 ? "right" : "left",
    yanchor: metrics.TPR > 0.8 ? "top" : "bottom",
    xshift: proportionAbove > 0.5 ? -8 : 8,
    yshift: metrics.TPR > 0.8 ? -8 : 8,
    font: { size: 11, color: "#344c68" },
    showarrow: false,
    bgcolor: "white",
    bordercolor: "#dfe5ed",
    borderwidth: 1,
    borderpad: 5,
  };

  const annotationUpdates = [
    ...createPanelTitles(),
    FPConfusionAnnotation,
    TNConfusionAnnotation,
    TPConfusionAnnotation,
    FNConfusionAnnotation,
    TNDistributionAnnotation,
    FPDistributionAnnotation,
    FNDistributionAnnotation,
    TPDistributionAnnotation,
    gainsSelectionAnnotation,
  ];

  const traceXYUpdates = [
    { name: "TNDistribution", x: xTN, y: yTN },
    { name: "FPDistribution", x: xFP, y: yFP },
    { name: "negDistributionThresholdLine", x: lineNegX, y: lineNegY },
    { name: "FNDistribution", x: xFN, y: yFN },
    { name: "TPDistribution", x: xTP, y: yTP },
    { name: "PosDistributionThresholdLine", x: linePosX, y: linePosY },
    { name: "gainsVerticalProportionLine", x: gainsVx, y: gainsVy },
    { name: "gainsHorizontalRecallLine", x: gainsHx, y: gainsHy },
    {
      name: "variableMetricsTable",
      cells: [variableTableMetricNames, variableTableMetrics],
    },
  ];

  updateInputElements(ui, threshold, metrics, dp);

  const x = traceXYUpdates.map((update) => update.x);
  const y = traceXYUpdates.map((update) => update.y);

  // Undefined entries leave unrelated trace properties unchanged in Plotly.update.
  return Plotly.update(
    "plot-div",
    {
      x,
      y,
      "cells.values": traceXYUpdates.map((update) => update.cells),
    },
    { annotations: annotationUpdates },
    traceXYUpdates.map((update) => traceToIndex.get(update.name)),
  );
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
 * Reposition panels when their container changes width, including browser resizing.
 * Only width changes trigger rendering, so changing plot height cannot create a loop.
 * @param {SelectThresholdCfg} cfg - Plot configuration/data.
 * @param {SelectThresholdUI} ui - UI elements.
 * @returns {void}
 */
const initResponsiveLayout = (cfg, ui) => {
  let previousWidth = Math.round(ui.plotDiv.clientWidth);
  let frame = 0;
  const observer = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width === previousWidth || width === 0) return;
    previousWidth = width;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const { domains, height, margin } = getPlotPresentation(width);
      Plotly.update(
        "plot-div",
        { domain: [domains.fixedMetrics, domains.variableMetrics] },
        {
          height,
          margin,
          "xaxis.domain": domains.negative.x,
          "yaxis.domain": domains.negative.y,
          "xaxis2.domain": domains.confusion.x,
          "yaxis2.domain": domains.confusion.y,
          "xaxis3.domain": domains.positive.x,
          "yaxis3.domain": domains.positive.y,
          "xaxis4.domain": domains.gains.x,
          "yaxis4.domain": domains.gains.y,
        },
        [
          cfg.traceToIndex.get("fixedMetricsTable"),
          cfg.traceToIndex.get("variableMetricsTable"),
        ],
      );
    });
  });
  observer.observe(ui.plotDiv);
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

  const traceOrder = [
    "TNDistribution",
    "FPDistribution",
    "negDistributionThresholdLine",
    "FNDistribution",
    "TPDistribution",
    "PosDistributionThresholdLine",
    "ConfusionMatrix",
    "fixedMetricsTable",
    "variableMetricsTable",
    "gainsCurve",
    "gainsVerticalProportionLine",
    "gainsHorizontalRecallLine",
  ];
  plotConfig.traceToIndex = new Map(
    traceOrder.map((traceName, traceIndex) => [traceName, traceIndex]),
  );

  plotConfig.dp = 4;

  return plotConfig;
};

/**
 * Resolve and return the UI elements.
 * @returns {SelectThresholdUI} - resolved UI elements
 */
const initUI = () => {
  return {
    recallInput: document.querySelector("#recall-input"),
    thresholdInput: document.querySelector("#threshold-input"),
    thresholdSlider: document.querySelector("#threshold-slider"),
    thresholdDisplay: document.querySelector("#threshold-value"),
    inputStatus: document.querySelector("#input-status"),
    resetButton: document.querySelector("#threshold-reset"),
    plotDiv: document.querySelector("#plot-div"),
  };
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
    document.querySelector("#threshold-min").textContent = Number(
      ui.thresholdSlider.min,
    ).toFixed(cfg.dp);
    document.querySelector("#threshold-max").textContent = Number(
      ui.thresholdSlider.max,
    ).toFixed(cfg.dp);

    await createSelectThresholdPlot(cfg);
    await updatePlot(ui.thresholdSlider.valueAsNumber, cfg, ui);
    initEventListeners(cfg, ui);
    initResponsiveLayout(cfg, ui);
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
