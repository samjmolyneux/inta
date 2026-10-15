"""Generate interactive HTML visualisations of Optuna optimisation studies."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING, NamedTuple

import numpy as np
import optuna
import plotly
from scipy.stats import rankdata

if TYPE_CHECKING:
    from collections.abc import Iterable
    from os import PathLike

standard_config = {
    "scrollZoom": False,
    "displayModeBar": True,
    "modeBarButtonsToRemove": [
        "zoom",
        "pan",
        "select",
        "lasso2d",
        "autoscale",
        "zoom2d",
        "zoomIn2d",
        "zoomOut2d",
        "resetScale2d",
    ],
    "modeBarButtonsToAdd": ["toImage"],
    "displaylogo": False,
}


def make_tick_labels_4f(tick_labels: Iterable[str]) -> list[str]:
    """
    Format parenthesized decimal values in tick labels to four decimal places.

    Parameters
    ----------
    tick_labels : iterable of str
        Labels optionally containing a decimal number in parentheses. The first
        matching number in each label supplies its replacement value.

    Returns
    -------
    list of str
        Labels in input order, with matching parenthesized numbers replaced by
        the formatted value. Labels without a match are unchanged.

    """
    pattern = re.compile(r"\(([-+]?[0-9]*\.?[0-9]+)\)")

    formatted = []
    for label in tick_labels:
        match = pattern.search(label)
        if match:
            num_str = match.group(1)
            formatted_num = f"{float(num_str):.4f}"
            new_s = pattern.sub(f"({formatted_num})", label)
            formatted.append(new_s)
        else:
            formatted.append(label)

    return formatted


def create_opt_history_html(study: optuna.Study, savepath: str | PathLike[str]) -> None:
    """
    Save an Optuna optimisation history plot as interactive HTML.

    Parameters
    ----------
    study : optuna.Study
        Single-objective study whose objective values will be plotted by trial
        number.
    savepath : str or os.PathLike
        Destination HTML file. Its parent directory must already exist.

    """
    fig = optuna.visualization.plot_optimization_history(study)

    fig.update_layout(dragmode=False)

    fig.update_layout(
        title={
            "text": "Optimisation History Plot",
            "x": 0.5,
            "xref": "paper",
            "yref": "paper",
            "xanchor": "center",
        },
    )

    fig.write_html(file=savepath, config=standard_config)


def create_param_importance_html(
    study: optuna.Study, savepath: str | PathLike[str]
) -> None:
    """
    Save an Optuna parameter importance plot as interactive HTML.

    Parameters
    ----------
    study : optuna.Study
        Single-objective study used by Optuna to estimate parameter importance.
        It must contain enough completed trials for the importance evaluator.
    savepath : str or os.PathLike
        Destination HTML file. Its parent directory must already exist.

    """
    fig = optuna.visualization.plot_param_importances(study)

    fig.update_layout(dragmode=False)

    fig.update_layout(
        title={
            "text": "Parameter Importance Plot",
            "x": 0.5,
            "xref": "paper",
            "yref": "paper",
            "xanchor": "center",
        },
    )

    fig.write_html(file=savepath, config=standard_config)


def create_timeline_html(study: optuna.Study, savepath: str | PathLike[str]) -> None:
    """
    Save an Optuna trial timeline as interactive HTML.

    Parameters
    ----------
    study : optuna.Study
        Study whose trial durations and states will be plotted.
    savepath : str or os.PathLike
        Destination HTML file. Its parent directory must already exist.

    """
    fig = optuna.visualization.plot_timeline(study)

    fig.update_layout(hovermode=False, dragmode=False)

    fig.update_layout(
        title={
            "text": "Timeline Plot",
            "x": 0.5,
            "xref": "paper",
            "yref": "paper",
            "xanchor": "center",
        },
    )

    fig.write_html(file=savepath, config=standard_config)


def create_all_optuna_plots(study: optuna.Study, save_dir: str | PathLike[str]) -> None:
    """
    Save the history, importance, timeline and parameter slice plots for a study.

    Parameters
    ----------
    study : optuna.Study
        Single-objective study suitable for all four plot types. See the
        individual plotting functions for their trial requirements.
    save_dir : str or os.PathLike
        Existing output directory. The summary plots are saved as
        ``opt_history.html``, ``param_importance.html`` and ``timeline.html``;
        each parameter slice is saved as ``<parameter>_slice_plot.html``.

    """
    create_opt_history_html(study, f"{save_dir}/opt_history.html")
    create_param_importance_html(study, f"{save_dir}/param_importance.html")
    create_timeline_html(study, f"{save_dir}/timeline.html")
    create_slice_plots_html(study, f"{save_dir}")


def create_slice_plots_html(
    study: optuna.Study,
    savepath: str | PathLike[str],
    yaxis_title: str = "ROC_AUC",
) -> None:
    """
    Save a parameter slice plot for each parameter, coloured by objective rank.

    Parameters
    ----------
    study : optuna.Study
        Single-objective study whose trials have numeric objective values.
    savepath : str or os.PathLike
        Existing output directory. Each plot is saved as
        ``<parameter>_slice_plot.html`` within this directory.
    yaxis_title : str, optional
        Label for the objective-value axis. Defaults to ``"ROC_AUC"``.

    Notes
    -----
    Colour assignment assumes trial numbers match positions in the retrieved
    trial list, and that Optuna's slice traces follow the same trial order.

    """
    # This assumes study.get_trials() returns trials in trial-number order
    # and that slice plots use the same order. If this breaks, check these
    # assumptions first.

    param_names: set[str] = set()
    for trial in study.trials:
        param_names.update(trial.params.keys())

    # Go through all trials, with the trial number.
    # Order them by the objective value
    # Map each trial to a color.
    # Draw the slice plot for a a param.
    # Then add the colors and color bar.

    trials = study.get_trials()
    objective_values = np.array([trial.value for trial in trials])

    # Get colour by rank for each trial and in the correct order
    colormap = "RdYlBu_r"
    colors = np.array(
        plotly.colors.sample_colorscale(
            colormap,
            len(trials),
        )
    )
    trial_ranks = rankdata(objective_values, method="average").astype(int) - 1
    colors = colors[trial_ranks]

    colourbar_tick_info = get_tick_info(objective_values)
    colourbar_tick_labels = make_tick_labels_4f(colourbar_tick_info.text)

    for param in param_names:
        fig = optuna.visualization.plot_slice(study, params=[param])

        # Get colours for each trial, assuming plot_slice uses trial-number order.
        # We could make this more robust by mapping the figure's y-values to
        # ranks and then using those ranks to choose colours.
        params_trial_numbers = np.array(
            [trial.number for trial in trials if param in trial.params]
        )
        params_trial_colors = colors[params_trial_numbers]

        fig.update_traces(
            marker={
                "color": params_trial_colors,
                "line": {"width": 0.5, "color": "Grey"},
                "colorbar": {
                    "thickness": 25,
                    "tickvals": colourbar_tick_info.coloridxs,
                    "ticktext": colourbar_tick_labels,
                    "tickfont": {"size": 10},
                    "title": "",
                    "xpad": 0,
                    "x": 1.06,
                    "xref": "paper",
                },
                "colorscale": "RdYlBu_r",
                "cmin": 0,
                "cmax": 1,
            },
        )

        fig.add_annotation(
            text="     Rank",
            x=1.06,
            y=1.09,
            xref="paper",
            yref="paper",
            showarrow=False,
            font={"size": 13, "color": "black"},
            xanchor="center",
        )

        fig.update_layout(
            title={
                "text": f"Slice Plot of {param}",
                "x": 0.5,
                "xref": "paper",
                "yref": "paper",
                "xanchor": "center",
            },
            yaxis={
                "title": yaxis_title,
            },
        )

        fig.update_layout(dragmode=False)

        fig.write_html(
            file=f"{savepath}/{param}_slice_plot.html", config=standard_config
        )


class TickInfo(NamedTuple):
    """
    Store colour-bar tick positions and their formatted objective-value labels.

    Attributes
    ----------
    coloridxs : list of float
        Normalized positions for the minimum, quartiles and maximum.
    text : list of str
        Labels pairing each quantile name with its objective value.

    """

    coloridxs: list[float]
    text: list[str]


def get_tick_info(target_values: np.ndarray) -> TickInfo:
    """
    Build colour-bar labels for the minimum, quartiles and maximum of values.

    Parameters
    ----------
    target_values : numpy.ndarray
        Non-empty, one-dimensional collection of finite objective values.

    Returns
    -------
    TickInfo
        Normalized tick positions at 0, 0.25, 0.5, 0.75 and 1, with labels
        containing the corresponding objective-value quantiles.

    """
    sorted_target_values = np.sort(target_values)
    coloridxs = [0, 0.25, 0.5, 0.75, 1]
    values = np.quantile(sorted_target_values, coloridxs)
    rank_text = ["min.", "25%", "50%", "75%", "max."]
    text = [f"{rank_text[i]} ({values[i]:3g})" for i in range(len(values))]
    return TickInfo(coloridxs=coloridxs, text=text)
