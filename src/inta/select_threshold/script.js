const plotConfig = JSON.parse(
  document.querySelector("#plot-config").textContent,
);

const { xN } = plotConfig;
const { yN } = plotConfig;
const { xP } = plotConfig;
const { yP } = plotConfig;
const { rocAuc } = plotConfig;
const { prAuc } = plotConfig;
const { posPredScores } = plotConfig;
const { negPredScores } = plotConfig;
const { predScores } = plotConfig;
const { xGains } = plotConfig;
const { yGains } = plotConfig;

//TODO: find all predScores and trueY

const minProba = Math.min(posPredScores[0], negPredScores[0]);
const maxProba = Math.max(posPredScores.at(-1), negPredScores.at(-1));
const rangeProba = maxProba - minProba;

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
const traceToIndex = new Map(
  traceOrder.map((traceName, traceIndex) => [traceName, traceIndex]),
);

let thresholdBoundaries = [Infinity, ...predScores.slice()].sort(
  (a, b) => b - a,
);

// We'll keep track of the maximum Y for the negative and positive distribution plots:
var maxDistY = Math.max(...yN, ...yP);

const findSplitIndex = (xArr, threshold) => {
  // idxN should be the first index where xN[idxN] >= threshold
  // or xN.length if all < threshold
  // I have double checked it works
  // Returns the first index where threshold <= xArr[index]
  let lo = 0;
  let hi = xArr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (xArr[mid] < threshold) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo; // == xArr.length if all < threshold
};

// Compute confusion matrix [TN, FP, FN, TP], plus metrics
const computeClassificationMetrics = threshold => {
  const posSplitIdx = findSplitIndex(posPredScores, threshold);
  const negSplitIdx = findSplitIndex(negPredScores, threshold);

  const FN = posSplitIdx;
  const TP = posPredScores.length - posSplitIdx;
  const TN = negSplitIdx;
  const FP = negPredScores.length - negSplitIdx;

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
    [rocAuc.toFixed(metricDecimalPlaces), prAuc.toFixed(metricDecimalPlaces)],
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
    line: { width: 3, color: "#20C5FF" },
    showlegend: false,
    xaxis: "x4",
    yaxis: "y4",
    customdata: thresholdBoundaries,
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

//TODO: Would these two functions be better by using references instead of copying arrays
const splitNegativeTraceByClassification = (xN, threshold) => {
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

//TODO: Would these two functions be better by using references instead of copying arrays
const splitPositiveTraceByClassification = (xP, threshold) => {
  const idxP = findSplitIndex(xP, threshold);

  // TODO:  write in comments that idxN should be the first index where xN[idxN] >= threshold
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

const distributionsAnnotationVisibility = threshold => {
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

const computeVariableTableTraceData = (metrics, metricDecimalPlaces) => {
  const fracToPercent = v => `${(100 * v).toFixed(metricDecimalPlaces)}%`;

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

const updatePlot = (threshold, metricDecimalPlaces) => {
  const { xTN, yTN, xFP, yFP } = splitNegativeTraceByClassification(
    xN,
    threshold,
  );

  const { xFN, yFN, xTP, yTP } = splitPositiveTraceByClassification(
    xP,
    threshold,
  );

  // Vertical dashed lines on distributions
  const lineNegX = [threshold, threshold];
  const lineNegY = [0, maxDistY * 1.1];
  const linePosX = [threshold, threshold];
  const linePosY = [0, maxDistY * 1.1];

  const metrics = computeClassificationMetrics(threshold);

  const { variableTableMetricNames, variableTableMetrics } =
    computeVariableTableTraceData(metrics, metricDecimalPlaces);

  const {
    distributionTNAnnotationVisible,
    distributionFPAnnotationVisible,
    distributionFNAnnotationVisible,
    distributionTPAnnotationVisible,
  } = distributionsAnnotationVisibility(threshold);

  // 6) Gains plot threshold lines
  const proportionAbove =
    predScores.filter(p => p >= threshold).length / predScores.length;
  const gainsVx = [proportionAbove, proportionAbove];
  const gainsVy = [0, metrics.TPR];
  const gainsHx = [0, proportionAbove];
  const gainsHy = [metrics.TPR, metrics.TPR];

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
    x: minProba + 0.025 * rangeProba,
    visible: distributionTNAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const FPDistributionAnnotation = {
    text: "FP",
    y: 0.97,
    yref: "y domain",
    x: minProba + 0.975 * rangeProba,
    visible: distributionFPAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const FNDistributionAnnotation = {
    text: "FN",
    y: 0.97,
    yref: "y3 domain",
    x: minProba + 0.025 * rangeProba,
    visible: distributionFNAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const TPDistributionAnnotation = {
    text: "TP",
    y: 0.97,
    yref: "y3 domain",
    x: minProba + 0.975 * rangeProba,
    visible: distributionTPAnnotationVisible,
    font: { size: 14 },
    showarrow: false,
  };
  const gainsVerticalProportionLineAnnotation = {
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
  };
  const gainsHorizontalRecallLineAnnotation = {
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
      for (let i = yGains.length - 2; i >= 0; i--) {
        if (
          yGains[i] * 100 <
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
