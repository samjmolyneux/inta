import numpy as np
import plotly.figure_factory as ff
from sklearn.metrics import average_precision_score, roc_auc_score

from inta.template_renderer import render_template


def select_threshold_plot(
    true_y,
    pred_scores,
    savepath="select_threshold_plot.html",
):
    # generate the X_N, X_P and stuff here
    x_N, y_N = _get_density_curve_data([pred_scores[true_y == 0]])
    x_P, y_P = _get_density_curve_data([pred_scores[true_y == 1]])

    roc_auc = roc_auc_score(true_y, pred_scores)
    pr_auc = average_precision_score(true_y, pred_scores)

    pred_scores = pred_scores.tolist()
    true_y = true_y.tolist()

    x_N = x_N.tolist()
    y_N = y_N.tolist()
    x_P = x_P.tolist()
    y_P = y_P.tolist()

    config = {
        "document_title": "Select Threshold",
        "min_score": min(pred_scores),
        "max_score": max(pred_scores),
        "middle_score": (min(pred_scores) + max(pred_scores)) / 2,
        "plot_config": {
            "xN": x_N,
            "yN": y_N,
            "xP": x_P,
            "yP": y_P,
            "rocAuc": roc_auc,
            "prAuc": pr_auc,
            "predScores": pred_scores,
            "trueY": true_y,
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
