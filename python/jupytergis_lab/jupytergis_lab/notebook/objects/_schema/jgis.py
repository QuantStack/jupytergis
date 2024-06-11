# generated by datamodel-codegen:
#   filename:  jgis.json
#   timestamp: 2024-06-11T14:06:29+00:00

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, RootModel


class JGISLayer(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    name: str
    visible: bool
    parameters: Optional[Dict[str, Any]] = None


class JGISLayers(RootModel[List[JGISLayer]]):
    root: List[JGISLayer] = Field(..., title='IJGISLayers')


class JGISOptions(BaseModel):
    pass
    model_config = ConfigDict(
        extra='forbid',
    )


class IJGISContent(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    layers: JGISLayers
    options: Optional[JGISOptions] = None
