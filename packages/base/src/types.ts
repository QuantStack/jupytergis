import { ISignal } from '@lumino/signaling';
import {
  IJupyterGISModel,
  IJupyterGISDoc,
  IDict,
  IJupyterGISTracker,
  IJupyterGISWidget
} from '@jupytergis/schema';

export { IDict };
export type ValueOf<T> = T[keyof T];

export interface IControlPanelModel {
  disconnect(f: any): void;
  documentChanged: ISignal<IJupyterGISTracker, IJupyterGISWidget | null>;
  filePath: string | undefined;
  jGISModel: IJupyterGISModel | undefined;
  sharedModel: IJupyterGISDoc | undefined;
}
