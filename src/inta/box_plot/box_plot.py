"""Generate interactive HTML box plots for grouped numeric data."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import numpy as np

from inta.template_renderer import render_template

if TYPE_CHECKING:
    from collections.abc import Sequence
    from os import PathLike

    from numpy.typing import NDArray


def box_plot(
    data_by_box: Sequence[Sequence[float] | NDArray[Any]] | NDArray[Any],
    box_names: Sequence[str],
    *,
    title: str,
    xaxis_title: str,
    yaxis_title: str,
    image_filename: str = "box_plot",
    savepath: str | PathLike[str] = "box_plot.html",
) -> None:
    """
    Save an interactive box plot with one box per numeric group.

    Parameters
    ----------
    data_by_box : sequence of array-like or numpy.ndarray
        Non-empty numeric groups. Each group supplies the values for one box.
    box_names : sequence of str
        Labels for the boxes, in the same order as ``data_by_box``.
    title : str
        Plot title.
    xaxis_title : str
        Label for the horizontal axis.
    yaxis_title : str
        Label for the vertical axis.
    image_filename : str, optional
        Base filename used when exporting an image from the plot.
    savepath : str or os.PathLike, optional
        Destination HTML file. Its parent directory must already exist.

    """
    # Generate the invisible scatter trace to get hoverline
    invisible_y = np.linspace(
        min([min(d) for d in data_by_box]),
        max([max(d) for d in data_by_box]),
        1000,
    ).tolist()
    invisible_x = [0] * len(invisible_y)

    data_by_box = [np.array(box_data).tolist() for box_data in data_by_box]

    config = {
        "document_title": "Box Plot",
        "plot_config": {
            "dataList": data_by_box,
            "nameList": box_names,
            "title": title,
            "xAxisTitle": xaxis_title,
            "yAxisTitle": yaxis_title,
            "invisibleX": invisible_x,
            "invisibleY": invisible_y,
            "imageFilename": image_filename,
        },
    }

    render_template(
        template="box_plot/plot.html",
        config=config,
        savepath=savepath,
    )
