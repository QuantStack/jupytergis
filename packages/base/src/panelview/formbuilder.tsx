import { SchemaForm } from '@deathbeds/jupyterlab-rjsf';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { IChangeEvent, ISubmitEvent } from '@rjsf/core';
import * as React from 'react';

import { IDict } from '../types';
import { IJupyterGISModel } from '@jupytergis/schema';

interface IStates {
  internalData?: IDict;
  schema?: IDict;
}
interface IProps {
  parentType: 'dialog' | 'panel';
  sourceData: IDict | undefined;
  filePath?: string;
  model: IJupyterGISModel;
  syncData: (properties: IDict) => void;
  syncSelectedField?: (
    id: string | null,
    value: any,
    parentType: 'panel' | 'dialog'
  ) => void;
  schema?: IDict;
  cancel?: () => void;
}

// Reusing the datalayer/jupyter-react component:
// https://github.com/datalayer/jupyter-react/blob/main/packages/react/src/jupyter/lumino/Lumino.tsx
export const LuminoSchemaForm = (
  props: React.PropsWithChildren<any>
): JSX.Element => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { children } = props;
  React.useEffect(() => {
    const widget = children as SchemaForm;
    try {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
      ref.current!.insertBefore(widget.node, null);
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    } catch (e) {
      console.warn('Exception while attaching Lumino widget.', e);
    }
    return () => {
      try {
        if (widget.isAttached || widget.node.isConnected) {
          Widget.detach(widget);
        }
      } catch (e) {
        console.warn('Exception while detaching Lumino widget.', e);
      }
    };
  }, [children]);
  return <div ref={ref} />;
};

export class ObjectPropertiesForm extends React.Component<IProps, IStates> {
  constructor(props: IProps) {
    super(props);
    const sourceData = { ...this.props.sourceData };
    this.processSourceData(sourceData);
    this.state = {
      internalData: sourceData,
      schema: props.schema
    };
  }

  setStateByKey = (key: string, value: any): void => {
    const floatValue = parseFloat(value);
    if (Number.isNaN(floatValue)) {
      return;
    }
    this.setState(
      old => ({
        ...old,
        internalData: { ...old.internalData, [key]: floatValue }
      }),
      () => this.syncData({ [key]: floatValue })
    );
  };

  componentDidUpdate(prevProps: IProps, prevState: IStates): void {
    if (prevProps.sourceData !== this.props.sourceData) {
      const sourceData = { ...this.props.sourceData };
      this.processSourceData(sourceData);
      this.setState(old => ({ ...old, internalData: sourceData }));
    }
  }

  protected processSchema(data: IDict<any> | undefined, schema: IDict) {
    // This is a no-op here
  }

  protected processUISchema(schema: IDict, uiSchema: IDict): void {
    if (!schema['properties']) {
      return;
    }

    Object.entries(schema['properties'] as IDict).forEach(([k, v]) => {
      uiSchema[k] = {};

      if (v['type'] === 'array') {
        // Remove array buttons
        uiSchema[k] = {
          'ui:options': {
            orderable: false,
            removable: false,
            addable: false
          },
          ...uiSchema[k]
        };
      }

      if (v['type'] === 'object') {
        this.processUISchema(v, uiSchema[k]);
      }

      // Don't show readOnly properties when coming from the properties panel
      if (v['readOnly'] && this.props.parentType === 'panel') {
        uiSchema[k] = {
          'ui:widget': 'hidden',
          ...uiSchema[k]
        };
      }
    });
  }

  protected syncData(properties: IDict<any>) {
    this.props.syncData(properties);
  }

  protected processSourceData(sourceData: IDict<any>) {
    // This is a no-op here
  }

  protected onFormChange(e: IChangeEvent) {
    // This is a no-op here
  }

  private generateUiSchema(schema: IDict): IDict {
    const uiSchema = {
      additionalProperties: {
        'ui:label': false,
        classNames: 'jGIS-hidden-field'
      }
    };
    this.processUISchema(schema, uiSchema);
    return uiSchema;
  }

  private onFormSubmit = (e: ISubmitEvent<any>): void => {
    const internalData = { ...this.state.internalData };
    Object.entries(e.formData).forEach(([k, v]) => (internalData[k] = v));
    this.setState(
      old => ({
        ...old,
        internalData
      }),
      () => {
        this.syncData(e.formData);
        this.props.cancel && this.props.cancel();
      }
    );
  };

  render(): React.ReactNode {
    if (this.props.schema) {
      const schema = { ...this.props.schema, additionalProperties: true };
      const formData = this.state.internalData;
      this.processSchema(formData, schema);

      const submitRef = React.createRef<HTMLButtonElement>();

      const formSchema = new SchemaForm(schema, {
        liveValidate: true,
        formData,
        onChange: this.onFormChange.bind(this),
        onSubmit: this.onFormSubmit.bind(this),
        onFocus: (id, value) => {
          this.props.syncSelectedField
            ? this.props.syncSelectedField(id, value, this.props.parentType)
            : null;
        },
        onBlur: (id, value) => {
          this.props.syncSelectedField
            ? this.props.syncSelectedField(null, value, this.props.parentType)
            : null;
        },
        uiSchema: this.generateUiSchema(this.props.schema),
        children: (
          <button ref={submitRef} type="submit" style={{ display: 'none' }} />
        )
      });
      return (
        <div
          className="jGIS-property-panel"
          data-path={this.props.filePath ?? ''}
        >
          <div className="jGIS-property-outer">
            <LuminoSchemaForm>{formSchema}</LuminoSchemaForm>
          </div>
          <div className="jGIS-property-buttons">
            {this.props.cancel ? (
              <button
                className="jp-Dialog-button jp-mod-reject jp-mod-styled"
                onClick={this.props.cancel}
              >
                <div className="jp-Dialog-buttonLabel">Cancel</div>
              </button>
            ) : null}

            <button
              className="jp-Dialog-button jp-mod-accept jp-mod-styled"
              onClick={() => submitRef.current?.click()}
            >
              <div className="jp-Dialog-buttonLabel">Submit</div>
            </button>
          </div>
        </div>
      );
    }
  }
}

export class LayerPropertiesForm extends ObjectPropertiesForm {
  protected processSourceData(sourceData: IDict<any>) {
    // Replace the source id by its name in the form
    sourceData.source = this.props.model.getSource(sourceData.source)?.name;
  }

  protected syncData(properties: IDict<any>): void {
    // Replace selected source name by its id
    const sources = this.props.model.getSources();
    if (!sources) {
      throw Error('Unreachable');
    }

    for (const source of Object.keys(sources)) {
      if (sources[source].name === properties.source) {
        properties.source = source;
        break;
      }
    }

    super.syncData(properties);
  }

  protected processSchema(
    data: IDict<any> | undefined,
    schema: IDict<any>
  ): void {
    super.processSchema(data, schema);

    // Replace the source text box by a dropdown menu
    const sourceNames: string[] = [];
    for (const sourceId of Object.keys(this.props.model.getSources() || {})) {
      const source = this.props.model.getSource(sourceId);
      if (source) {
        sourceNames.push(source.name);
      }
    }

    if (schema.properties.source) {
      schema.properties.source.enum = sourceNames;
    }
  }
}

export class RasterSourcePropertiesForm extends ObjectPropertiesForm {
  protected processSchema(data: IDict<any> | undefined, schema: IDict) {
    super.processSchema(data, schema);

    if (!schema.properties || !data || !data.urlParameters) {
      return;
    }

    // Dynamically inject url parameters schema
    const propertiesSchema = {};
    schema.properties.urlParameters = {
      type: 'object',
      required: Object.keys(data.urlParameters),
      properties: propertiesSchema
    };
    for (const parameterName of Object.keys(data.urlParameters)) {
      switch (parameterName) {
        case 'time':
          propertiesSchema[parameterName] = {
            type: 'string',
            format: 'date'
          };
          break;
        case 'variant':
          propertiesSchema[parameterName] = {
            type: 'string'
          };
          break;
        case 'format':
          propertiesSchema[parameterName] = {
            type: 'string'
          };
          break;
      }
    }
  }

  protected onFormChange(e: IChangeEvent) {
    // TODO
  }
}
