import {
  IJGISLayerBrowserRegistry,
  IRasterLayerGalleryEntry
} from '@jupytergis/schema';

export class JupyterGISLayerBrowserRegistry
  implements IJGISLayerBrowserRegistry
{
  private _registry: IRasterLayerGalleryEntry[];

  constructor() {
    this._registry = [];
  }

  getProviders(): IRasterLayerGalleryEntry[] {
    return [...this._registry];
  }

  registerProvider(data: IRasterLayerGalleryEntry): void {
    this._registry.push(data);
  }

  removeProvider(name: string): void {
    this._registry = this._registry.filter(item => item.name !== name);
  }

  clearRegistry(): void {
    this._registry = [];
  }
}
