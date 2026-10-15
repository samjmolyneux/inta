"""Generate interactive score histograms for positive and negative classes."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from inta.template_renderer import render_template

if TYPE_CHECKING:
    from os import PathLike

    from numpy.typing import NDArray


def positive_negative_scores_histogram_plot(
    y_true: NDArray[Any],
    pred_scores: NDArray[Any],
    savepath: str | PathLike[str],
    title: str = "Predicted Scores on Positive and Negative Test Datasets",
    xaxis_title: str = "Predicted Score",
    yaxis_title: str = "Count",
    image_filename: str = "to-scale-pos-neg-histogram",
) -> None:
    negative_scores = pred_scores[y_true == 0].tolist()
    positive_scores = pred_scores[y_true == 1].tolist()

    config = {
        "document_title": "Histogram",
        "plot_config": {
            "title": title,
            "xAxisTitle": xaxis_title,
            "yAxisTitle": yaxis_title,
            "positiveScores": positive_scores,
            "negativeScores": negative_scores,
            "ImageFilename": image_filename,
        },
    }

    render_template(
        template="class_histogram/class-histogram.html",
        config=config,
        savepath=savepath,
    )
