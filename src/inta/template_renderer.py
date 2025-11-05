from jinja2 import Environment, PackageLoader, StrictUndefined


def finalizer(v):
    if v is None:
        msg = "Encountered None where a value is required"
        raise ValueError(msg)
    return v


def render_template(plot_type, config, savepath):
    config["plot_type"] = plot_type

    environment = Environment(
        loader=PackageLoader("inta", ""),
        autoescape=True,
        undefined=StrictUndefined,
        finalize=finalizer,
        lstrip_blocks=True,
        trim_blocks=True,
    )
    template = environment.get_template(f"{plot_type}/plot.html")

    content = template.render(config)
    with open(savepath, mode="w", encoding="utf-8") as f:
        f.write(content)
