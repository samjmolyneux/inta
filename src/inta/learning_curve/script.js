/**
 * Renders a learning-curve plot with a mean line, min/max fill band, and per-fold scatter points.
 * @function createLearningCurve
 * @param {number[]} trainSizes      - Training sizes (one per tick on the x-axis).
 * @param {number[]} meanScores      - Mean score across folds for each training size.
 * @param {number[]} minScores       - Minimum (lower bound) score across folds for each size.
 * @param {number[]} maxScores       - Maximum (upper bound) score across folds for each size.
 * @param {number[][]} cvScores      - 2D array of raw per-fold scores, [sizeIndex][foldIndex].
 * @param {string} title             - Chart title text.
 * @param {string} xAxisTitle        - X-axis title text.
 * @param {string} yAxisTitle        - Y-axis title text.
 * @param {string} curveName         - Legend label for the mean curve.
 * @param {string} fillColour        - CSS color used to fill the min–max band.
 * @param {string} markerColour      - CSS color for per-fold scatter markers.
 * @param {string} imageFilename     - Filename used for exported images.
 * @returns {void}
 */
const createLearningCurve = (
  trainSizes,
  meanScores,
  minScores,
  maxScores,
  cvScores,
  title,
  xAxisTitle,
  yAxisTitle,
  curveName,
  fillColour,
  markerColour,
  imageFilename,
) => {
  const plotTraces = [];

  const upperBoundTrace = {
    x: trainSizes,
    y: maxScores,
    mode: "lines",
    line: { width: 0 },
    showlegend: false,
    hoverinfo: "skip",
  };

  const lowerBoundTrace = {
    x: trainSizes,
    y: minScores,
    mode: "lines",
    line: { width: 0 },
    fill: "tonexty",
    fillcolor: fillColour,
    showlegend: false,
    hoverinfo: "skip",
  };

  const curveTrace = {
    x: trainSizes,
    y: meanScores,
    mode: "lines+markers",
    name: curveName,
    line: { color: "red" },
    marker: { size: 8 },
  };

  plotTraces.push(upperBoundTrace, lowerBoundTrace, curveTrace);

  // Add individual CV scores as scatter points
  for (const i of trainSizes.keys()) {
    // const trainSizePerFold = Array.from({ length: cvScores[i].length }).fill(
    //   trainSizes[i],
    // );

    plotTraces.push({
      type: "scatter",
      mode: "markers",
      x0: trainSizes[i],
      dx: 0,
      y: cvScores[i],
      marker: { color: markerColour },
      hoverinfo: "skip",
      showlegend: false,
    });
  }

  const layout = {
    title: {
      text: title,
      xanchor: "center",
      x: 0.45,
      xref: "x domain",
    },
    xaxis: {
      title: {
        text: xAxisTitle,
      },
    },
    yaxis: {
      title: {
        text: yAxisTitle,
        standoff: 10,
      },
      automargin: true,
    },
    template: "plotly_white",
    dragmode: "pan",
  };

  const config = {
    responsive: true,
    scrollZoom: false,
    showLink: true,
    plotlyServerURL: "https://chart-studio.plotly.com",
    modeBarButtons: [["toImage", "zoom2d", "pan2d", "autoScale2d"]],
    displaylogo: false,
    displayModeBar: "always",
    toImageButtonOptions: {
      format: "png",
      filename: imageFilename,
      height: 720,
      width: 1480,
      scale: 3,
    },
  };

  if (!window.Plotly) {
    document.querySelector("#cdn-fail").hidden = false;
  }

  const plotConfig = JSON.parse(
    document.querySelector("#plot-config").textContent,
  );
  //   Plotly.newPlot("plot", data, layout, (config = config));
  Plotly.newPlot("plot", plotTraces, layout, config);
};
