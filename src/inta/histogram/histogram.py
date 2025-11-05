import numpy as np

from inta.template_renderer import render_template


def histogram_plot(
    scores,
    savepath,
    title="",
    xaxis_title="",
    yaxis_title="count",
    bar_colour="rgba(102, 204, 255, 0.7)",
    image_filename="histogram",
):
    mean = np.mean(scores)
    median = np.median(scores)
    std_dev = np.std(scores)
    min_val = np.min(scores)
    max_val = np.max(scores)

    scores = np.array(scores).tolist()

    config = {
        "document_title": "Histogram",
        "plot_config": {
            "title": title,
            "scores": scores,
            "mean": mean,
            "median": median,
            "stdDev": std_dev,
            "minVal": min_val,
            "maxVal": max_val,
            "xAxisTitle": xaxis_title,
            "yAxisTitle": yaxis_title,
            "barColour": bar_colour,
            "ImageFilename": image_filename,
        },
    }
    render_template(
        template="histogram/histogram.html",
        config=config,
        savepath=savepath,
    )
