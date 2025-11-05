from inta.template_renderer import render_template


def positive_negative_scores_histogram_plot(
    y_true,
    pred_scores,
    savepath,
    title="Predicted Scores on Positive and Negative Test Datasets",
    xaxis_title="Predicted Score",
    yaxis_title="Count",
    image_filename="to-scale-pos-neg-histogram",
):
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
