import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticationPageComponent } from './components/authentication-page/authentication-page.component';
import { LogoutComponent } from './components/logout/logout.component';

const routes: Routes = [
    {
        path: '',
        component: AuthenticationPageComponent,
    },
    {
        path: 'logout',
        component: LogoutComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthenticationRoutingModule {}
