"""Generate interactive HTML histograms with summary statistics."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import numpy as np

from inta.template_renderer import render_template

if TYPE_CHECKING:
    from collections.abc import Sequence
    from os import PathLike

    from numpy.typing import NDArray


def histogram_plot(
    scores: Sequence[float] | NDArray[Any],
    savepath: str | PathLike[str],
    *,
    title: str = "",
    xaxis_title: str = "",
    yaxis_title: str = "count",
    bar_colour: str = "rgba(102, 204, 255, 0.7)",
    image_filename: str = "histogram",
) -> None:
    """
    Save an interactive histogram with descriptive statistics.

    Parameters
    ----------
    scores : sequence of float or numpy.ndarray
        Non-empty, one-dimensional collection of numeric values.
    savepath : str or os.PathLike
        Destination HTML file. Its parent directory must already exist.
    title : str, optional
        Plot title.
    xaxis_title : str, optional
        Label for the value axis.
    yaxis_title : str, optional
        Label for the count axis.
    bar_colour : str, optional
        CSS colour used for the histogram bars.
    image_filename : str, optional
        Base filename used when exporting an image from the plot.

    Notes
    -----
    The plot includes the mean, median, population standard deviation, minimum
    and maximum of the supplied values.

    """
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
