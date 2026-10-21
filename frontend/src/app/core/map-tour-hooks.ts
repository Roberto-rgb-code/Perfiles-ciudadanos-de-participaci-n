import { ApplicationRef, Injectable, NgZone, inject } from '@angular/core';

export type MapPanelTab = 'colonia' | 'capas' | 'info';

type Hooks = {
  ensurePanel: (tab: MapPanelTab) => void;
  setLayer: (id: string) => void;
};

/** Puente entre el tour (Driver.js) y el mapa para abrir pestañas / capas. */
@Injectable({ providedIn: 'root' })
export class MapTourHooks {
  private zone = inject(NgZone);
  private appRef = inject(ApplicationRef);
  private hooks?: Hooks;

  register(h: Hooks) {
    this.hooks = h;
  }

  unregister(h?: Hooks) {
    if (!h || this.hooks === h) this.hooks = undefined;
  }

  ensurePanel(tab: MapPanelTab) {
    this.zone.run(() => {
      this.hooks?.ensurePanel(tab);
      this.appRef.tick();
    });
  }

  setLayer(id: string) {
    this.zone.run(() => {
      this.hooks?.setLayer(id);
      this.appRef.tick();
    });
  }
}
