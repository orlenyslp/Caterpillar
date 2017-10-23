import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { ModelerComponent } from 'app/modeler/modeler.component';
import { DashboardComponent } from 'app/dashboard/dashboard.component';
import { ViewerComponent } from 'app/viewer/viewer.component';
import { ProcessStorage } from 'app/data-store/data-store';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'modeler',  component: ModelerComponent },
  { path: 'viewer',  component: ViewerComponent },
  { path: 'dashboard',  component: DashboardComponent },
];

@NgModule({
  declarations: [
    ModelerComponent,
    DashboardComponent,
    ViewerComponent,
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(routes)
  ],
  exports: [
    RouterModule
  ],
  providers: [ProcessStorage],
  bootstrap: [AppComponent]
})
export class AppModule { }
