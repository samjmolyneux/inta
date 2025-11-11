import numpy as np
import plotly.figure_factory as ff
from sklearn.metrics import average_precision_score, roc_auc_score

from inta.template_renderer import render_template


def select_threshold_plot(
    true_y,
    pred_scores,
    savepath="select_threshold_plot.html",
):
    #  Assumes all negatives are 0
    #  TODO: Assert the above

    order = np.argsort(pred_scores)
    pred_scores = np.array(pred_scores)[order]
    true_y = np.array(true_y)[order]

    pos_pred_scores = pred_scores[true_y == 1]
    neg_pred_scores = pred_scores[true_y == 0]

    # generate the X_N, X_P and stuff here
    x_N, y_N = _get_density_curve_data([pred_scores[true_y == 0]])
    x_P, y_P = _get_density_curve_data([pred_scores[true_y == 1]])

    max_distribution_y = max(*y_N, *y_P)

    roc_auc = roc_auc_score(true_y, pred_scores)
    pr_auc = average_precision_score(true_y, pred_scores)

    n = len(true_y)
    n_pos = len(pos_pred_scores)
    gain_curve_xs = np.arange(n + 1) / n
    gain_curve_ys = np.concatenate([[0], np.cumsum(true_y[::-1])]) / n_pos

    min_score = pred_scores[0]
    max_score = pred_scores[-1]

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
            "thresholdBoundaries": [None, *pred_scores[::-1].tolist()],
            "posPredScores": pos_pred_scores.tolist(),
            "negPredScores": neg_pred_scores.tolist(),
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
