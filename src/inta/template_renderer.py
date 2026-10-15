"""Render packaged Jinja templates to HTML with strict value checks."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypeVar

from jinja2 import Environment, PackageLoader, StrictUndefined

if TYPE_CHECKING:
    from collections.abc import Mapping
    from os import PathLike

_ValueT = TypeVar("_ValueT")


def finalizer(v: _ValueT | None) -> _ValueT:
    if v is None:
        msg = "Encountered None where a value is required"
        raise ValueError(msg)
    return v


def render_template(
    template: str, config: Mapping[str, object], savepath: str | PathLike[str]
) -> None:
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
