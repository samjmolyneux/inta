"""Generate interactive classification threshold and gains plots."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal

import numpy as np
import plotly.figure_factory as ff
from scipy.stats import beta
from sklearn.metrics import average_precision_score, roc_auc_score

from inta.template_renderer import render_template

if TYPE_CHECKING:
    from collections.abc import Sequence
    from os import PathLike

    from numpy.typing import ArrayLike, NDArray

MAX_GAINS_POINTS = 10_000
RECALL_CONFIDENCE_LEVEL = 0.95


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
        If the inputs are not aligned one-dimensional arrays, scores are not
        finite, or ``y`` does not contain exactly the two labels 0 and 1.

    Notes
    -----
    The plot combines class score densities, a gains curve, threshold-dependent
    confusion counts, ROC AUC and average precision. The gains curve includes
    pointwise 95% exact binomial recall intervals, not a simultaneous band.

    """
    y = np.asarray(y)
    scores = np.asarray(scores, dtype=np.float64)
    if y.ndim != 1 or scores.ndim != 1 or len(y) != len(scores):
        msg = "y and scores must be one-dimensional arrays of the same length"
        raise ValueError(msg)
    if not np.isfinite(scores).all():
        msg = "scores must contain only finite values"
        raise ValueError(msg)
    if np.unique(y).tolist() != [0, 1]:
        msg = "y must be binary labels 0 and 1"
        raise ValueError(msg)

    order = np.argsort(scores)
    scores = scores[order]
    y = y[order]

    pos_scores = scores[y == 1]
    neg_scores = scores[y == 0]

    x_N, y_N = _get_density_curve_data([scores[y == 0]])
    x_P, y_P = _get_density_curve_data([scores[y == 1]])

    max_distribution_y = (
        max(float(np.max(y_N, initial=0)), float(np.max(y_P, initial=0))) or 1.0
    )

    roc_auc = roc_auc_score(y, scores)
    pr_auc = average_precision_score(y, scores)

    gain_curve_xs, gain_curve_ys, gain_curve_thresholds = compute_gains_data(y, scores)
    recall_lower, recall_upper = _get_gains_recall_intervals(
        gain_curve_ys, len(pos_scores)
    )

    min_score = scores[0]
    max_score = scores[-1]
    # Equal scores still need room on the axes and a usable threshold slider.
    score_range = max_score - min_score
    if score_range == 0:
        score_range = max(1.0, abs(float(min_score)))

    config = {
        "document_title": "Select Threshold",
        "slider_min": min_score - 0.01 * score_range,
        "slider_max": max_score + 0.01 * score_range,
        "slider_default": min_score + (max_score - min_score) / 2,
        "slider_step": score_range / 10000,
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
            "gainsRecallLower": recall_lower.tolist(),
            "gainsRecallUpper": recall_upper.tolist(),
            "minScore": min_score,
            "maxScore": max_score,
            "scoreRange": score_range,
            "maxDistributionY": max_distribution_y,
            "imageSavepath": image_savepath,
        },
    }

    render_template(
        template="select_threshold/select-threshold.html",
        config=config,
        savepath=savepath,
    )


def _get_gains_recall_intervals(
    recalls: NDArray[np.float64], positive_count: int
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Return pointwise Clopper-Pearson limits aligned with the gains curve.

    These are fixed-threshold binomial intervals, not a simultaneous confidence
    band or a guarantee for thresholds selected interactively on these labels.
    Use the same limits as the uncertainty demonstration, including when none
    or all of the observed positive examples have been found.
    """
    found = np.rint(recalls * positive_count).astype(np.int64)
    tail = (1 - RECALL_CONFIDENCE_LEVEL) / 2
    lower = np.zeros_like(recalls)
    upper = np.ones_like(recalls)
    has_found = found > 0
    has_missed = found < positive_count
    lower[has_found] = beta.ppf(
        tail, found[has_found], positive_count - found[has_found] + 1
    )
    upper[has_missed] = beta.ppf(
        1 - tail, found[has_missed] + 1, positive_count - found[has_missed]
    )
    return lower, upper


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

    Notes
    -----
    A class with fewer than two distinct scores has no density estimate. Return
    empty coordinates; the page explains this while keeping its counts usable.

    """
    values = np.asarray(data[0])
    if len(values) < 2 or np.ptp(values) == 0:
        return np.array([], dtype=np.float64), np.array([], dtype=np.float64)

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
    Each interior point includes every record tied at its score threshold.
    Only groups that increase recall are retained. If there are more than
    ``MAX_GAINS_POINTS`` such groups, they are downsampled by recall bins before
    the endpoints are added.

    """
    y_desc = y_asc[::-1]
    scores_desc = scores_asc[::-1]

    n = len(y_asc)
    found = np.cumsum(y_desc)
    n_pos = found[-1]
    group_ends = np.flatnonzero(np.r_[scores_desc[:-1] != scores_desc[1:], True])
    found_by_group = found[group_ends]
    positive_groups = np.diff(np.r_[0, found_by_group]) > 0
    positive_ends = group_ends[positive_groups]
    pos_proportions = (positive_ends + 1) / n
    pos_recalls = found[positive_ends] / n_pos
    pos_thresholds = scores_desc[positive_ends]

    # Downsample the interior points before adding the curve endpoints.
    if len(pos_recalls) > MAX_GAINS_POINTS:
        bin_edges = np.linspace(pos_recalls[0], 1, MAX_GAINS_POINTS)
        keep_indices = np.unique(np.searchsorted(pos_recalls, bin_edges))
        pos_recalls = pos_recalls[keep_indices]
        pos_proportions = pos_proportions[keep_indices]
        pos_thresholds = pos_thresholds[keep_indices]

    gain_curve_xs = np.concatenate(([0], pos_proportions, [1]))
    gain_curve_ys = np.concatenate(([0], pos_recalls, [1]))
    gains_thresholds: NDArray[np.object_] = np.empty(
        len(pos_thresholds) + 2, dtype=object
    )
    gains_thresholds[0] = gains_thresholds[-1] = None
    gains_thresholds[1:-1] = pos_thresholds

    return gain_curve_xs, gain_curve_ys, gains_thresholds
