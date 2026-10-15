"""Render packaged Jinja templates to HTML with strict value checks."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, TypeVar

from jinja2 import Environment, PackageLoader, StrictUndefined

if TYPE_CHECKING:
    from collections.abc import Mapping
    from os import PathLike

_ValueT = TypeVar("_ValueT")


def finalizer(v: _ValueT | None) -> _ValueT:
    """
    Return a Jinja output value unchanged, rejecting ``None``.

    Parameters
    ----------
    v : object or None
        Value of a template expression before Jinja renders it as output.

    Returns
    -------
    object
        The original value when it is not ``None``.

    Raises
    ------
    ValueError
        If the value is ``None``.

    """
    if v is None:
        msg = "Encountered None where a value is required"
        raise ValueError(msg)
    return v


def render_template(
    template: str, config: Mapping[str, object], savepath: str | PathLike[str]
) -> None:
    """
    Render a packaged Jinja template and write it to a UTF-8 HTML file.

    Parameters
    ----------
    template : str
        Template path relative to the ``inta`` package directory.
    config : mapping of str to object
        Template context. Values passed through a template's JSON filter must
        be JSON serializable.
    savepath : str or os.PathLike
        Destination file. Its parent directory must already exist. An existing
        file is overwritten after the template renders successfully.

    Raises
    ------
    jinja2.TemplateNotFound
        If the named template or one of its dependencies cannot be found.
    jinja2.UndefinedError
        If rendering requires an undefined template variable.
    ValueError
        If a rendered expression passes ``None`` to ``finalizer``.
    OSError
        If the destination file cannot be opened or written.

    """
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
    with Path(savepath).open(mode="w", encoding="utf-8") as f:
        f.write(content)
