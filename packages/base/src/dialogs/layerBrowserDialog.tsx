import { faCheck, faPlus, faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  IDict,
  IJGISFormSchemaRegistry,
  IJGISLayer,
  IJGISLayerDocChange,
  IJGISSource,
  IJupyterGISModel,
  IRasterLayerGalleryEntry
} from '@jupytergis/schema';
import { Dialog } from '@jupyterlab/apputils';
import { UUID } from '@lumino/coreutils';
import React, { ChangeEvent, MouseEvent, useEffect, useState } from 'react';
import { RasterSourcePropertiesForm } from '../formbuilder';
import { deepCopy } from '../tools';

import CUSTOM_RASTER_IMAGE from '../../rasterlayer_gallery/custom_raster.png';

interface ILayerBrowserDialogProps {
  model: IJupyterGISModel;
  registry: IRasterLayerGalleryEntry[];
  formSchemaRegistry: IJGISFormSchemaRegistry;
  cancel: () => void;
}

export const LayerBrowserComponent = ({
  model,
  registry,
  formSchemaRegistry,
  cancel
}: ILayerBrowserDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<HTMLElement | null>();
  const [creatingCustomRaster, setCreatingCustomRaster] = useState(false);

  const [galleryWithCategory, setGalleryWithCategory] =
    useState<IRasterLayerGalleryEntry[]>(registry);

  const providers = [...new Set(registry.map(item => item.source.provider))];

  const filteredGallery = galleryWithCategory.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  );

  useEffect(() => {
    model.sharedModel.layersChanged.connect(handleLayerChange);

    return () => {
      model.sharedModel.layersChanged.disconnect(handleLayerChange);
    };
  }, []);

  /**
   * Track which layers are currently added to the map
   */
  const handleLayerChange = (_, change: IJGISLayerDocChange) => {
    // The split is to get rid of the 'Layer' part of the name to match the names in the gallery
    setActiveLayers(
      Object.values(model.sharedModel.layers).map(
        layer => layer.name.split(' ')[0]
      )
    );
  };

  const handleSearchInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const handleCategoryClick = (event: MouseEvent<HTMLSpanElement>) => {
    const categoryTab = event.target as HTMLElement;
    const sameAsOld = categoryTab.innerText === selectedCategory?.innerText;

    categoryTab.classList.toggle('jGIS-layer-browser-category-selected');
    selectedCategory?.classList.remove('jGIS-layer-browser-category-selected');

    const filteredGallery = sameAsOld
      ? registry
      : registry.filter(item =>
          item.source.provider?.includes(categoryTab.innerText)
        );

    setGalleryWithCategory(filteredGallery);
    setSearchTerm('');
    setSelectedCategory(sameAsOld ? null : categoryTab);
  };

  const handleCustomTileClick = () => {
    setCreatingCustomRaster(true);
  };

  /**
   * Add tile layer and source to model
   * @param tile Tile to add
   */
  const handleTileClick = (tile: IRasterLayerGalleryEntry) => {
    const sourceId = UUID.uuid4();

    const sourceModel: IJGISSource = {
      type: 'RasterSource',
      name: tile.name,
      parameters: tile.source
    };

    const layerModel: IJGISLayer = {
      type: 'RasterLayer',
      parameters: {
        source: sourceId
      },
      visible: true,
      name: tile.name + ' Layer'
    };

    model.sharedModel.addSource(sourceId, sourceModel);
    model.addLayer(UUID.uuid4(), layerModel);
  };

  if (creatingCustomRaster) {
    const schema = deepCopy(
      formSchemaRegistry.getSchemas().get('RasterSource')
    );
    if (!schema) {
      return;
    }

    // Inject name in schema
    schema['required'] = ['name', ...schema['required']];
    schema['properties'] = {
      name: { type: 'string', description: 'The name of the raster layer' },
      ...schema['properties']
    };

    const syncData = (props: IDict) => {
      const sharedModel = model.sharedModel;
      if (!sharedModel) {
        return;
      }

      const { name, ...parameters } = props;

      const sourceId = UUID.uuid4();

      const sourceModel: IJGISSource = {
        type: 'RasterSource',
        name,
        parameters
      };

      const layerModel: IJGISLayer = {
        type: 'RasterLayer',
        parameters: {
          source: sourceId
        },
        visible: true,
        name: name + ' Layer'
      };

      sharedModel.addSource(sourceId, sourceModel);
      model.addLayer(UUID.uuid4(), layerModel);
    };

    return (
      <div className="jGIS-customlayer-form">
        <RasterSourcePropertiesForm
          formContext="create"
          model={model}
          sourceData={{
            name: 'Custom Source',
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 24,
            minZoom: 0,
            attribution: '(C) OpenStreetMap contributors'
          }}
          schema={schema}
          syncData={syncData}
          cancel={cancel}
        />
      </div>
    );
  }

  return (
    <div className="jGIS-layer-browser-container">
      <div className="jGIS-layer-browser-header-container">
        <div className="jGIS-layer-browser-header">
          <h2 className="jGIS-layer-browser-header-text">Layer Browser</h2>
          <div className="jGIS-layer-browser-header-search-container">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearchInput}
              className="jGIS-layer-browser-header-search"
            />
          </div>
          <button className="jp-mod-reject jp-mod-styled" onClick={cancel}>
            <FontAwesomeIcon icon={faClose} />
          </button>
        </div>
        <div className="jGIS-layer-browser-categories">
          {providers.map(provider => (
            <span
              className="jGIS-layer-browser-category"
              onClick={handleCategoryClick}
            >
              {provider}
            </span>
          ))}
        </div>
      </div>
      <div className="jGIS-layer-browser-grid">
        <div
          className="jGIS-layer-browser-tile jGIS-layer-browser-custom-tile"
          onClick={() => handleCustomTileClick()}
        >
          <div className="jGIS-layer-browser-tile-img-container">
            <img className="jGIS-layer-browser-img" src={CUSTOM_RASTER_IMAGE} />
            <div className="jGIS-layer-browser-icon">
              <FontAwesomeIcon style={{ height: 20 }} icon={faPlus} />
            </div>
          </div>
          <div className="jGIS-layer-browser-text-container">
            <div className="jGIS-layer-browser-text-info">
              <h3 className="jGIS-layer-browser-text-header jGIS-layer-browser-text-general">
                Custom Raster Layer
              </h3>
            </div>
            <p className="jGIS-layer-browser-text-general jGIS-layer-browser-text-source">
              Create A Custom Raster Layer
            </p>
          </div>
        </div>
        {filteredGallery.map(tile => (
          <div
            className="jGIS-layer-browser-tile"
            onClick={() => handleTileClick(tile)}
          >
            <div className="jGIS-layer-browser-tile-img-container">
              <img className="jGIS-layer-browser-img" src={tile.thumbnail} />
              {activeLayers.indexOf(tile.name) === -1 ? (
                <div className="jGIS-layer-browser-icon">
                  <FontAwesomeIcon style={{ height: 20 }} icon={faPlus} />
                </div>
              ) : (
                <div className="jGIS-layer-browser-icon jGIS-layer-browser-added">
                  <FontAwesomeIcon style={{ height: 20 }} icon={faCheck} />
                  <p className="jGIS-layer-browser-text-general">Added!</p>
                </div>
              )}
            </div>
            <div className="jGIS-layer-browser-text-container">
              <div className="jGIS-layer-browser-text-info">
                <h3 className="jGIS-layer-browser-text-header jGIS-layer-browser-text-general">
                  {tile.name}
                </h3>
                {/* <p className="jGIS-layer-browser-text-general jGIS-layer-browser-text-description">
                  {tile.description}
                  placeholder
                </p> */}
              </div>
              <p className="jGIS-layer-browser-text-general jGIS-layer-browser-text-source">
                {tile.source.attribution}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface ILayerBrowserOptions {
  model: IJupyterGISModel;
  registry: IRasterLayerGalleryEntry[];
  formSchemaRegistry: IJGISFormSchemaRegistry;
}

export class LayerBrowserWidget extends Dialog<boolean> {
  constructor(options: ILayerBrowserOptions) {
    let cancelCallback: (() => void) | undefined = undefined;
    cancelCallback = () => {
      this.resolve(0);
    };

    const body = (
      <LayerBrowserComponent
        model={options.model}
        registry={options.registry}
        formSchemaRegistry={options.formSchemaRegistry}
        cancel={cancelCallback}
      />
    );

    super({ body, buttons: [Dialog.cancelButton(), Dialog.okButton()] });

    this.id = 'jupytergis::layerBrowser';

    // Override default dialog style
    this.addClass('jGIS-layerbrowser-FormDialog');
  }
}
