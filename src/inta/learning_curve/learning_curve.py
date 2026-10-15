"""Compute cross-validated learning curves and render interactive HTML plots."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, TypeVar

import numpy as np
from joblib import Parallel, delayed
from sklearn.model_selection import StratifiedKFold, train_test_split

from inta.template_renderer import render_template

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable, Sequence
    from os import PathLike

    from numpy.typing import ArrayLike, NDArray
    from scipy.sparse import csc_array, csc_matrix, csr_array, csr_matrix

# Five folds retain roughly 80% of each class. A 10% subset therefore needs
# 1 / (0.8 * 0.1) = 12.5 examples per class, rounded up to 13, to target one.
# For smaller classes, start at 20%. This is a conservative heuristic for the
# default five folds; very small classes can still produce invalid subsets.
MIN_CLASS_COUNT_FOR_TEN_PERCENT_SUBSET = 13
SMALL_CLASS_MIN_TRAINING_PROPORTION = 0.2

_FeatureMatrixT = TypeVar(
    "_FeatureMatrixT",
    "NDArray[Any]",
    "csr_matrix",
    "csc_matrix",
    "csr_array",
    "csc_array",
)
_ModelT = TypeVar("_ModelT")
_PredictionT = TypeVar("_PredictionT", bound="ArrayLike")


def _learning_curve_for_one_proportion(
    proportion: float,
    scores: _FeatureMatrixT,
    labels: NDArray[Any],
    *,
    train_fn: Callable[[_FeatureMatrixT, NDArray[Any]], _ModelT],
    predict_scores_fn: Callable[[_ModelT, _FeatureMatrixT], _PredictionT],
    metric: Callable[[NDArray[Any], _PredictionT], float],
    kf_splits: Sequence[tuple[NDArray[np.intp], NDArray[np.intp]]],
) -> tuple[np.float64, list[float], list[float]]:
    train_auc_scores = []
    val_auc_scores = []
    fold_train_sizes = []

    for train_idx, val_idx in kf_splits:
        # Use the nominal test subset for training: test_size rounds its size
        # up, whereas train_size would round down.
        X_train = scores[train_idx]
        y_train = labels[train_idx]
        if proportion < 1.0:
            _, X_train, _, y_train = train_test_split(
                X_train,
                y_train,
                test_size=proportion,
                random_state=42,
                stratify=y_train,
            )

        X_val = scores[val_idx]
        y_val = labels[val_idx]

        fold_train_sizes.append(len(y_train))

        # TODO: Update this to a object oriented approach
        clf = train_fn(X_train, y_train)
        train_auc = metric(y_train, predict_scores_fn(clf, X_train))
        val_auc = metric(y_val, predict_scores_fn(clf, X_val))

        train_auc_scores.append(train_auc)
        val_auc_scores.append(val_auc)

    mean_train_size = np.mean(fold_train_sizes)
    return mean_train_size, train_auc_scores, val_auc_scores


def get_learning_curve_data(
    scores: _FeatureMatrixT,
    labels: NDArray[Any],
    train_fn: Callable[[_FeatureMatrixT, NDArray[Any]], _ModelT],
    predict_scores_fn: Callable[[_ModelT, _FeatureMatrixT], _PredictionT],
    metric: Callable[[NDArray[Any], _PredictionT], float],
    *,
    nfolds: int = 5,
    proportions: Iterable[float] | None = None,
    n_jobs: int = -1,  # -1 = use all CPU cores
) -> tuple[list[np.float64], list[list[float]], list[list[float]]]:
    """
    Compute training and validation metrics across stratified learning curves.

    Parameters
    ----------
    scores : numpy.ndarray or scipy.sparse CSR or CSC matrix or array
        Feature data of shape ``(n_samples, n_features)``.
    labels : numpy.ndarray of shape (n_samples,)
        Class labels aligned with the rows of ``scores``.
    train_fn : callable
        Called as ``train_fn(training_features, training_labels)`` to create a
        fresh fitted model for each training subset and fold.
    predict_scores_fn : callable
        Called as ``predict_scores_fn(model, features)`` to produce predictions
        in the format expected by ``metric``.
    metric : callable
        Called as ``metric(true_labels, predictions)``. Must return one numeric
        score for each training or validation set.
    nfolds : int, optional
        Number of stratified cross-validation folds. Defaults to 5.
    proportions : iterable of float or None, optional
        Fractions of each fold's training data to use, in ``(0, 1]``. Defaults
        to 0.1 through 1.0 in steps of 0.1. Input order is preserved.
    n_jobs : int, optional
        Number of Joblib process workers. Defaults to -1 to use all available
        CPUs; use 1 for sequential execution.

    Returns
    -------
    train_sizes : list of numpy.float64
        Mean training-subset size across folds for each retained proportion.
    train_curve_data : list of list of float
        Training metrics, with one list of fold scores per retained proportion.
    val_curve_data : list of list of float
        Validation metrics in the same proportion and fold order.

    Notes
    -----
    All proportions use the same shuffled folds with random seed 42. Training
    subsets are also stratified and use that seed.

    If any class has fewer than 13 examples, proportions below 0.2 are removed.
    At least one proportion must remain. This heuristic is based on the default
    five folds and does not guarantee valid splits or scores for very small
    classes. The selected subsets must satisfy the model's and metric's class
    requirements; ROC AUC, for example, requires both binary classes.

    """
    if proportions is None:
        proportions = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

    # Pre-compute CV splits once so every worker sees the identical folds
    kf = StratifiedKFold(n_splits=nfolds, shuffle=True, random_state=42)
    kf_splits = list(kf.split(scores, labels))

    # Skip the smallest subsets when any class is scarce.
    _, counts = np.unique(labels, return_counts=True)
    if np.any(counts < MIN_CLASS_COUNT_FOR_TEN_PERCENT_SUBSET):
        proportions = [
            p for p in proportions if p >= SMALL_CLASS_MIN_TRAINING_PROPORTION
        ]

    results = Parallel(n_jobs=n_jobs, backend="loky")(
        delayed(_learning_curve_for_one_proportion)(
            proportion=prop,
            scores=scores,
            labels=labels,
            train_fn=train_fn,
            predict_scores_fn=predict_scores_fn,
            metric=metric,
            kf_splits=kf_splits,
        )
        for prop in proportions
    )

    # Unpack results preserving the order of `proportions`
    train_sizes, train_curve_data, val_curve_data = map(
        list, zip(*results, strict=True)
    )
    return train_sizes, train_curve_data, val_curve_data


def learning_curve(
    scores: _FeatureMatrixT,
    labels: NDArray[Any],
    train_fn: Callable[[_FeatureMatrixT, NDArray[Any]], _ModelT],
    predict_scores_fn: Callable[[_ModelT, _FeatureMatrixT], _PredictionT],
    metric: Callable[[NDArray[Any], _PredictionT], float],
    *,
    savepath: str | PathLike[str],
    image_filename: str = "learning_curve",
    title: str = "Learning Curve with Shaded AUC Bounds",
    xaxis_title: str = "Training Set Size",
    yaxis_title: str = "AUC Score",
    curve_name: str = "Validation AUC",
    fill_color: str = "rgba(255, 0, 0, 0.2)",
    marker_color: str = "rgba(255, 0, 0, 0.3)",
    nfolds: int = 5,
    proportions: Iterable[float] | None = None,
) -> None:
    """
    Save an interactive learning curve showing validation metrics across folds.

    Parameters
    ----------
    scores : numpy.ndarray or scipy.sparse CSR or CSC matrix or array
        Feature data of shape ``(n_samples, n_features)``.
    labels : numpy.ndarray of shape (n_samples,)
        Class labels aligned with the rows of ``scores``.
    train_fn : callable
        Called as ``train_fn(training_features, training_labels)`` to create a
        fresh fitted model for each training subset and fold.
    predict_scores_fn : callable
        Called as ``predict_scores_fn(model, features)`` to produce predictions
        in the format expected by ``metric``.
    metric : callable
        Called as ``metric(true_labels, predictions)`` to return one numeric
        score for each evaluated set.
    savepath : str or os.PathLike
        Destination HTML file. Its parent directory must already exist.
    image_filename : str, optional
        Base filename used when exporting an image from the plot.
    title : str, optional
        Plot title. The default describes AUC; change it for another metric.
    xaxis_title : str, optional
        Label for the mean training-subset size axis.
    yaxis_title : str, optional
        Label for the validation metric axis. Defaults to ``"AUC Score"``.
    curve_name : str, optional
        Legend label for the validation curve. Defaults to ``"Validation AUC"``.
    fill_color : str, optional
        CSS colour for the shading between the minimum and maximum fold scores.
    marker_color : str, optional
        CSS colour for individual fold-score markers.
    nfolds : int, optional
        Number of stratified cross-validation folds. Defaults to 5.
    proportions : iterable of float or None, optional
        Fractions of each fold's training data to use. Defaults to 0.1 through
        1.0 in steps of 0.1. See ``get_learning_curve_data`` for filtering rules
        and constraints on small classes.

    Notes
    -----
    The curve shows the mean validation score across folds. The shaded bounds
    show the minimum and maximum fold scores, rather than a confidence interval.
    Metrics other than AUC are supported through the callbacks and plot labels.

    """
    if proportions is None:
        proportions = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

    train_sizes, _, val_curve_data = get_learning_curve_data(
        scores=scores,
        labels=labels,
        train_fn=train_fn,
        predict_scores_fn=predict_scores_fn,
        metric=metric,
        nfolds=nfolds,
        proportions=proportions,
    )

    mean_scores = np.mean(val_curve_data, axis=1).tolist()
    min_scores = np.min(val_curve_data, axis=1).tolist()
    max_scores = np.max(val_curve_data, axis=1).tolist()

    config = {
        "document_title": "Learning Curve",
        "plot_config": {
            "trainSizes": np.array(train_sizes).tolist(),  # TODO:  Why?
            "meanScores": mean_scores,
            "minScores": min_scores,
            "maxScores": max_scores,
            "cvScores": np.array(val_curve_data).tolist(),  # TODO: why?
            "title": title,
            "xAxisTitle": xaxis_title,
            "yAxisTitle": yaxis_title,
            "curveName": curve_name,
            "fillColour": fill_color,
            "markerColour": marker_color,
            "imageFilename": image_filename,
        },
    }

    render_template(
        template="learning_curve/learning-curve.html",
        config=config,
        savepath=savepath,
    )
