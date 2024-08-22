import { IDict, IVectorLayer, IVectorTileSource } from '@jupytergis/schema';

import { ILayerProps, LayerPropertiesForm } from './layerform';
import { getSourceLayerNames } from '../../tools';
import { IChangeEvent } from '@rjsf/core';

/**
 * The form to modify a vector layer.
 */
export class VectorLayerPropertiesForm extends LayerPropertiesForm {
  private sourceLayers: string[] = [];
  private currentSourceUrl = '';
  protected currentFormData: IVectorLayer;

  constructor(props: ILayerProps) {
    super(props);

    this.fetchSourceLayers(this.props.sourceData as IVectorLayer | undefined);

    // If there is a source form attached, we listen to its changes
    if (this.sourceFormChangedSignal) {
      this.sourceFormChangedSignal.connect((sender, sourceData) => {
        if (this.props.sourceType === 'VectorTileSource') {
          this.fetchSourceLayers(
            this.currentFormData,
            sourceData as IVectorTileSource
          );
        }
      });
    }
  }

  protected onFormChange(e: IChangeEvent): void {
    super.onFormChange(e);

    // We only force update if we just updated the source
    if (this.currentSourceId === e.formData.source) {
      return;
    }

    const source = this.props.model.getSource(e.formData.source);
    if (!source || source.type !== 'VectorTileSource') {
      return;
    }

    this.fetchSourceLayers(
      this.currentFormData,
      source.parameters as IVectorTileSource
    );
  }

  protected processSchema(
    data: IVectorLayer | undefined,
    schema: IDict,
    uiSchema: IDict
  ) {
    super.processSchema(data, schema, uiSchema);

    uiSchema['color'] = {
      'ui:widget': 'color'
    };

    if (!data) {
      return;
    }

    // Show a dropdown for available sourceLayers if available
    // And automatically select one
    if (this.sourceLayers.length !== 0) {
      if (!data.sourceLayer) {
        data.sourceLayer = this.sourceLayers[0];
      }

      schema.properties.sourceLayer.enum = this.sourceLayers;
    }
  }

  private async fetchSourceLayers(
    data: IVectorLayer | undefined,
    sourceData?: IVectorTileSource
  ) {
    if (data && data.source) {
      this.currentSourceId = data.source;

      if (!sourceData) {
        const currentSource = this.props.model.getSource(data.source);

        if (!currentSource || currentSource.type !== 'VectorTileSource') {
          this.sourceLayers = [];
          this.forceUpdate();
          return;
        }

        sourceData = currentSource.parameters as IVectorTileSource;
      }

      if (this.currentSourceUrl !== sourceData.url) {
        this.currentSourceUrl = sourceData.url;

        try {
          this.sourceLayers = await getSourceLayerNames(
            sourceData.url,
            sourceData.urlParameters
          );
          this.forceUpdate();
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      this.currentSourceId = '';
      this.sourceLayers = [];
      this.forceUpdate();
    }
  }

  private currentSourceId: string;
}
