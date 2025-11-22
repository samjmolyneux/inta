/* global Plotly */

/**
 * Renders a Plotly histogram from the given scores.
 * @function createHistogram
 * @param {number} binSize       - Width of each histogram bin.
 * @param {number[]} scores      - Array of numeric scores to plot.
 * @param {string} title         - Chart title text.
 * @param {string} xAxisTitle    - X-axis title text.
 * @param {string} yAxisTitle    - Y-axis title text.
 * @param {string} colour        - Bar color (any valid CSS color).
 * @param {string} imageFilename - Filename used for exported image.
 * @returns {void}
 */
const createHistogram = (
  binSize,
  scores,
  title,
  xAxisTitle,
  yAxisTitle,
  colour,
  imageFilename,
) => {
  const trace = {
    x: scores,
    type: "histogram",
    marker: {
      color: colour,
      line: { color: "rgba(0, 0, 0, 0.7)", width: 1.5 },
    },
    opacity: 0.8,
    xbins: { size: binSize },
  };

  const layout = {
    title: {
      text: title,
      font: { size: 30 },
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
    dragmode: false,
  };

  const config = {
    responsive: true,
    scrollZoom: false,
    showLink: true,
    plotlyServerURL: "https://chart-studio.plotly.com",
    modeBarButtons: [["toImage"]],
    displaylogo: false,
    displayModeBar: "always",
    toImageButtonOptions: {
      format: "png",
      filename: imageFilename,
      height: 600,
      width: 900,
      scale: 3,
    },
  };

  Plotly.newPlot("histogram", [trace], layout, config);
};

/**
 * Renders a Plotly stats table showing summary metrics for the scores.
 * @function createStatsTable
 * @param {number} mean   - Mean of the scores.
 * @param {number} median - Median of the scores.
 * @param {number} stdDev - Standard deviation of the scores.
 * @param {number} minVal - Minimum score.
 * @param {number} maxVal - Maximum score.
 * @returns {void}
 */
const createStatsTable = (mean, median, stdDev, minVal, maxVal) => {
  const statsDecicmalPlaces = 4;
  const statsTable = {
    type: "table",
    header: {
      values: [["<b>Statistic</b>"], ["<b>Value</b>"]],
      align: "center",
      fill: { color: "lightgrey" },
    },
    cells: {
      values: [
        ["Mean", "Median", "Standard Deviation", "Minimum", "Maximum"],
        [
          mean.toFixed(statsDecicmalPlaces),
          median.toFixed(statsDecicmalPlaces),
          stdDev.toFixed(statsDecicmalPlaces),
          minVal.toFixed(statsDecicmalPlaces),
          maxVal.toFixed(statsDecicmalPlaces),
        ],
      ],
      align: "center",
    },
  };

  const layout = {
    title: {
      font: { size: 24 },
    },
    margin: { t: 10, b: 10, r: 0, l: 0 },
    template: "plotly_white",
  };

  const config = {
    displayModeBar: false,
  };

  Plotly.newPlot("stats-table", [statsTable], layout, config);
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
/**
 * Temporarily clear an input’s value on focus.
 * @param {FocusEvent} e - focus event
 * @returns {void}
 */
const handleFocus = (e) => {
  const inputElement = e.target;

  if (inputElement.value === inputElement.dataset.committedValue) {
    inputElement.value = "";
  }
};

/**
 * Restore an input’s original value on blur.
 * @param {FocusEvent} e - the blur event
 * @returns {void}
 */
const handleRevertOnBlur = (e) => {
  const inputElement = e.target;
  inputElement.value = inputElement.dataset.committedValue;
};

const handleBinWidthInput = (e) => {
  if (e.key !== "Enter") return;

  const binWidthInput = e.target;

  if (binWidthInput.checkValidity()) {
    const binWidth = binWidthInput.valueAsNumber;
    // UI is updated within updatePlot
    updateBins(binWidth);
    binWidthInput.dataset.committedValue = binWidthInput.value;
    return;
  }

  //TODO: add an upper and lower bound
  // if (binWidthInput.validity.rangeUnderflow || binWidthInput.validity.rangeOverflow) {
  //   const recallPct = clip(ui.recallInput.valueAsNumber, 0, 100);
  //   // UI is updated within updatePlot
  //   updatePlotWRecall(recallPct, cfg, ui);
  // }

  binWidthInput.value = binWidthInput.dataset.committedValue;
};

const main = () => {
  const loader = document.querySelector("#plot-loading");

  if (!("Plotly" in globalThis)) {
    document.querySelector("#cdn-fail").hidden = false;
    loader.hidden = true;
    return;
  }
  const binWidthInput = document.querySelector("#bin-width-input");

  binWidthInput.addEventListener("keydown", handleBinWidthInput);

  binWidthInput.addEventListener("focus", handleFocus);
  binWidthInput.addEventListener("blur", handleRevertOnBlur);
  binWidthInput.dataset.committedValue = binWidthInput.value;

  // TODO: Automatically determine a good default bin size based on the data
  const defaultBinSize = 0.005;
  const plotConfig = JSON.parse(document.querySelector("#plot-config").textContent);

  createHistogram(
    defaultBinSize,
    plotConfig.scores,
    plotConfig.title,
    plotConfig.xAxisTitle,
    plotConfig.yAxisTitle,
    plotConfig.colour,
    plotConfig.imageFilename,
  );
  createStatsTable(
    plotConfig.mean,
    plotConfig.median,
    plotConfig.stdDev,
    plotConfig.minVal,
    plotConfig.maxVal,
  );

  loader.hidden = true;
};

main();
