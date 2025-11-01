const createBoxPlot = (
  dataList,
  nameList,
  title,
  xaxisTitle,
  yaxisTitle,
  divId,
  invisibleX,
  invisibleY,
  imageFilename
) => {
  // Existing + MORE new colors
  const fillPalette = [
    //"rgba(0, 0, 255, 0.5)",    // Blue
    //"rgba(255, 0, 0, 0.5)",    // Red
    //"rgba(0, 200, 0, 0.5)",    // Green
    //"rgba(255, 165, 0, 0.5)",  // Orange
    //"rgba(128, 0, 128, 0.5)",  // Purple
    //"rgba(0, 255, 255, 0.5)",  // Cyan
    //"rgba(255, 105, 180, 0.5)",// Hot Pink
    //"rgba(255, 215, 0, 0.5)",  // Gold
    //"rgba(139, 69, 19, 0.5)",  // Brown
    //"rgba(154, 205, 50, 0.5)", // Yellow-Green
    //"rgba(0, 191, 255, 0.5)",  // Deep Sky Blue
    //"rgba(173, 255, 47, 0.5)", // Lime Green
    //"rgba(210, 105, 30, 0.5)", // Chocolate
    //"rgba(240, 230, 140, 0.5)",// Khaki
    //"rgba(70, 130, 180, 0.5)", // Steel Blue
    //"rgba(255, 140, 0, 0.5)",  // Dark Orange
    //"rgba(0, 250, 154, 0.5)",  // Medium Spring Green
    //"rgba(255, 0, 255, 0.5)",  // Magenta
    //"rgba(128, 128, 0, 0.5)",  // Olive
    //"rgba(0, 0, 128, 0.5)",    // Navy
  ];

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

  for (const i of dataList.indices()) {
    const fillColour = fillPalette[i % fillPalette.length];
    const lineColour = linePalette[i % linePalette.length];
    const boxData = dataList[i];
    const boxName = nameList[i];

    traces.push({
      type: "box",
      y: boxData,
      name: boxName,
      fillcolor: fillColour,
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
        text: yaxisTitle,
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

const plotConfig = JSON.parse(
  document.querySelector("#plot-config").textContent
);

createBoxPlot(
  plotConfig.dataList,
  plotConfig.nameList,
  plotConfig.title,
  plotConfig.xaxisTitle,
  plotConfig.yaxisTitle,
  plotConfig.divId,
  plotConfig.invisibleX,
  plotConfig.invisibleY,
  plotConfig.imageFilename
);
