/**
 * Binary search to find smallest array index i s.t. threshold <= arr[i].
 * If all elements in arr are < threshold, returns arr.length.
 * @function findSplitIndex
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
 * Computes common binary classification metrics at a given decision threshold.
 *
 * Prediction rule: a score is predicted **positive** if `score >= threshold`,
 * otherwise **negative**. Arrays are expected to be **sorted ascending**.
 * @function computeClassificationMetrics
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
    F4 = (17 * precision * TPR) / (16 * precision + TPR);
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

// /**
//  * Creates the initial select threshold plot with mostly empty traces. The empty traces
//  * should be filled with `updatePlot()` after creation.
//  * @function createSelectThresholdPlot
//  * @param {Map<string, number>} traceToIndex - Map from trace names to plotly data array indices.
//  * @param {number} minScore - Minimum predicted score in dataset.
//  * @param {number} maxScore - Maximum predicted score in dataset.
//  * @param {number} maxDistributionY - Maximum Y value for distribution traces.
//  * @param {number[]} xGains - X values for gains curve.
//  * @param {number[]} yGains - Y values for gains curve.
//  * @param {number[]} gainsThresholds - Thresholds corresponding to gains curve points.
//  * @param {number} rocAuc - ROC AUC value to display in fixed metrics table.
//  * @param {number} prAuc - PR AUC value to display in fixed metrics table.
//  * @param {number} dp - Number of decimal places for metric display.
//  * @returns {void}
//  */
// const createSelectThresholdPlot = (
//   traceToIndex,
//   minScore,
//   maxScore,
//   maxDistributionY,
//   xGains,
//   yGains,
//   gainsThresholds,
//   rocAuc,
//   prAuc,
//   dp,
// ) => {

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
  } = cfg;

  // Create initial traces; we’ll fill them on update
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
    line: { dash: "dash", color: "#20313e" },
    showlegend: false,
    xaxis: "x",
    yaxis: "y",
    hoverinfo: "skip",
  };

  const posDistributionThresholdLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { dash: "dash", color: "#20313e" },
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
    [0, "pink"],
    [0.25, "pink"],
    [0.25, "salmon"],
    [0.5, "salmon"],
    [0.5, "lightgreen"],
    [0.75, "lightgreen"],
    [0.75, "green"],
    [1.0, "green"],
  ];
  const confusionMatrix = {
    z: confusionZ,
    x: ["0", "1"], // Predicted label
    y: ["0", "1"], // True label
    type: "heatmap",
    colorscale: confusionColorscale,
    showscale: false,
    xaxis: "x2",
    yaxis: "y2",
    hoverinfo: "skip",
  };

  const fixedMetricsTableHeader = ["Invariant Metric", "Value"];
  const fixedMetricsTableCols = [
    ["ROC AUC", "PR AUC"],
    [rocAuc.toFixed(dp), prAuc.toFixed(dp)],
  ];
  const fixedMetricsTable = {
    type: "table",
    header: {
      values: fixedMetricsTableHeader,
      fill: { color: "lightgrey" },
      align: "center",
    },
    cells: {
      values: fixedMetricsTableCols,
      fill: { color: "white" },
      align: "center",
    },
    domain: {
      x: [0.78, 1.0],
      y: [0.475, 0.675],
    },
  };

  const variableMetricsTableHeader = ["Metric", "Value"];
  const variableMetricsTableCols = [
    ["Accuracy", "Balanced Accuracy", "Recall", "Precision", "FPR", "F4"],
    ["--", "--", "--", "--", "--", "--"],
  ];
  const variableMetricsTable = {
    type: "table",
    header: {
      values: variableMetricsTableHeader,
      fill: { color: "lightgrey" },
      align: "center",
    },
    cells: {
      values: variableMetricsTableCols,
      fill: { color: "white" },
      align: "center",
    },
    domain: {
      x: [0.78, 1.0],
      y: [0.68, 1.0],
    },
  };

  const gainsCurve = {
    x: xGains,
    y: yGains,
    mode: "lines",
    name: "",
    line: { width: 3, color: "#20C5FF", simplify: true },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    customdata: gainsThresholds,
    hovertemplate: `Proportion of Papers Examined: %{x}
      <br>Proportion of Positives Found: %{y:.4f}
      <br>Decision Threshold: %{customdata:.4f}`,
    hoverlabel: {
      bgcolor: "white",
      bordercolor: "#20C5FF",
      font: { color: "black" },
    },
    legendgroup: "",
  };

  const gainsVerticalProportionLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { color: "grey" },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    name: "",
  };

  const gainsHorizontalRecallLine = {
    x: [],
    y: [],
    mode: "lines",
    line: { color: "grey" },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    name: "",
  };

  const data = [];

  // TODO: There must be some sort of map way to not have to write this all out

  // Top-left negative distribution
  data[traceToIndex.get("TNDistribution")] = TNDistribution;
  data[traceToIndex.get("FPDistribution")] = FPDistribution;
  data[traceToIndex.get("negDistributionThresholdLine")] =
    negDistributionThresholdLine;

  // Bottom-left positive distribution
  data[traceToIndex.get("FNDistribution")] = FNDistribution;
  data[traceToIndex.get("TPDistribution")] = TPDistribution;
  data[traceToIndex.get("PosDistributionThresholdLine")] =
    posDistributionThresholdLine;

  // Top-right confusion matrix
  data[traceToIndex.get("ConfusionMatrix")] = confusionMatrix;

  // Top-right tables
  data[traceToIndex.get("fixedMetricsTable")] = fixedMetricsTable;
  data[traceToIndex.get("variableMetricsTable")] = variableMetricsTable;

  // Bottom-right gains line + threshold lines
  data[traceToIndex.get("gainsCurve")] = gainsCurve;
  data[traceToIndex.get("gainsVerticalProportionLine")] =
    gainsVerticalProportionLine;
  data[traceToIndex.get("gainsHorizontalRecallLine")] =
    gainsHorizontalRecallLine;

  //  Row=1 Col=1 => negative distribution   (xaxis='x',   yaxis='y')
  //  Row=1 Col=2 => confusion matrix + table(xaxis='x2',  yaxis='y2')
  //  Row=2 Col=1 => positive distribution   (xaxis='x3',  yaxis='y3')
  //  Row=2 Col=2 => gains plot              (xaxis='x4',  yaxis='y4')
  const layout = {
    margin: {
      b: 40,
      t: 20,
    },
    grid: {
      rows: 2,
      columns: 2,
      pattern: "independent", // each cell has its own axes
      roworder: "top to bottom",
    },
    // Domain definitions for each subplot (optional, but shown for clarity)
    xaxis: {
      domain: [0.0, 0.45], // top-left
      anchor: "y",
      // autorange: false,
      range: [minScore - 0.05 * scoreRange, maxScore + 0.05 * scoreRange],
      zeroline: false,
    },
    yaxis: {
      domain: [0.55, 1.0], // top-left
      anchor: "x",
      title: { text: "Actual Negatives" },
      range: [0, maxDistributionY * 1.1],
      // zeroline: false,
    },
    xaxis2: {
      domain: [0.55, 0.775], // top-right (heatmap only)
      anchor: "y2",
      showgrid: false,
      zeroline: false,
      showspikes: false,
      showticklabels: false,
      ticks: "",
    },
    yaxis2: {
      domain: [0.55, 1.0], // top-right
      anchor: "x2",
      showgrid: false,
      zeroline: false,
      showspikes: false,
      showticklabels: false,
      ticks: "",
    },
    xaxis3: {
      domain: [0.0, 0.45], // bottom-left
      anchor: "y3",
      title: "Predicted Probability",
      // autorange: false,
      range: [minScore - 0.05 * scoreRange, maxScore + 0.05 * scoreRange],
      zeroline: false,
    },
    yaxis3: {
      domain: [0.0, 0.45],
      anchor: "x3",
      title: { text: "Actual Positives" },
      range: [0, maxDistributionY * 1.1],
    },
    xaxis4: {
      domain: [0.55, 1.0], // bottom-right
      anchor: "y4",
      title: { text: "Proportion of Papers Examined" }, //TODO: why isn't this showing up?
      range: [-0.02, 1.02],
    },
    yaxis4: {
      domain: [0.0, 0.45],
      anchor: "x4",
      title: { text: "Recall" },
      range: [-0.02, 1.02],
    },
    annotations: [],
    shapes: [
      // The confusion matrix boundary lines
      {
        type: "rect",
        xref: "x2",
        yref: "y2",
        x0: -0.5,
        y0: -0.5,
        x1: 1.5,
        y1: 1.5,
        line: { color: "black", width: 2 },
      },
      {
        type: "line",
        xref: "x2",
        yref: "y2",
        x0: -0.5,
        y0: 0.5,
        x1: 1.5,
        y1: 0.5,
        line: { color: "black", width: 1.5 },
      },
      {
        type: "line",
        xref: "x2",
        yref: "y2",
        x0: 0.5,
        y0: -0.5,
        x1: 0.5,
        y1: 1.5,
        line: { color: "black", width: 1.5 },
      },
    ],
    dragmode: false,
  };

  const config = {
    responsive: true,
    scrollZoom: false,
    modeBarButtons: [["toImage"]],
    displaylogo: false,
    displayModeBar: "always",
    toImageButtonOptions: {
      format: "png",
      filename: "eppi-select-threshold",
      height: 720,
      width: 1480,
      scale: 3,
    },
  };

  Plotly.newPlot("plotDiv", data, layout, config);
};

const splitNegativeTraceByClassification = (xN, yN, threshold) => {
  const idxN = findSplitIndex(xN, threshold);

  if (idxN > 0 && idxN < xN.length) {
    // TODO:  write in comments that idxN should be the first index where xN[idxN] >= threshold

    const xNDiff = xN[idxN] - xN[idxN - 1];
    const yNDiff = yN[idxN] - yN[idxN - 1];
    const yInterpolated = yN[idxN] + ((threshold - xN[idxN]) * yNDiff) / xNDiff;

    return {
      xTN: [...xN.slice(0, idxN), threshold],
      yTN: [...yN.slice(0, idxN), yInterpolated],
      xFP: [threshold, ...xN.slice(idxN)],
      yFP: [yInterpolated, ...yN.slice(idxN)],
    };
  } else if (idxN === xN.length) {
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
  } else if (idxP === xP.length) {
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

const updateInputElements = (ui, threshold, metrics, dp) => {
  ui.recallInput.value = (100 * metrics.TPR).toFixed(dp);
  ui.thresholdInput.value = threshold.toFixed(dp);
  ui.thresholdSlider.value = threshold.toFixed(dp);
  ui.thresholdDisplay.textContent = threshold.toFixed(dp);
};

const distributionsAnnotationVisibility = (threshold, minScore, scoreRange) => {
  if (threshold > minScore + 0.96 * scoreRange) {
    return {
      distributionTNAnnotationVisible: true,
      distributionFNAnnotationVisible: true,
      distributionFPAnnotationVisible: false,
      distributionTPAnnotationVisible: false,
    };
  } else if (threshold < minScore + 0.04 * scoreRange) {
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

const computeGainsHozVerLines = (
  threshold,
  metrics,
  negPredScores,
  posPredScores,
) => {
  const negIdx = findSplitIndex(negPredScores, threshold);
  const posIdx = findSplitIndex(posPredScores, threshold);

  const numNegAbove = negPredScores.length - negIdx;
  const numPosAbove = posPredScores.length - posIdx;
  const totalNumScores = negPredScores.length + posPredScores.length;

  const proportionAbove = (numNegAbove + numPosAbove) / totalNumScores;

  return {
    gainsVx: [proportionAbove, proportionAbove],
    gainsVy: [0, metrics.TPR],
    gainsHx: [0, proportionAbove],
    gainsHy: [metrics.TPR, metrics.TPR],
    proportionAbove,
  };
};

const updatePlot = (threshold, cfg, ui) => {
  const {
    traceToIndex,
    xN,
    yN,
    xP,
    yP,
    posPredScores,
    negPredScores,
    minScore,
    scoreRange,
    maxDistributionY,
    dp,
  } = cfg;

  const { xTN, yTN, xFP, yFP } = splitNegativeTraceByClassification(
    xN,
    yN,
    threshold,
  );

  const { xFN, yFN, xTP, yTP } = splitPositiveTraceByClassification(
    xP,
    yP,
    threshold,
  );

  // Vertical dashed lines on distributions
  const lineNegX = [threshold, threshold];
  const lineNegY = [0, maxDistributionY * 1.1];
  const linePosX = [threshold, threshold];
  const linePosY = [0, maxDistributionY * 1.1];

  const metrics = computeClassificationMetrics(
    threshold,
    posPredScores,
    negPredScores,
  );

  const { variableTableMetricNames, variableTableMetrics } =
    computeVariableTableTraceData(metrics, dp);

  const {
    distributionTNAnnotationVisible,
    distributionFPAnnotationVisible,
    distributionFNAnnotationVisible,
    distributionTPAnnotationVisible,
  } = distributionsAnnotationVisibility(threshold, minScore, scoreRange);

  const { gainsVx, gainsVy, gainsHx, gainsHy, proportionAbove } =
    computeGainsHozVerLines(threshold, metrics, negPredScores, posPredScores);

  const FPConfusionAnnotation = {
    text: `FP: ${metrics.FP}`,
    x: "0",
    y: "0",
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const TNConfusionAnnotation = {
    text: `TN: ${metrics.TN}`,
    x: "1",
    y: "0",
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const TPConfusionAnnotation = {
    text: `TP: ${metrics.TP}`,
    x: "0",
    y: "1",
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const FNConfusionAnnotation = {
    text: `FN: ${metrics.FN}`,
    x: "1",
    y: "1",
    xref: "x2",
    yref: "y2",
    showarrow: false,
    font: { color: "white", size: 14 },
  };
  const distributionThresholdLineAnnotation = {
    text: "Predicted Negative        Predicted Positive",
    y: 0.5,
    yref: "paper",
    x: threshold,
    visible: true,
    showarrow: false,
  };
  const TNDistributionAnnotation = {
    text: "TN",
    y: 0.97,
    yref: "y domain",
    x: minScore + 0.025 * scoreRange,
    visible: distributionTNAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const FPDistributionAnnotation = {
    text: "FP",
    y: 0.97,
    yref: "y domain",
    x: minScore + 0.975 * scoreRange,
    visible: distributionFPAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const FNDistributionAnnotation = {
    text: "FN",
    y: 0.97,
    yref: "y3 domain",
    x: minScore + 0.025 * scoreRange,
    visible: distributionFNAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const TPDistributionAnnotation = {
    text: "TP",
    y: 0.97,
    yref: "y3 domain",
    x: minScore + 0.975 * scoreRange,
    visible: distributionTPAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const gainsVerticalProportionLineAnnotation = {
    text: proportionAbove.toFixed(dp),
    x: proportionAbove,
    xref: "x4 domain",
    yref: "y4 domain",
    y: -0.06,
    font: { size: 12 },
    showarrow: false,
    bgcolor: "white",
    bordercolor: "black",
    borderwidth: 1,
    borderpad: 3,
  };
  const gainsHorizontalRecallLineAnnotation = {
    text: metrics.TPR.toFixed(dp),
    x: -0.07,
    xref: "x4 domain",
    yref: "y4 domain",
    y: metrics.TPR.toFixed(2),
    font: { size: 12 },
    showarrow: false,
    bgcolor: "white",
    bordercolor: "black",
    borderwidth: 1,
    borderpad: 3,
  };

  const annotationUpdates = [
    FPConfusionAnnotation,
    TNConfusionAnnotation,
    TPConfusionAnnotation,
    FNConfusionAnnotation,
    distributionThresholdLineAnnotation,
    TNDistributionAnnotation,
    FPDistributionAnnotation,
    FNDistributionAnnotation,
    TPDistributionAnnotation,
    gainsVerticalProportionLineAnnotation,
    gainsHorizontalRecallLineAnnotation,
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
  ];

  const indices = [];
  const xArr = [];
  const yArr = [];
  for (const update of traceXYUpdates) {
    indices.push(traceToIndex.get(update.name));
    xArr.push(update.x);
    yArr.push(update.y);
  }

  Plotly.restyle("plotDiv", { x: xArr, y: yArr }, indices);

  Plotly.restyle(
    "plotDiv",
    {
      "cells.values": [[variableTableMetricNames, variableTableMetrics]],
    },
    [traceToIndex.get("variableMetricsTable")],
  );

  Plotly.relayout("plotDiv", {
    annotations: annotationUpdates,
  });

  updateInputElements(ui, threshold, metrics, dp);
};

/**
 * Clamp a number to the inclusive range `[min, max]`.
 * @function clip
 * @param {number} val - The value to clamp.
 * @param {number} min - Inclusive lower bound.
 * @param {number} max - Inclusive upper bound.
 * @returns {number} The clamped value within `[min, max]`.
 */
const clip = (val, min, max) => {
  if (val < min) {
    return min;
  } else if (val > max) {
    return max;
  }
  return val;
};

const clearAndStore = (inputElement) => {
  inputElement.dataset.originalValue = inputElement.value;
  inputElement.value = "";
};

//TODO: is it possible that this is being called too much?
const restoreIfEmpty = (inputElement) => {
  if (inputElement.value === "") {
    inputElement.value = inputElement.dataset.originalValue;
  }
};

const initConfig = () => {
  const plotConfig = JSON.parse(
    document.querySelector("#plot-config").textContent,
  );

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

const initUI = () => ({
  recallInput: document.querySelector("#recallInput"),
  thresholdInput: document.querySelector("#thresholdInput"),
  thresholdSlider: document.querySelector("#thresholdSlider"),
  thresholdDisplay: document.querySelector("#thresholdValue"),
});

const initEventListeners = (cfg, ui) => {
  // TODO: Explain the logic in jsdoc. (It's on ipad notes)
  ui.recallInput.addEventListener("keydown", (event) => {
    const recallFrac = ui.recallInput.valueAsNumber / 100;
    const clippedRecallFrac = clip(recallFrac, 0, 1);

    if (event.key === "Enter") {
      const idx = Math.floor(
        cfg.posPredScores.length - clippedRecallFrac * cfg.posPredScores.length,
      );

      const threshold =
        idx === cfg.posPredScores.length ? Infinity : cfg.posPredScores[idx];

      updatePlot(threshold, cfg, ui);
    }
  });

  ui.thresholdSlider.addEventListener("input", (event) => {
    const threshold = Number.parseFloat(event.target.value);
    updatePlot(threshold, cfg, ui);
  });

  ui.thresholdInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const threshold = Number.parseFloat(event.target.value);
      updatePlot(threshold, cfg, ui);
    }
  });

  ui.thresholdInput.addEventListener("focus", (event) => {
    clearAndStore(event.target);
  });
  ui.thresholdInput.addEventListener("blur", (event) => {
    restoreIfEmpty(event.target);
  });

  ui.recallInput.addEventListener("focus", (event) => {
    clearAndStore(event.target);
  });
  ui.recallInput.addEventListener("blur", (event) => {
    restoreIfEmpty(event.target);
  });
};

if (!window.Plotly) {
  document.querySelector("#cdn-fail").hidden = false;
}

const cfg = initConfig();
const ui = initUI();
initEventListeners(cfg, ui);
const initThreshold = Number.parseFloat(ui.thresholdSlider.value);

createSelectThresholdPlot(cfg);
updatePlot(initThreshold, cfg, ui);
