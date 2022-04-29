/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { fakeAsync, flush, flushMicrotasks, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import {
    ApplicationStateService,
    ConfirmationDialogComponent,
    DebugMode,
    DialogResult,
    DialogService,
    Environment,
    ENVIRONMENT,
    MessagesService,
} from '@mq/common';
import { LoginOptions, OAuthErrorEvent, OAuthEvent, OAuthService, TokenResponse } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable, of, ReplaySubject } from 'rxjs';
import { filter, scan } from 'rxjs/operators';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LoggingService } from '@mq/common-interfaces';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthenticationService } from './authentication.service';
import { PrOAuthService } from './oauth.service';

describe('OAuthService', () => {
    let service: PrOAuthService;
    let oauthServiceMock: OAuthService;
    let dialogService: DialogService;

    const environment: Partial<Environment> = {
        production: false,
        oauth: {
            issuer: 'test',
            clientId: 'clientId',
        },
        routes: {
            authenticationModule: 'login',
        },
    };

    const routerMockEvents = new ReplaySubject<RouterEvent>(1);
    const routerMock = {
        // eslint-disable-next-line jasmine/no-unsafe-spy
        navigate: jasmine.createSpy('navigate'),
        events: routerMockEvents.asObservable(),
        url: environment.routes!.authenticationModule,
    };

    const mockDialogRef = { close: jasmine.createSpy('close') };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                RouterTestingModule,
                MatSnackBarModule,
                MatDialogModule,
                BrowserAnimationsModule,
            ],
            declarations: [ConfirmationDialogComponent],
            providers: [
                { provide: OAuthService, useClass: MockOauthService },
                { provide: ENVIRONMENT, useValue: environment },
                {
                    provide: ApplicationStateService,
                    useValue: { debugMode: of(DebugMode.none), showMenuAndHeader: true } as ApplicationStateService,
                },
                { provide: AuthenticationService, useValue: { isLoggedIn: () => false } },
                { provide: Router, useValue: routerMock },
                {
                    provide: LoggingService,
                    useValue: {},
                },
                { provide: MatDialogRef, useValue: mockDialogRef },
            ],
        });
        service = TestBed.inject(PrOAuthService);
        oauthServiceMock = TestBed.inject(OAuthService);
        dialogService = TestBed.inject(DialogService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // This service is mainly a wrapper for a library and therefore has very few tests.

    it('should subscribe to OAuth events', fakeAsync(() => {
        const eventSpy = spyOn(oauthServiceMock.events, 'subscribe').and.callThrough();
        createOauthService();

        expect(eventSpy).toHaveBeenCalled();
    }));

    it('should get all past events when you subscribe to allEvents$', fakeAsync(() => {
        const service = createOauthService();
        (oauthServiceMock as unknown as MockOauthService)._events.next({
            type: 'discovery_document_loaded',
        } as OAuthEvent);
        (oauthServiceMock as unknown as MockOauthService)._events.next({ type: 'silently_refreshed' } as OAuthEvent);
        (oauthServiceMock as unknown as MockOauthService)._events.next({ type: 'code_error' } as OAuthEvent);

        flushMicrotasks();
        let _events: OAuthEvent[] = [];
        service.allEvents$
            .pipe(scan((events: OAuthEvent[], newEvent) => [...events, newEvent], []))
            .subscribe((events) => (_events = [...events]));
        flushMicrotasks();

        expect(_events.length).toBe(3);
        expect(_events).toContain({ type: 'discovery_document_loaded' } as OAuthEvent);
        expect(_events).toContain({ type: 'silently_refreshed' } as OAuthEvent);
        expect(_events).toContain({ type: 'code_error' } as OAuthEvent);

        expectAsync(service.errors$.toPromise()).toBeResolvedTo({ type: 'code_error' } as OAuthErrorEvent);
    }));

    it('should NOT call initLogin when we are on the logout page', fakeAsync(() => {
        const initLoginSpy = spyOn(oauthServiceMock, 'loadDiscoveryDocumentAndLogin').and.callThrough();
        oauthServiceMock.postLogoutRedirectUri = window.location.href;
        createOauthService();

        expect(initLoginSpy).not.toHaveBeenCalled();
    }));

    it('should NOT subscribe to OAuth events if we do not have oauth configured', fakeAsync(() => {
        const oauth = environment.oauth;
        environment.oauth = undefined;

        const eventSpy = spyOn(oauthServiceMock.events, 'subscribe').and.callThrough();
        createOauthService();

        expect(eventSpy).not.toHaveBeenCalled();
        environment.oauth = oauth;
    }));

    it('Should return to login page after dialog is confirmed', fakeAsync(() => {
        const service = createOauthService();
        const openLoginWithPopupSpy = spyOn<any>(service, 'openLoginWithPopup');
        service.openRefreshSessionDialog();
        const confirmCloseDialogRef = { afterClosed: () => of(DialogResult.Confirm) } as MatDialogRef<any, any>;
        const spyOnOpenForm = spyOn(dialogService, 'confirm').and.returnValue(confirmCloseDialogRef);
        service.openRefreshSessionDialog();
        expect(spyOnOpenForm).toHaveBeenCalled();
        expect(openLoginWithPopupSpy).toHaveBeenCalled();
    }));

    it('Should return to login page after dialog is cancelled', fakeAsync(() => {
        const service = createOauthService();
        const openLoginWithPopupSpy = spyOn<any>(service, 'openLoginWithPopup');
        service.openRefreshSessionDialog();
        const confirmCloseDialogRef = { afterClosed: () => of(DialogResult.Cancel) } as MatDialogRef<any, any>;
        const spyOnOpenForm = spyOn(dialogService, 'confirm').and.returnValue(confirmCloseDialogRef);
        service.openRefreshSessionDialog();
        expect(spyOnOpenForm).toHaveBeenCalled();
        expect(openLoginWithPopupSpy).toHaveBeenCalled();
    }));

    function createOauthService() {
        const service = new PrOAuthService(
            oauthServiceMock,
            environment as Environment,
            TestBed.inject(Router),
            TestBed.inject(AuthenticationService),
            TestBed.inject(ApplicationStateService),
            TestBed.inject(LoggingService),
            TestBed.inject(MessagesService),
            TestBed.inject(DialogService)
        );
        routerMockEvents.next(
            new NavigationEnd(1, environment.routes!.authenticationModule, environment.routes!.authenticationModule)
        );
        flush();
        return service;
    }
});

/* eslint-disable @typescript-eslint/no-empty-interface, @typescript-eslint/ban-types */
interface IOAuthService extends OAuthService {}

// This mock can be used for any import of OAuthService which does not care about the OAuth functionality
export class MockOauthService implements Partial<IOAuthService> {
    _events = new BehaviorSubject<OAuthEvent | null>(null);
    events = this._events.asObservable().pipe(filter((v) => !!v)) as Observable<OAuthEvent>;

    postLogoutRedirectUri = 'window.location.href';

    loadDiscoveryDocumentAndLogin(_options?: LoginOptions): Promise<boolean> {
        return Promise.resolve(true);
    }

    initCodeFlow(_additionalState?: string, _params?: {}): void {
        return;
    }

    setupAutomaticSilentRefresh(
        _params?: object,
        _listenTo?: 'access_token' | 'id_token' | 'any',
        _noPrompt?: boolean
    ): void {
        return;
    }

    logOut(): void {
        return;
    }

    silentRefresh(_params?: object, _noPrompt?: boolean): Promise<OAuthEvent> {
        return Promise.resolve({} as OAuthEvent);
    }

    refreshToken(): Promise<TokenResponse> {
        return Promise.resolve({} as TokenResponse);
    }

    getAccessToken(): string {
        return 'some token';
    }

    hasValidAccessToken(): boolean {
        return true;
    }

    getIdentityClaims(): object {
        return {
            name: 'Fake name',
        };
    }
}
