import numpy as np
import plotly.figure_factory as ff
from sklearn.metrics import average_precision_score, roc_auc_score

from inta.template_renderer import render_template


def select_threshold_plot(
    y,
    scores,
    savepath="select_threshold_plot.html",
):
    assert np.unique(y).tolist() == [0, 1], "y must be binary labels 0 and 1"

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
        "plot_config": {
            "xN": x_N.tolist(),
            "yN": y_N.tolist(),
            "xP": x_P.tolist(),
            "yP": y_P.tolist(),
            "rocAuc": roc_auc,
            "prAuc": pr_auc,
            "gainsThresholds": gain_curve_thresholds.tolist(),
            "posPredScores": pos_scores.tolist(),
            "negPredScores": neg_scores.tolist(),
            "xGains": gain_curve_xs.tolist(),
            "yGains": gain_curve_ys.tolist(),
            "minScore": min_score,
            "maxScore": max_score,
            "scoreRange": max_score - min_score,
            "maxDistributionY": max_distribution_y,
        },
    }

    render_template(
        template="select_threshold/select-threshold.html",
        config=config,
        savepath=savepath,
    )


def _get_density_curve_data(data, curve_type="kde"):
    """
    Compute distribution data using plotly figure_factory distplot, to plot custom interactive density curve:

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


def compute_gains_data(y_asc, scores_asc):
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

    # Downsample to at most 10,000 points for performance
    if len(pos_recalls) > 10000:
        bin_edges = np.linspace(0.0001, 1, 10_000)
        insert_indices = np.searchsorted(pos_recalls, bin_edges, side="right")

        # The code above gives us each idx we would place bin_edges into pos_recalls
        # to keep it sorted such that the bin_edge is placed to the right of any
        # duplicates. Therefore, each idx-1 is the last index in each bin.
        keep_indices = insert_indices - 1
        pos_recalls = pos_recalls[keep_indices]
        pos_proportions = pos_proportions[keep_indices]
        pos_thresholds = pos_thresholds[keep_indices]

    gain_curve_xs = np.concatenate(([0], pos_proportions))
    gain_curve_ys = np.concatenate(([0], pos_recalls))
    gains_thresholds = np.concatenate(([None], pos_thresholds))

    return gain_curve_xs, gain_curve_ys, gains_thresholds
