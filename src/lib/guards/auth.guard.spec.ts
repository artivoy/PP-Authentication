/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { TestBed } from '@angular/core/testing';

import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ApplicationStateService, ENVIRONMENT } from '@app/common';
import { OAuthService } from 'angular-oauth2-oidc';
import { LoggingService } from '@app/common-interfaces';
import { AuthenticationService } from '../services/authentication.service';
import { MockOauthService } from '../services/oauth.service.spec';
import { AuthGuard } from './auth.guard';

class MockRouterStateSnapshot {
    url: string;
}
describe('AuthGuard', () => {
    let guard: AuthGuard;
    let router: Router;
    let authService: AuthenticationService;
    const authRoute = 'testlogin';
    const authRoutePath = `/${authRoute}`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AuthGuard,
                { provide: ENVIRONMENT, useValue: { routes: { authenticationModule: authRoute } } },
                { provide: APP_NAME, useValue: 'mQ - Test' },
                { provide: APP_SHORT_NAME, useValue: 'Test' },
                { provide: OAuthService, useClass: MockOauthService },
                { provide: ApplicationStateService, useValue: {} },
                {
                    provide: LoggingService,
                    useValue: {},
                },
            ],
            imports: [
                RouterTestingModule.withRoutes([{ path: authRoute, component: {} as any }]),
                MatSnackBarModule,
                HttpClientModule,
                MatDialogModule,
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        });
        guard = TestBed.inject(AuthGuard);
        router = TestBed.inject(Router);
        authService = TestBed.inject(AuthenticationService);
    });

    it('should be created', () => {
        expect(guard).toBeTruthy();
    });

    describe('canActivate', () => {
        let mockRouterStateSnapshot;

        it('should return `true` for existing token and route no equal  (!==) `environment.routes.authentication`', async () => {
            spyOn(authService, 'isLoggedIn').and.resolveTo(true);
            const spyNavigation = spyOn(router, 'navigate').and.stub();
            mockRouterStateSnapshot = new MockRouterStateSnapshot();
            mockRouterStateSnapshot.url = '/';

            expect(await guard.canActivate(null, mockRouterStateSnapshot)).toEqual(true);
            expect(spyNavigation).not.toHaveBeenCalled();
        });

        it('should return `true` for no existing token and route equal (==) `environment.routes.authentication`', async () => {
            spyOn(authService, 'isLoggedIn').and.resolveTo(false);
            const spyNavigation = spyOn(router, 'navigate').and.stub();
            mockRouterStateSnapshot = new MockRouterStateSnapshot();
            mockRouterStateSnapshot.url = authRoutePath;

            expect(await guard.canActivate(null, mockRouterStateSnapshot)).toEqual(true);
            expect(spyNavigation).not.toHaveBeenCalled();
        });

        it('should return `false`, navigate to `environment.routes.authentication` with returnUrl', async () => {
            spyOn(authService, 'isLoggedIn').and.resolveTo(false);
            const spyNavigation = spyOn(router, 'navigate').and.stub();
            mockRouterStateSnapshot = new MockRouterStateSnapshot();
            mockRouterStateSnapshot.url = '/abc';

            expect(await guard.canActivate(null, mockRouterStateSnapshot)).toBeFalsy();
            expect(spyNavigation).toHaveBeenCalled();
            expect(spyNavigation).toHaveBeenCalledWith([authRoutePath], {
                queryParams: {
                    returnUrl: mockRouterStateSnapshot.url,
                },
            });
        });

        it('should return `false`, navigate to `environment.routes.authentication` withOut returnUrl', async () => {
            spyOn(authService, 'isLoggedIn').and.resolveTo(false);
            const spyNavigation = spyOn(router, 'navigate').and.stub();
            mockRouterStateSnapshot = new MockRouterStateSnapshot();
            mockRouterStateSnapshot.url = '/';

            expect(await guard.canActivate(null, mockRouterStateSnapshot)).toBeFalsy();
            expect(spyNavigation).toHaveBeenCalled();
            expect(spyNavigation).toHaveBeenCalledWith([authRoutePath], undefined);
        });

        it('should return `false`, navigate to `/` withOut returnUrl (have token)', async () => {
            spyOn(authService, 'isLoggedIn').and.resolveTo(true);
            const spyNavigation = spyOn(router, 'navigate').and.stub();
            mockRouterStateSnapshot = new MockRouterStateSnapshot();
            mockRouterStateSnapshot.url = authRoutePath;

            expect(await guard.canActivate(null, mockRouterStateSnapshot)).toBeFalsy();
            expect(spyNavigation).toHaveBeenCalled();
            expect(spyNavigation).toHaveBeenCalledWith(['/'], undefined);
        });

        it('should return `true`, navigate to `/login` with returnUrl (without token)', async () => {
            spyOn(authService, 'isLoggedIn').and.resolveTo(false);
            const spyNavigation = spyOn(router, 'navigate').and.stub();
            mockRouterStateSnapshot = new MockRouterStateSnapshot();
            mockRouterStateSnapshot.url = authRoutePath + '?returnUrl=abc';

            expect(await guard.canActivate(null, mockRouterStateSnapshot)).toBeTrue();
            expect(spyNavigation).not.toHaveBeenCalled();
        });
    });
});
