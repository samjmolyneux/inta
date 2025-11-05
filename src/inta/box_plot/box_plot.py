import numpy as np

from inta.template_renderer import render_template


def box_plot(
    data_by_box,
    box_names,
    title,
    xaxis_title,
    yaxis_title,
    image_filename="box_plot",
    savepath="box_plot.html",
):
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
