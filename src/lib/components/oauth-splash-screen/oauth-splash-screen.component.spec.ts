import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import { OAuthErrorEvent, OAuthService } from 'angular-oauth2-oidc';
import { runOnPushChangeDetection } from '@mq/common/testing';
import { ApplicationStateService, ConfirmationDialogComponent, DebugMode, ENVIRONMENT, Environment } from '@mq/common';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LoggingService } from '@mq/common-interfaces';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuthenticationService } from '../../services/authentication.service';
import { PrOAuthService } from '../../services/oauth.service';
import { MockOauthService } from '../../services/oauth.service.spec';
import { OAuthSplashScreenComponent } from './oauth-splash-screen.component';

describe('OAuthSplashScreenComponent', () => {
    let component: OAuthSplashScreenComponent;
    let fixture: ComponentFixture<OAuthSplashScreenComponent>;
    let mockOauthService: PrOAuthService;

    const mockDialogRef = { close: jasmine.createSpy('close') };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OAuthSplashScreenComponent, ConfirmationDialogComponent],
            imports: [RouterTestingModule, MatSnackBarModule, MatDialogModule],
            providers: [
                { provide: OAuthService, useClass: MockOauthService },
                { provide: ApplicationStateService, useValue: { debugMode: of(DebugMode.none) } },
                { provide: AuthenticationService, useValue: {} },
                {
                    provide: ENVIRONMENT,
                    useValue: {
                        production: true,
                        oauth: {
                            issuer: 'https://login.microsoftonline.com/1a29c0f7-8b77-4ba5-ad89-f78fc3db77e7/v2.0',
                            clientId: '7c84db59-3b0f-4276-ac80-58ac1af24b23',
                            scope: 'openid profile email offline_access api://7c84db59-3b0f-4276-ac80-58ac1af24b23/MQ',
                        },
                    } as Environment,
                },
                {
                    provide: LoggingService,
                    useValue: {},
                },
                { provide: MatDialogRef, useValue: mockDialogRef },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OAuthSplashScreenComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        mockOauthService = TestBed.inject(PrOAuthService);
    });

    function getParagraphs() {
        return fakeAsync(() => {
            runOnPushChangeDetection(fixture);
            flushMicrotasks();
            return fixture.debugElement.queryAll(By.css('p')).map((el) => el.nativeElement.innerHTML);
        })();
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show a splash message by default', () => {
        const paragraphs = getParagraphs();

        expect(paragraphs).toContain('U wordt automatisch ingelogd. Een ogenblik geduld a.u.b.');
        expect(paragraphs).toContain(
            'Als u niet automatisch wordt doorgestuurd, neem dan contact op met uw beheerorganisatie.'
        );

        expect(paragraphs).not.toContain('Er is een fout opgetreden bij het inloggen:');
    });

    it('should show the error_description if there is an error event in oauth', () => {
        mockOauthService.allEvents$.next(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            new OAuthErrorEvent('code_error', {}, { error_description: 'This is an error' })
        );

        const paragraphs = getParagraphs();

        expect(paragraphs).not.toContain('U wordt automatisch ingelogd. Een ogenblik geduld a.u.b.');
        expect(paragraphs).toContain('Er is een fout opgetreden bij het inloggen:');
        expect(paragraphs).toContain('This is an error');
    });

    it('should show the error type if there is an error in oauth without an error_description', () => {
        mockOauthService.allEvents$.next(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            new OAuthErrorEvent('code_error', {})
        );

        const paragraphs = getParagraphs();

        expect(paragraphs).not.toContain('U wordt automatisch ingelogd. Een ogenblik geduld a.u.b.');
        expect(paragraphs).toContain('Er is een fout opgetreden bij het inloggen:');
        expect(paragraphs).toContain('Fouttype: code_error.');
    });

    it('should show unknown error if the error does not have a type or error_description', () => {
        mockOauthService.allEvents$.next(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            new OAuthErrorEvent(null as any, {})
        );

        const paragraphs = getParagraphs();

        expect(paragraphs).not.toContain('U wordt automatisch ingelogd. Een ogenblik geduld a.u.b.');
        expect(paragraphs).toContain('Er is een fout opgetreden bij het inloggen:');
        expect(paragraphs).toContain('Onbekende fout.');
    });

    it('should show multiple errors, if there were multiple error events in oauth', () => {
        mockOauthService.allEvents$.next(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            new OAuthErrorEvent('code_error', {}, { error_description: 'This is an error 1' })
        );
        mockOauthService.allEvents$.next(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            new OAuthErrorEvent('code_error', {}, { error_description: 'This is an error 2' })
        );

        const paragraphs = getParagraphs();

        expect(paragraphs).not.toContain('U wordt automatisch ingelogd. Een ogenblik geduld a.u.b.');
        expect(paragraphs).toContain('Er is een fout opgetreden bij het inloggen:');
        expect(paragraphs).toContain('This is an error 1');
        expect(paragraphs).toContain('This is an error 2');
    });
});
