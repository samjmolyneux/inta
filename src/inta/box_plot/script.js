function createBoxPlot(
  dataList,
  nameList,
  title,
  xaxisTitle,
  yaxisTitle,
  divId
) {
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

  let traces = [];

  for (let i = 0; i < dataList.length; i++) {
    const fc = fillPalette[i % fillPalette.length];
    const lc = linePalette[i % linePalette.length];

    traces.push({
      type: "box",
      y: dataList[i],
      name: nameList[i],
      fillcolor: fc,
      line: { color: lc },
      boxpoints: "all",
      marker: {
        color: lc,
        line: { color: "black", width: 1 },
      },
      hoverinfo: "skip",
    });
  }

  traces.push({
    type: "scatter",
    x: { invisible_x },
    y: { invisible_y },
    mode: "lines",
    hoverinfo: "y",
    line: { color: "rgba(0,0,0,0)" },
    showlegend: false,
  });

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
      range: [-0.5, dataList.length - 0.5],
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
      filename: "{image_filename}",
      height: 720,
      width: 1480,
      scale: 3,
    },
  };

  Plotly.newPlot(divId, traces, layout, config);
}

// Call the function with Python-generated data
const dataList = { data_by_box };
const nameList = { box_names };

createBoxPlot(
  dataList,
  nameList,
  "{title}",
  "{xaxis_title}",
  "{yaxis_title}",
  "box-plot-div"
);
