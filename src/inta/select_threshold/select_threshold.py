"""Generate interactive classification threshold and gains plots."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal

import numpy as np
import plotly.figure_factory as ff
from sklearn.metrics import average_precision_score, roc_auc_score

from inta.template_renderer import render_template

if TYPE_CHECKING:
    from collections.abc import Sequence
    from os import PathLike

    from numpy.typing import ArrayLike, NDArray

MAX_GAINS_POINTS = 10_000


def select_threshold_plot(
    y: ArrayLike,
    scores: ArrayLike,
    savepath: str | PathLike[str] = "select-threshold-plot.html",
    image_savepath: str = "select-threshold-plot",
) -> None:
    """
    Save an interactive binary-classification threshold selection plot.

    Parameters
    ----------
    y : array-like of shape (n_samples,)
        True binary labels. Both classes, encoded as 0 and 1, must be present.
    scores : array-like of shape (n_samples,)
        Prediction scores aligned with ``y``. Larger scores must indicate a
        stronger prediction of the positive class.
    savepath : str or os.PathLike, optional
        Destination HTML file. Its parent directory must already exist.
    image_savepath : str, optional
        Base filename used when exporting an image from the plot.

    Raises
    ------
    ValueError
        If ``y`` does not contain exactly the two labels 0 and 1.

    Notes
    -----
    The plot combines class score densities, a gains curve, threshold-dependent
    confusion counts, ROC AUC and average precision.

    """
    if np.unique(y).tolist() != [0, 1]:
        msg = "y must be binary labels 0 and 1"
        raise ValueError(msg)

    order = np.argsort(scores)
    scores = np.array(scores)[order]
    y = np.array(y)[order]

    pos_scores = scores[y == 1]
    neg_scores = scores[y == 0]

    x_N, y_N = _get_density_curve_data([scores[y == 0]])
    x_P, y_P = _get_density_curve_data([scores[y == 1]])

    max_distribution_y = max(*y_N, *y_P)

    roc_auc = roc_auc_score(y, scores)
    pr_auc = average_precision_score(y, scores)

    gain_curve_xs, gain_curve_ys, gain_curve_thresholds = compute_gains_data(y, scores)

    min_score = scores[0]
    max_score = scores[-1]

    config = {
        "document_title": "Select Threshold",
        "slider_min": min_score - 0.01 * (max_score - min_score),
        "slider_max": max_score + 0.01 * (max_score - min_score),
        "slider_default": (max_score - min_score) / 2,
        "slider_step": (max_score - min_score) / 10000,
        "plot_config": {
            "xN": x_N.tolist(),
            "yN": y_N.tolist(),
            "xP": x_P.tolist(),
            "yP": y_P.tolist(),
            "rocAuc": roc_auc,
            "prAuc": pr_auc,
            "gainsThresholds": gain_curve_thresholds.tolist(),
            "posScores": pos_scores.tolist(),
            "negScores": neg_scores.tolist(),
            "xGains": gain_curve_xs.tolist(),
            "yGains": gain_curve_ys.tolist(),
            "minScore": min_score,
            "maxScore": max_score,
            "scoreRange": max_score - min_score,
            "maxDistributionY": max_distribution_y,
            "imageSavepath": image_savepath,
        },
    }

    render_template(
        template="select_threshold/select-threshold.html",
        config=config,
        savepath=savepath,
    )


def _get_density_curve_data(
    data: Sequence[ArrayLike], curve_type: Literal["kde", "normal"] = "kde"
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Compute density-curve coordinates using Plotly's distribution plot.

    Parameters
    ----------
    data: list containing a sequence of floats
        data of which the density curve will be computed
        e.g. list([0.5, 0.8, 0.6]) or [np.array([2.0, 5.8, 0.0])]
    curve_type: {'kde', 'normal'},  default=kde
        type of curve, either kernel density estimation or normal curve

    Returns
    -------
    x_dist_data: np.array
        array with x coordinates data for the density curve
    y_dist_data: np.array
        array with y coordinates data for the density curve

    """
    fig = ff.create_distplot(
        data,
        ["data"],
        show_hist=False,
        show_rug=False,
        curve_type=curve_type,
    )

    x_dist_data = np.array(fig["data"][0]["x"])
    y_dist_data = np.array(fig["data"][0]["y"])

    return x_dist_data, y_dist_data


def compute_gains_data(
    y_asc: NDArray[Any], scores_asc: NDArray[Any]
) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.object_]]:
    """
    Compute a gains curve from binary labels and scores sorted by score.

    Parameters
    ----------
    y_asc : numpy.ndarray of shape (n_samples,)
        Binary labels encoded as 0 and 1, with at least one positive example.
        Rows must be aligned with ``scores_asc`` in ascending score order.
    scores_asc : numpy.ndarray of shape (n_samples,)
        Prediction scores sorted in ascending order. Larger scores indicate a
        stronger prediction of the positive class.

    Returns
    -------
    gain_curve_xs : numpy.ndarray
        Fractions of all examples reviewed in descending score order, including
        the endpoints 0 and 1.
    gain_curve_ys : numpy.ndarray
        Fractions of positive examples found at the corresponding x positions,
        including the endpoints 0 and 1.
    gains_thresholds : numpy.ndarray of object
        Score thresholds at the interior curve points, with ``None`` at both
        endpoints. These align with the other two returned arrays.

    Notes
    -----
    Interior points are recorded at positive examples. If there are more than
    ``MAX_GAINS_POINTS`` such points, they are downsampled by recall bins before
    the endpoints are added.

    """
    y_desc = y_asc[::-1]
    pos_scores_asc = scores_asc[y_asc == 1]
    pos_scores_desc = pos_scores_asc[::-1]

    n = len(y_asc)
    proportions = (np.arange(n) + 1) / n

    n_pos = len(pos_scores_asc)
    recalls = np.cumsum(y_desc) / n_pos

    # Proportions and recalls increase as threshold decreases, so use y_desc
    pos_proportions = proportions[y_desc == 1]
    pos_recalls = recalls[y_desc == 1]
    pos_thresholds = pos_scores_desc

    # Downsample the interior points before adding the curve endpoints.
    if len(pos_recalls) > MAX_GAINS_POINTS:
        bin_edges = np.linspace(1 / MAX_GAINS_POINTS, 1, MAX_GAINS_POINTS)
        insert_indices = np.searchsorted(pos_recalls, bin_edges, side="right")

        # The code above gives us each idx we would place bin_edges into pos_recalls
        # to keep it sorted such that the bin_edge is placed to the right of any
        # duplicates. Therefore, each idx-1 is the last index in each bin.
        keep_indices = insert_indices - 1
        pos_recalls = pos_recalls[keep_indices]
        pos_proportions = pos_proportions[keep_indices]
        pos_thresholds = pos_thresholds[keep_indices]

    gain_curve_xs = np.concatenate(([0], pos_proportions, [1]))
    gain_curve_ys = np.concatenate(([0], pos_recalls, [1]))
    gains_thresholds = np.concatenate(([None], pos_thresholds, [None]))

    return gain_curve_xs, gain_curve_ys, gains_thresholds
