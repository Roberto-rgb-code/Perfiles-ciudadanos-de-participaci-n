import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Perfil {
  cluster_id: number;
  slug: string;
  nombre: string;
  color: string;
  descripcion: string;
  n_colonias: number;
  pct_universo: number;
  metricas: Record<string, number>;
  estrategia: {
    mensaje: string;
    canales: string[];
    tono: string;
    acciones: string[];
  };
}

export interface PerfilesPayload {
  k: number;
  n_colonias: number;
  municipios: string[];
  features: string[];
  perfiles: Perfil[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  health() {
    return this.http.get<{ ok: boolean; universo: string }>(`${this.base}/health`);
  }

  perfiles(): Observable<PerfilesPayload> {
    return this.http.get<PerfilesPayload>(`${this.base}/perfiles`);
  }

  stats() {
    return this.http.get<any>(`${this.base}/stats`);
  }

  geojsonUrl() {
    return `${this.base}/geojson`;
  }
}
