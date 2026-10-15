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
    train_fn: Callable[[_FeatureMatrixT, NDArray[Any]], _ModelT],
    predict_scores_fn: Callable[[_ModelT, _FeatureMatrixT], _PredictionT],
    metric: Callable[[NDArray[Any], _PredictionT], float],
    kf_splits: Sequence[tuple[NDArray[np.intp], NDArray[np.intp]]],
) -> tuple[np.float64, list[float], list[float]]:
    train_auc_scores = []
    val_auc_scores = []
    fold_train_sizes = []

    for train_idx, val_idx in kf_splits:
        # Take a proportion of the training folds
        # Train test split uses ceil of the test proportion, so need 13 of each class
        # To guarantee that we have one of each class in the 0.1 proportion
        # We are using the test size to determine the size of the training set
        # As a result we take the test from train_test_split and use it for training
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
    nfolds: int = 5,
    proportions: Iterable[float] | None = None,
    n_jobs: int = -1,  # -1 = use all CPU cores
) -> tuple[list[np.float64], list[list[float]], list[list[float]]]:
    if proportions is None:
        proportions = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

    # Pre-compute CV splits once so every worker sees the identical folds
    kf = StratifiedKFold(n_splits=nfolds, shuffle=True, random_state=42)
    kf_splits = list(kf.split(scores, labels))

    # We are handling the edge case where there are less than 13 of a class.
    _, counts = np.unique(labels, return_counts=True)
    if np.any(counts < 13):
        proportions = [p for p in proportions if p >= 0.2]

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
