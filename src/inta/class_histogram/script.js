const createClassHistogram = (
  binSize,
  positiveScores,
  negativeScores,
  title,
  xAxisTitle,
  yAxisTitle,
  imageFilename,
) => {
  const negativeTrace = {
    name: "Negative Class",
    x: negativeScores,
    type: "histogram",
    marker: {
      color: "rgba(255, 0, 0, 0.4)",
      line: { color: "rgba(255, 0, 0, 0.4)", width: 1.5 },
    },
    xbins: { size: binSize },
  };

  const positiveTrace = {
    name: "Positive Class",
    x: positiveScores,
    type: "histogram",
    marker: {
      color: "rgba(0, 188, 0, 0.65)",
      line: { color: "rgba(0, 188, 0, 0.8)", width: 1.5 },
    },
    xbins: { size: binSize },
  };

  const layout = {
    title: {
      text: title,
      font: { size: 20 },
    },
    xaxis: {
      title: {
        text: xAxisTitle,
        font: { size: 16 },
      },
    },
    yaxis: {
      title: {
        text: yAxisTitle,
        font: { size: 16 },
      },
    },
    template: "plotly_white",
    barmode: "overlay",
    dragmode: "pan",
  };

  const config = {
    responsive: true,
    scrollZoom: true,
    showLink: true,
    plotlyServerURL: "https://chart-studio.plotly.com",
    modeBarButtons: [["toImage", "zoom2d", "pan2d", "autoScale2d"]],
    displaylogo: false,
    displayModeBar: "always",
    toImageButtonOptions: {
      format: "png",
      filename: imageFilename,
      height: 720,
      width: 1280,
      scale: 3,
    },
  };

  Plotly.newPlot("histogram", [positiveTrace, negativeTrace], layout, config);
};

/**
 * Updates the histogram’s bin width by restyling the existing Plotly figure.
 * @function updateBins
 * @param {number} value - New width for the x-axis histogram bins.
 * @returns {void}
 */
const updateBins = (value) => {
  Plotly.restyle("histogram", "xbins.size", [value]);
};

if (!window.Plotly) {
  document.querySelector("#cdn-fail").hidden = false;
}

const binSelect = document.querySelector("#binSelect");
binSelect.addEventListener("change", (e) => {
  updateBins(Number(e.target.value));
});

const defaultBinSize = 0.1;
const plotConfig = JSON.parse(
  document.querySelector("#plot-config").textContent,
);

createClassHistogram(
  defaultBinSize,
  plotConfig.positiveScores,
  plotConfig.negativeScores,
  plotConfig.title,
  plotConfig.xAxisTitle,
  plotConfig.yAxisTitle,
  plotConfig.imageFilename,
);
