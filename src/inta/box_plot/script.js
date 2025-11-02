/**
 * Create a Plotly box-plot with per-series colours and an invisible line
 * used to drive unified-hover behaviour.
 * @param {number[][]} dataList - Array of series; each inner array is the y-values for one box.
 * @param {string[]} nameList - Display names for each series (same length as `dataList`).
 * @param {string} title - Figure title shown at the top.
 * @param {string} xAxisTitle - X-axis title (category axis).
 * @param {string} yAxisTitle - Y-axis title (numeric axis).
 * @param {string | HTMLElement} divId - Target container: element ID or the element itself.
 * @param {number[]} invisibleX - X values for the invisible helper line (for hover alignment).
 * @param {number[]} invisibleY - Y values for the invisible helper line (shown in hover).
 * @param {string} imageFilename - Base filename for the “Download image” toolbar action.
 * @returns {void}
 */
const createBoxPlot = (
  dataList,
  nameList,
  title,
  xAxisTitle,
  yAxisTitle,
  divId,
  invisibleX,
  invisibleY,
  imageFilename,
) => {
  const linePalette = [
    "blue",
    "red",
    "green",
    "orange",
    "purple",
    "cyan",
    "hotpink",
    "gold",
    "brown",
    "yellowgreen",
    "deepskyblue",
    "limegreen",
    "chocolate",
    "khaki",
    "steelblue",
    "darkorange",
    "mediumspringgreen",
    "magenta",
    "olive",
    "navy",
  ];

  const traces = [];

  for (const i of dataList.keys()) {
    const lineColour = linePalette[i % linePalette.length];
    const boxData = dataList[i];
    const boxName = nameList[i];

    traces.push({
      type: "box",
      y: boxData,
      name: boxName,
      line: { color: lineColour },
      boxpoints: "all",
      marker: {
        color: lineColour,
        line: { color: "black", width: 1 },
      },
      hoverinfo: "skip",
    });
  }

  traces.push({
    type: "scatter",
    x: invisibleX,
    y: invisibleY,
    mode: "lines",
    hoverinfo: "y",
    line: { color: "rgba(0,0,0,0)" },
    showlegend: false,
  });

  const categoryRangePadding = -0.5;
  const layout = {
    title: {
      text: title,
      font: { size: 32 },
      x: 0.5,
      xref: "paper",
      xanchor: "center",
    },
    showlegend: true,
    xaxis: {
      range: [categoryRangePadding, dataList.length + categoryRangePadding],
      autorange: false,
      zeroline: false,
      type: "category",
    },
    yaxis: {
      title: {
        text: yAxisTitle,
        standoff: 20,
        font: { size: 20 },
      },
      showspikes: true,
      spikemode: "across+toaxis",
      spikecolor: "black",
      spikethickness: 1,
      hoverformat: ".4f",
    },
    hovermode: "y unified",
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
      height: 720,
      width: 1480,
      scale: 3,
    },
  };

  Plotly.newPlot(divId, traces, layout, config);
};

if (!window.Plotly) {
  document.getElementById("cdn-fail").hidden = false;
}

const plotConfig = JSON.parse(document.querySelector("#plot-config").textContent);

createBoxPlot(
  plotConfig.dataList,
  plotConfig.nameList,
  plotConfig.title,
  plotConfig.xAxisTitle,
  plotConfig.yAxisTitle,
  "box-plot-div",
  plotConfig.invisibleX,
  plotConfig.invisibleY,
  plotConfig.imageFilename,
);
