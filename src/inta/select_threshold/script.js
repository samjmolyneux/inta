const plotConfig = JSON.parse(
  document.querySelector("#plot-config").textContent,
);

// --------------------------------------------------------------------
// 1) DUMMY DATA (Replace these arrays with your actual data)
// --------------------------------------------------------------------

// For simplicity, let's assume we already computed xN,yN and xP,yP for
// two kernel density estimates: negative (N) and positive (P).

const { xN } = plotConfig;
const { yN } = plotConfig;
const { xP } = plotConfig;
const { yP } = plotConfig;
const { rocAuc } = plotConfig;
const { prAuc } = plotConfig;
const { predScores } = plotConfig;
const { trueY } = plotConfig;

const minProba = Math.min(...predScores);
const maxProba = Math.max(...predScores);
const rangeProba = maxProba - minProba;

// For the "cumulative gains" subplot, we can define an array of x=proportionExamined
// and y=cumulativeRecall, sorted by predScores descending:
var sortedScoresIndices = predScores
  .map((value, index) => [value, index])
  .sort((a, b) => b[0] - a[0])
  .map(pair => pair[1]);

var sortedTrueY = sortedScoresIndices.map(idx => trueY[idx]);
var nPos = sortedTrueY.reduce((acc, v) => acc + v, 0); // total # of positives
var cumulative = [0];
var sumPos = 0;
for (var i = 0; i < sortedTrueY.length; i++) {
  sumPos += sortedTrueY[i];
  cumulative.push(sumPos / nPos);
}
var xGains = [...Array(trueY.length + 1).keys()].map(i => i / trueY.length);
var yGains = cumulative; // same length as xGains

let thresholdBoundaries = [Infinity, ...predScores.slice()].sort(
  (a, b) => b - a,
);

// We'll keep track of the maximum Y for the negative and positive distribution plots:
var maxDistY = Math.max(...yN, ...yP);

// --------------------------------------------------------------------
// 2) FUNCTIONS TO COMPUTE SPLITS, METRICS, CONFUSION MATRIX, ETC.
// --------------------------------------------------------------------

// Quick function to find the index to split a sorted array x[] at value 'threshold'
function findSplitIndex(xArr, threshold) {
  // We want the first index where xArr[index] >= threshold
  // (similar to Python's np.searchsorted)
  for (let i = 0; i < xArr.length; i++) {
    if (xArr[i] >= threshold) {
      return i;
    }
  }
  return xArr.length; // if threshold is bigger than all
}

// Compute confusion matrix [TN, FP, FN, TP], plus metrics
const computeClassificationMetrics = threshold => {
  let FN = 0,
    FP = 0,
    TN = 0,
    TP = 0;

  const positive = 1;
  const negative = 0;

  for (const i of predScores.keys()) {
    const predLabel = predScores[i] >= threshold ? positive : negative;
    const actualLabel = trueY[i];

    if (actualLabel === negative && predLabel === negative) {
      TN += 1;
    }
    if (actualLabel === negative && predLabel === positive) {
      FP += 1;
    }
    if (actualLabel === positive && predLabel === negative) {
      FN += 1;
    }
    if (actualLabel === positive && predLabel === positive) {
      TP += 1;
    }
  }

  const accuracy = (TP + TN) / (TP + TN + FP + FN);
  const TPR = TP + FN > 0 ? TP / (TP + FN) : 0; // Recall
  const FPR = FP + TN > 0 ? FP / (FP + TN) : 0;
  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const balancedAccuracy = 0.5 * (TPR + (1 - FPR));
  const F4 = (17 * precision * TPR) / (16 * precision + TPR || 1);

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

const createSelectThresholdPlot = (rocAuc, prAuc, metricDecimalPlaces) => {
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

  const invariantHeader = [["Invariant Metric", "Value"]];
  const invariantRows = [
    ["ROC AUC", rocAuc.toFixed(metricDecimalPlaces)],
    ["PR AUC", prAuc.toFixed(metricDecimalPlaces)],
  ];
  const invariantCellsValues = [
    invariantRows.map(r => r[0]),
    invariantRows.map(r => r[1]),
  ];

  const variantHeader = [["Metric", "Value"]];
  const variantRows = [
    ["Accuracy", "--"],
    ["Balanced Accuracy", "--"],
    ["Recall", "--"],
    ["Precision", "--"],
    ["FPR", "--"],
    ["F4", "--"],
  ];
  const variantCellsValues = [
    variantRows.map(r => r[0]),
    variantRows.map(r => r[1]),
  ];

  // Create initial traces; we’ll fill them on update):
  const TNDistribution = {
    x: [],
    y: [],
    mode: "lines",
    fill: "tozeroy",
    line: { color: "salmon" },
    name: "TN",
    legendgroup: "Negative",
    xaxis: "x", // top-left subplot
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
    xaxis: "x3", // bottom-left subplot
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

  // 3.3 Vertical threshold lines on top-left and bottom-left distribution subplots
  const negDistributionThresholdLine = {
    x: [], // e.g. [threshold, threshold]
    y: [], // e.g. [0, maxDistY]
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

  // 3.4 Confusion matrix heatmap (top-right)
  const confusionMatrix = {
    z: confusionZ,
    x: ["0", "1"], // predicted label
    y: ["0", "1"], // true label
    type: "heatmap",
    colorscale: confusionColorscale,
    showscale: false,
    xaxis: "x2",
    yaxis: "y2",
    hoverinfo: "skip",
  };

  const fixedMetricsTable = {
    type: "table",
    header: {
      values: invariantHeader[0],
      fill: { color: "lightgrey" },
      align: "center",
    },
    cells: {
      values: invariantCellsValues,
      fill: { color: "white" },
      align: "center",
    },
    domain: {
      x: [0.78, 1.0],
      y: [0.475, 0.675],
    },
  };

  const variableMetricsTable = {
    type: "table",
    header: {
      values: variantHeader[0],
      fill: { color: "lightgrey" },
      align: "center",
    },
    cells: {
      values: variantCellsValues,
      fill: { color: "white" },
      align: "center",
    },
    domain: {
      x: [0.78, 1.0],
      y: [0.68, 1.0],
    },
  };

  // 3.7 Cumulative gains line (bottom-right)
  const gainsCurve = {
    x: xGains,
    y: yGains,
    mode: "lines",
    name: "",
    line: { width: 3, color: "#20C5FF" },
    // hovertemplate: 'Examined: %{x:.2f}<br>Recall: %{y:.2f}',
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",

    customdata: thresholdBoundaries,
    // TODO: try to move this over to backtick
    hovertemplate:
      "Proportion of Papers Examined: %{x}" +
      "<br>Proportion of Positives Found: %{y:.4f}" +
      "<br>Decision Threshold: %{customdata:.4f}",
    hoverlabel: {
      bgcolor: "white",
      bordercolor: "#20C5FF",
      font: { color: "black" },
    },
    legendgroup: "",
  };

  // 3.8 Two lines to mark threshold on the gains plot
  //     We'll place them at (pAT, 0) -> (pAT, TPR) and (0, TPR) -> (pAT, TPR)
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

  // The entire data array for the initial plot:
  const data = [
    // Top-left negative distribution
    TNDistribution,
    FPDistribution,
    negDistributionThresholdLine,
    // Bottom-left positive distribution
    FNDistribution,
    TPDistribution,
    posDistributionThresholdLine,
    // Top-right confusion matrix
    confusionMatrix,
    // Top-right tables
    fixedMetricsTable,
    variableMetricsTable,
    // Bottom-right gains line + threshold lines
    // TODO: Need a new name for these three.
    gainsCurve,
    gainsVerticalProportionLine,
    gainsHorizontalRecallLine,
  ];

  // Layout with four subplots arranged:
  //   row=1 col=1 => negative distribution   (xaxis='x',   yaxis='y')
  //   row=1 col=2 => confusion matrix + table(xaxis='x2',  yaxis='y2')
  //   row=2 col=1 => positive distribution   (xaxis='x3',  yaxis='y3')
  //   row=2 col=2 => gains plot              (xaxis='x4',  yaxis='y4')
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
      range: [minProba - 0.05 * rangeProba, maxProba + 0.05 * rangeProba],
      zeroline: false,
    },
    yaxis: {
      domain: [0.55, 1.0], // top-left
      anchor: "x",
      title: "Actual Negatives",
      range: [0, maxDistY * 1.1],
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
      range: [minProba - 0.05 * rangeProba, maxProba + 0.05 * rangeProba],
      zeroline: false,
    },
    yaxis3: {
      domain: [0.0, 0.45],
      anchor: "x3",
      title: "Actual Positives",
      range: [0, maxDistY * 1.1],
    },
    xaxis4: {
      domain: [0.55, 1.0], // bottom-right
      anchor: "y4",
      title: "Proportion of Papers Examined",
      range: [-0.02, 1.02],
    },
    yaxis4: {
      domain: [0.0, 0.45],
      anchor: "x4",
      title: "Recall",
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
  // Make the initial plot
  Plotly.newPlot("plotDiv", data, layout, config);
};
// --------------------------------------------------------------------
// 4) THE KEY FUNCTION: updatePlot(threshold)
//    This slices the distributions, updates confusion matrix, tables, etc.
// --------------------------------------------------------------------
// TODO: up to here

const splitNegativeTraceByClassification = (threshold, idxN) => {
  if (idxN > 0) {
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

  return {
    xTN: [],
    yTN: [],
    xFP: xN.slice(),
    yFP: yN.slice(),
  };
};

const splitPositiveTraceByClassification = (threshold, idxP) => {
  if (idxP > 0) {
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

  return {
    xFN: [],
    yFN: [],
    xTP: xP.slice(),
    yTP: yP.slice(),
  };
};

// TODO: come up with better name for double distribution trace and then add it to this func name
const pdfPlotCmAnnotationVisibility = threshold => {
  if (threshold > minProba + 0.96 * rangeProba) {
    return {
      distributionTNAnnotationVisible: true,
      distributionFNAnnotationVisible: true,
      distributionFPAnnotationVisible: false,
      distributionTPAnnotationVisible: false,
    };
  } else if (threshold < minProba + 0.04 * rangeProba) {
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

const computeVariantTableTraceData = (metrics, metricDecimalPlaces) => {
  const accuracy = `${(100 * metrics.accuracy).toFixed(metricDecimalPlaces)}%`;
  const balancedAccuracy = `${(100 * metrics.balancedAccuracy).toFixed(metricDecimalPlaces)}%`;
  const recall = `${(100 * metrics.TPR).toFixed(metricDecimalPlaces)}%`;
  const precision = `${(100 * metrics.precision).toFixed(metricDecimalPlaces)}%`;
  const specificity = `${(100 * (1 - metrics.FPR)).toFixed(metricDecimalPlaces)}%`;
  const fpr = `${(100 * metrics.FPR).toFixed(metricDecimalPlaces)}%`;
  const f4 = `${(100 * metrics.F4).toFixed(metricDecimalPlaces)}%`;

  return {
    variantTableMetricNames: [
      "Accuracy",
      "Balanced Accuracy",
      "Recall",
      "Precision",
      "Specificity",
      "FPR",
      "F4",
    ],
    variantTableMetrics: [
      accuracy,
      balancedAccuracy,
      recall,
      precision,
      specificity,
      fpr,
      f4,
    ],
  };
};

const updatePlot = (threshold, metricDecimalPlaces) => {
  const idxN = findSplitIndex(xN, threshold);
  const { xTN, yTN, xFP, yFP } = splitNegativeTraceByClassification(
    threshold,
    idxN,
  );

  const idxP = findSplitIndex(xP, threshold);
  const { xFN, yFN, xTP, yTP } = splitPositiveTraceByClassification(
    threshold,
    idxP,
  );

  // Vertical dashed lines on distributions
  const lineNegX = [threshold, threshold];
  const lineNegY = [0, maxDistY * 1.1];
  const linePosX = [threshold, threshold];
  const linePosY = [0, maxDistY * 1.1];

  const metrics = computeClassificationMetrics(threshold);

  const { variantTableMetricNames, variantTableMetrics } =
    computeVariantTableTraceData(metrics, metricDecimalPlaces);

  const {
    distributionTNAnnotationVisible,
    distributionFPAnnotationVisible,
    distributionFNAnnotationVisible,
    distributionTPAnnotationVisible,
  } = pdfPlotCmAnnotationVisibility(threshold);

  // 6) Gains plot threshold lines
  const proportionAbove =
    predScores.filter(p => p >= threshold).length / predScores.length;
  const gainsVx = [proportionAbove, proportionAbove];
  const gainsVy = [0, metrics.TPR];
  const gainsHx = [0, proportionAbove];
  const gainsHy = [metrics.TPR, metrics.TPR];

  // 7) Send a single update to Plotly for everything that changes:
  //    We'll do an array of "restyle" updates for each trace, plus "relayout" updates for the heatmap text.
  //    The order of the traces in data[]:
  //      0: traceTN, 1: traceFP, 2: threshLineNegative,
  //      3: traceFN, 4: traceTP, 5: threshLinePositive,
  //      6: confusionTrace,
  //      7: invariantTableTrace, 8: variantTableTrace,
  //      9: gainsLine, 10: gainsVLine, 11: gainsHLine
  //
  const newAnnotations = [
    {
      // The "FP" cell is at x='0', y='0' in the heatmap data space
      text: `FP: ${metrics.FP}`,
      x: "0",
      y: "0",
      xref: "x2", // x-axis for your heatmap
      yref: "y2", // y-axis for your heatmap
      showarrow: false,
      font: { color: "white", size: 14 },
    },
    {
      // The "TN" cell is at x='1', y='0'
      text: `TN: ${metrics.TN}`,
      x: "1",
      y: "0",
      xref: "x2",
      yref: "y2",
      showarrow: false,
      font: { color: "white", size: 14 },
    },
    {
      // The "TP" cell is at x='0', y='1'
      text: `TP: ${metrics.TP}`,
      x: "0",
      y: "1",
      xref: "x2",
      yref: "y2",
      showarrow: false,
      font: { color: "white", size: 14 },
    },
    {
      // The "FN" cell is at x='1', y='1'
      text: `FN: ${metrics.FN}`,
      x: "1",
      y: "1",
      xref: "x2",
      yref: "y2",
      showarrow: false,
      font: { color: "white", size: 14 },
    },
    // Annotation of threshold line
    {
      text: "Predicted Negative        Predicted Positive",
      y: 0.5,
      yref: "paper",
      x: threshold,
      visible: true,
      showarrow: false,
    },
    {
      text: "TN",
      y: 0.97,
      yref: "y domain",
      x: minProba + 0.025 * rangeProba,
      visible: distributionTNAnnotationVisible,
      font: { size: 14 },
      showarrow: false,
    },
    {
      text: "FP",
      y: 0.97,
      yref: "y domain",
      x: minProba + 0.975 * rangeProba,
      visible: distributionFPAnnotationVisible,
      font: { size: 14 },
      showarrow: false,
    },
    {
      text: "FN",
      y: 0.97,
      yref: "y3 domain",
      x: minProba + 0.025 * rangeProba,
      visible: distributionFNAnnotationVisible,
      font: { size: 14 },
      showarrow: false,
    },
    {
      text: "TP",
      y: 0.97,
      yref: "y3 domain",
      x: minProba + 0.975 * rangeProba,
      visible: distributionTPAnnotationVisible,
      font: { size: 14 },
      showarrow: false,
    },
    {
      text: proportionAbove.toFixed(metricDecimalPlaces),
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
    },
    {
      text: metrics.TPR.toFixed(metricDecimalPlaces),
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
    },
  ];

  Plotly.restyle(
    "plotDiv",
    {
      x: [xTN, xFP, lineNegX, xFN, xTP, linePosX, gainsVx, gainsHx],
      y: [yTN, yFP, lineNegY, yFN, yTP, linePosY, gainsVy, gainsHy],
    },
    [
      0,
      1,
      2,
      3,
      4,
      5 /* xTN, xFP, etc. go to these trace indices */,
      10,
      11, // for x and y of gains lines, but we handle them in the same .restyle call
    ],
  );

  Plotly.restyle(
    "plotDiv",
    {
      "cells.values": [[variantTableMetricNames, variantTableMetrics]],
    },
    [8],
  ); // trace index 8 is variantTableTrace

  Plotly.relayout("plotDiv", {
    annotations: newAnnotations,
  });

  document.getElementById("recallInput").value = (100 * metrics.TPR).toFixed(
    metricDecimalPlaces,
  );
  document.getElementById("thresholdInput").value =
    threshold.toFixed(metricDecimalPlaces);
  document.getElementById("thresholdSlider").value =
    threshold.toFixed(metricDecimalPlaces);
  document.getElementById("thresholdValue").textContent =
    threshold.toFixed(metricDecimalPlaces);
};

function syncThreshold(source) {
  let input = document.getElementById("thresholdInput");

  updatePlot(parseFloat(input.value), 4);
}

function clearAndStore(inputElement) {
  inputElement.dataset.originalValue = inputElement.value;
  inputElement.value = "";
}

function restoreIfEmpty(inputElement) {
  if (inputElement.value === "") {
    inputElement.value = inputElement.dataset.originalValue;
  }
}

if (!window.Plotly) {
  document.querySelector("#cdn-fail").hidden = false;
}

createSelectThresholdPlot(rocAuc, prAuc, 4);

updatePlot(parseFloat(document.getElementById("thresholdSlider").value), 4);

document
  .getElementById("thresholdInput")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      // Only triggers when Enter is pressed in the input box
      syncThreshold("input");
    }
  });

document
  .getElementById("recallInput")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      // Only triggers when Enter is pressed in the input box
      for (let i = cumulative.length - 2; i >= 0; i--) {
        if (
          cumulative[i] * 100 <
          parseFloat(document.getElementById("recallInput").value)
        ) {
          updatePlot(thresholdBoundaries[i + 1], 4);
          break;
        }
      }
    }
  });

const slider = document.getElementById("thresholdSlider");
slider.addEventListener("input", function (event) {
  updatePlot(parseFloat(event.target.value), 4);
});

const thresholdInput = document.getElementById("thresholdInput");
thresholdInput.addEventListener("focus", function (event) {
  clearAndStore(event.target);
});
thresholdInput.addEventListener("blur", function (event) {
  restoreIfEmpty(event.target);
});

const recallInput = document.getElementById("recallInput");
recallInput.addEventListener("focus", function (event) {
  clearAndStore(event.target);
});
recallInput.addEventListener("blur", function (event) {
  restoreIfEmpty(event.target);
});
