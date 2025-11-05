from jinja2 import Environment, PackageLoader, StrictUndefined


def finalizer(v):
    if v is None:
        msg = "Encountered None where a value is required"
        raise ValueError(msg)
    return v


def render_template(template, config, savepath):
    environment = Environment(
        loader=PackageLoader("inta", ""),
        autoescape=True,
        undefined=StrictUndefined,
        finalize=finalizer,
        lstrip_blocks=True,
        trim_blocks=True,
    )
    loaded_template = environment.get_template(template)

    content = loaded_template.render(config)
    with open(savepath, mode="w", encoding="utf-8") as f:
        f.write(content)
