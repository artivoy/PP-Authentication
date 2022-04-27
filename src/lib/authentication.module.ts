import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthConfig, OAuthModuleConfig, OAuthStorage } from 'angular-oauth2-oidc';

// Angular material modules import
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// PinkRoccade Module

// Components
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ENVIRONMENT, MqCommonModule } from '@mq/common';
import { PermissionsModule } from '@mq/permissions';
import { AuthenticationRoutingModule } from './authentication-routing.module';
import { AuthenticationPageComponent } from './components/authentication-page/authentication-page.component';
import { AuthenticationComponent } from './components/authentication/authentication.component';
import { FastAuthenticationComponent } from './components/fast-authentication/fast-authentication.component';
import { PinCodeAuthorizationComponent } from './components/pin-code-authorization/pin-code-authorization.component';
import { PinCodeInformationComponent } from './components/pin-code-information/pin-code-information.component';
import { PinCodeSetupComponent } from './components/pin-code-setup/pin-code-setup.component';
import { ValidationErrorMessagesAuthDirective } from './directives/validation-error-messages-auth.directive';
import { oauthConfig, oauthModuleConfig } from './oauth.config';
import { LogoutComponent } from './components/logout/logout.component';
import { AuthenticationPageWrapperComponent } from './components/authentication-page-wrapper/authentication-page-wrapper.component';
import { PasswordComponent } from './components/password/password.component';
import { UsernameComponent } from './components/username/username.component';
import { AuthHelpComponent } from './components/auth-help/auth-help.component';
import { OAuthSplashScreenComponent } from './components/oauth-splash-screen/oauth-splash-screen.component';

@NgModule({
    declarations: [
        AuthenticationComponent,
        AuthenticationPageComponent,
        FastAuthenticationComponent,
        PinCodeSetupComponent,
        PinCodeInformationComponent,
        PinCodeAuthorizationComponent,
        ValidationErrorMessagesAuthDirective,
        LogoutComponent,
        AuthenticationPageWrapperComponent,
        PasswordComponent,
        UsernameComponent,
        AuthHelpComponent,
        OAuthSplashScreenComponent,
    ],
    imports: [
        CommonModule,
        MqCommonModule,
        AuthenticationRoutingModule,
        ReactiveFormsModule,

        // Material modules
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        MatCheckboxModule,
        MatSelectModule,
        MatTooltipModule,
        PermissionsModule,
    ],
    exports: [
        AuthenticationComponent,
        FastAuthenticationComponent,
        PinCodeSetupComponent,
        PinCodeInformationComponent,
        PinCodeAuthorizationComponent,
        PasswordComponent,
        UsernameComponent,
        AuthHelpComponent,
        OAuthSplashScreenComponent,
    ],
})
export class AuthenticationModule {
    // Use forRoot, otherwise the providers that are described here are not used in the app.module.ts file which breaks the OAuth token injection interceptor
    static forRoot(): ModuleWithProviders<AuthenticationModule> {
        return {
            ngModule: AuthenticationModule,
            providers: [
                { provide: OAuthModuleConfig, useFactory: oauthModuleConfig, deps: [ENVIRONMENT] },
                { provide: OAuthStorage, useValue: sessionStorage }, // sessionStorage or localStorage
                { provide: AuthConfig, useFactory: oauthConfig, deps: [ENVIRONMENT] },
            ],
        };
    }
}
