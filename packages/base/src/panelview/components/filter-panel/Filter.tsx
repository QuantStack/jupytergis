import {
  GeoJSONFeature1,
  IJGISFilterItem,
  IJupyterGISModel
} from '@jupytergis/schema';
import { Button, ReactWidget } from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import { cloneDeep } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { getSourceLayerNames } from '../../../tools';
import { IControlPanelModel } from '../../../types';
import { RightPanelWidget } from '../../rightpanel';
import FilterRow from './FilterRow';

/**
 * The filters panel widget.
 */
export class FilterPanel extends Panel {
  constructor(options: RightPanelWidget.IOptions) {
    super();
    this._model = options.model;

    this.id = 'jupytergis::layerTree';
    // this.addClass(LAYERS_PANEL_CLASS);

    this.addWidget(
      ReactWidget.create(
        <FilterComponent model={this._model}></FilterComponent>
      )
    );
  }

  private _model: IControlPanelModel | undefined;
}

interface IFilterComponentProps {
  model: IControlPanelModel;
}

const FilterComponent = (props: IFilterComponentProps) => {
  const featureStuffRef = useRef({});
  const [selectedLayer, setSelectedLayer] = useState('');
  const [filterRows, setFilterRows] = useState<IJGISFilterItem[]>([]);
  const [model, setModel] = useState<IJupyterGISModel | undefined>(
    props.model.jGISModel
  );
  const [featureStuff, setFeatureStuff] = useState<Record<string, Set<string>>>(
    {}
  );

  props.model?.documentChanged.connect((_, widget) => {
    setModel(widget?.context.model);
  });

  useEffect(() => {
    model?.clientStateChanged.connect(() => {
      if (!model?.localState?.selected?.value) {
        return;
      }

      // TODO: handle multi select better
      const currentLayer = Object.keys(model?.localState?.selected?.value)[0];
      setSelectedLayer(currentLayer);
    });

    model?.sharedOptionsChanged.connect((_, keys) => {
      if (keys.has('zoom')) {
        if (!model?.localState?.selected?.value) {
          return;
        }
        const currentLayer = Object.keys(model?.localState?.selected?.value)[0];

        // TODO: Probably want to debounce/throttle here
        buildFilterObject(currentLayer);
      }
    });
  }, [model]);

  useEffect(() => {
    // Reset filter stuff for new layer
    setFilterRows([]);
    setFeatureStuff({});
    buildFilterObject();
  }, [selectedLayer]);

  const buildFilterObject = async (currentLayer?: string) => {
    // setFilterRows([]);
    if (!model) {
      return;
    }
    const layer = model.getLayer(currentLayer ?? selectedLayer);
    const source = model.getSource(layer?.parameters?.source);
    const { latitude, longitude, zoom } = model.getOptions();

    if (!source || !layer) {
      return;
    }

    const aggregatedProperties: Record<string, Set<string>> = cloneDeep(
      featureStuffRef.current
    );

    switch (source.type) {
      case 'VectorTileSource': {
        const tile = await getSourceLayerNames(source?.parameters?.url, {
          latitude,
          longitude,
          zoom
        });
        const layerValue = tile.layers[layer.parameters?.sourceLayer];
        for (let i = 0; i < layerValue.length; i++) {
          const feature = layerValue.feature(i);
          Object.entries(feature.properties).forEach(([key, value]) => {
            if (!(key in aggregatedProperties)) {
              aggregatedProperties[key] = new Set();
            }
            aggregatedProperties[key].add(String(value));
          });
        }
        break;
      }
      case 'GeoJSONSource': {
        const data = await model?.readGeoJSON(source.parameters?.path);
        data?.features.forEach((feature: GeoJSONFeature1) => {
          feature.properties &&
            Object.entries(feature.properties).forEach(([key, value]) => {
              if (!(key in aggregatedProperties)) {
                aggregatedProperties[key] = new Set();
              }
              aggregatedProperties[key].add(String(value));
            });
        });
        break;
      }
      default: {
        break;
      }
    }

    // So when we open a map, filter object is empty
    // We want to populate it with the values from the
    // selected layers filter
    // And put them in our filter rows, so they appear in the panel
    if (layer.filters) {
      layer.filters.map(filterItem => {
        if (!(filterItem.feature in aggregatedProperties)) {
          aggregatedProperties[filterItem.feature] = new Set();
        }
        aggregatedProperties[filterItem.feature].add(
          String(featureStuff.value)
        );
      });

      setFilterRows([...filterRows, ...layer.filters]);
    }
    setFeatureStuff(aggregatedProperties);
  };

  useEffect(() => {
    featureStuffRef.current = featureStuff;
  }, [featureStuff]);

  useEffect(() => {
    console.log('filterRows', filterRows);
  }, [filterRows]);

  const addFilterRow = () => {
    const filterContainer = document.getElementById('filter-container');

    if (!filterContainer) {
      return;
    }
    filterContainer.style.display = 'flex';

    setFilterRows([
      ...filterRows,
      {
        feature: Object.keys(featureStuff)[0],
        operator: '==',
        value: [...Object.values(featureStuff)[0]][0]
      }
    ]);
  };

  const clearFilters = () => {
    setFilterRows([]);
    const layer = model?.getLayer(selectedLayer);
    if (!layer) {
      return;
    }
    layer.filters = [];
    model?.sharedModel.updateLayer(selectedLayer, layer);
  };

  const submitFilter = () => {
    const layer = model?.getLayer(selectedLayer);
    if (!layer) {
      return;
    }
    layer.filters = filterRows;
    model?.sharedModel.updateLayer(selectedLayer, layer);
  };

  return (
    <div className="jp-gis-filter-main">
      {selectedLayer && (
        <>
          <div id="filter-container" className="jp-gis-filter-select-container">
            {filterRows.map((row, index) => (
              <FilterRow
                key={index}
                index={index}
                features={featureStuff}
                filterRows={filterRows}
                setFilterRows={setFilterRows}
              />
            ))}
          </div>
          <div className="jp-gis-filter-button-container">
            <div style={{ justifyContent: 'flex-start' }}>
              <Button
                className="jp-Dialog-button jp-mod-accept jp-mod-styled"
                onClick={addFilterRow}
              >
                Add
              </Button>
              <Button
                className="jp-Dialog-button jp-mod-reject jp-mod-styled"
                onClick={clearFilters}
              >
                Clear
              </Button>
            </div>
            <Button
              className="jp-Dialog-button jp-mod-accept jp-mod-styled"
              onClick={submitFilter}
            >
              Submit
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterComponent;
