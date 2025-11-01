import numpy as np
import plotly.graph_objects as go
from jinja2 import Environment, FileSystemLoader, PackageLoader, StrictUndefined


# TO DO: Get rid of the trace being at 0 before making open source.
def python_generate_box_plot_html(
    data_list, name_list, title, yaxis_title, xaxis_title
):
    fig = go.Figure()

    # A small colour palette. If data_list has more violins than this,
    # we'll cycle through the palette:
    fill_palette = [
        "rgba(0, 0, 255, 0.5)",
        "rgba(255, 0, 0, 0.5)",
        "rgba(0, 200, 0, 0.5)",
        "rgba(255, 165, 0, 0.5)",
        "rgba(128, 0, 128, 0.5)",
        "rgba(0, 255, 255, 0.5)",
    ]
    line_palette = ["blue", "red", "green", "orange", "purple", "cyan"]

    n = len(data_list)  # Number of violins

    # We will store each violin's *original* fill and line colours,
    # so we can restore them when toggling "Violin On":
    original_fillcolours = []
    original_linecolours = []

    for i, data in enumerate(data_list):
        fc = fill_palette[i % len(fill_palette)]  # pick fill colour
        lc = line_palette[i % len(line_palette)]  # pick line colour

        fig.add_trace(
            go.Box(
                y=data,
                name=name_list[i],
                fillcolor=fc,
                line_color=lc,
                boxpoints="all",
                marker={
                    "color": lc,
                    "line": {"color": "black", "width": 1},
                },
                hoverinfo="skip",
            )
        )

        original_fillcolours.append(fc)
        original_linecolours.append(lc)

    y_range = np.linspace(
        min([min(d) for d in data_list]) - 0.01,
        max([max(d) for d in data_list]) + 0.01,
        1000,
    )
    x_range = [0] * len(y_range)  # Dummy x-values for the invisible scatter trace
    fig.add_trace(
        go.Scatter(
            x=x_range,
            y=y_range,
            mode="lines",
            hoverinfo="y",  # Display only the y-value in hover info
            line={"color": "rgba(0,0,0,0)"},  # Make the line invisible
            showlegend=False,
        )
    )

    fig.update_layout(
        title=title,
        showlegend=True,
        xaxis={
            "title": xaxis_title,
            "range": [-0.5, n - 0.5],  # a half-unit margin on each side
            "autorange": False,
            "zeroline": False,
        },
        yaxis={
            "title": yaxis_title,
            "showspikes": True,  # Enable spikes on the y-axis
            "spikemode": "across+toaxis",  # Spike line across the plot and to the axis
            "spikecolor": "black",
            "spikethickness": 1,
            "hoverformat": ".4f",  # Display 4 decimal places in the hover labels
        },
        hovermode="y",  # Enable hover on the y-axis
    )

    return fig


def finalizer(v):
    if v is None:
        msg = "Encountered None where a value is required"
        raise ValueError(msg)
    return v


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

    environment = Environment(
        loader=PackageLoader("inta", "box_plot"),
        autoescape=True,
        undefined=StrictUndefined,
        finalize=finalizer,
        lstrip_blocks=True,
        trim_blocks=True,
    )
    template = environment.get_template("index.html")

    print(f"HTML file saved at: {savepath}")
