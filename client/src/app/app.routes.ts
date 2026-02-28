import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { InventoryPage } from './pages/inventory/inventory.page';
import { EventPage } from './pages/event/event.page';
import { RestingPage } from './pages/resting/resting.page';
import { WinPage } from './pages/win/win.page';

export const routes: Routes = [
	{
		path: '',
		component: HomePage,
	},
	{
		path: 'inventory',
		component: InventoryPage,
	},
	{
		path: 'event',
		component: EventPage,
	},
	{
		path: 'resting',
		component: RestingPage,
	},
	{
		path: 'win',
		component: WinPage,
	},
	{
		path: '**',
		redirectTo: '',
	},
];
