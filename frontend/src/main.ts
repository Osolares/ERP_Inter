import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';

const routes: Routes = [
  { path: '', loadComponent: () => import('./app/features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'login', loadComponent: () => import('./app/features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'settings', loadComponent: () => import('./app/features/settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'admin', loadComponent: () => import('./app/features/admin/admin.component').then(m => m.AdminComponent) },
  { path: 'inventory', loadComponent: () => import('./app/features/inventory/inventory.component').then(m => m.InventoryComponent) },
  { path: 'inventory/products', loadComponent: () => import('./app/features/inventory-products.component').then(m => m.InventoryProductsComponent) },
  { path: 'inventory/lots', loadComponent: () => import('./app/features/inventory-lots.component').then(m => m.InventoryLotsComponent) },
  { path: 'inventory/categories', loadComponent: () => import('./app/features/inventory-categories.component').then(m => m.InventoryCategoriesComponent) },
  { path: 'inventory/attributes', loadComponent: () => import('./app/features/inventory-attributes.component').then(m => m.InventoryAttributesComponent) },
  { path: 'inventory/brands-models', loadComponent: () => import('./app/features/inventory-brands-models.component').then(m => m.InventoryBrandsModelsComponent) },
  { path: 'inventory/engine-series', loadComponent: () => import('./app/features/inventory-engine-series.component').then(m => m.InventoryEngineSeriesComponent) },
  { path: 'commercial', loadComponent: () => import('./app/features/commercial.component').then(m => m.CommercialComponent) },
  { path: 'commercial/facturacion', loadComponent: () => import('./app/features/commercial-documents.component').then(m => m.CommercialDocumentsComponent) },
  { path: 'commercial/salidas', loadComponent: () => import('./app/features/commercial-documents.component').then(m => m.CommercialDocumentsComponent) },
  { path: 'commercial/cotizaciones', loadComponent: () => import('./app/features/commercial-documents.component').then(m => m.CommercialDocumentsComponent) },
  { path: 'commercial/plantillas', loadComponent: () => import('./app/features/commercial-documents.component').then(m => m.CommercialDocumentsComponent) },
  { path: 'purchases', loadComponent: () => import('./app/features/purchases.component').then(m => m.PurchasesComponent) },
  { path: 'purchases/suppliers', loadComponent: () => import('./app/features/purchases.component').then(m => m.PurchasesComponent) },
  { path: 'financial', loadComponent: () => import('./app/features/financial.component').then(m => m.FinancialComponent) },
  { path: 'documents', loadComponent: () => import('./app/features/documents.component').then(m => m.DocumentsComponent) },
  { path: 'reports', loadComponent: () => import('./app/features/reports.component').then(m => m.ReportsComponent) },
  { path: 'operations', loadComponent: () => import('./app/features/operations.component').then(m => m.OperationsComponent) },
  { path: 'automotive', loadComponent: () => import('./app/features/automotive.component').then(m => m.AutomotiveComponent) },
  { path: 'multimedia', loadComponent: () => import('./app/features/multimedia.component').then(m => m.MultimediaComponent) },
  { path: 'smart-workspaces', loadComponent: () => import('./app/features/smart-workspace.component').then(m => m.SmartWorkspaceComponent) },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()]
}).catch(err => console.error(err));
