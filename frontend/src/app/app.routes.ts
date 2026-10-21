import { Routes } from '@angular/router';
import { MapPageComponent } from './pages/map-page.component';
import { ProfilesPageComponent } from './pages/profiles-page.component';
import { StatsPageComponent } from './pages/stats-page.component';
import { CampaignsPageComponent } from './pages/campaigns-page.component';
import { MethodologyPageComponent } from './pages/methodology-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', component: MapPageComponent },
  { path: 'perfiles', component: ProfilesPageComponent },
  { path: 'stats', component: StatsPageComponent },
  { path: 'campanas', component: CampaignsPageComponent },
  { path: 'metodologia', component: MethodologyPageComponent },
  { path: '**', redirectTo: 'mapa' },
];
