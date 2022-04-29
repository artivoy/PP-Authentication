import { Inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
    ApplicationStateService,
    ConfirmationDialogComponent,
    DebugMode,
    DialogService,
    Environment,
    ENVIRONMENT,
    MessagesService,
} from '@mq/common';
import { AuthConfig, OAuthErrorEvent, OAuthEvent, OAuthService } from 'angular-oauth2-oidc';
import { filter, startWith } from 'rxjs/operators';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ILoggingService, LoggingService } from '@mq/common-interfaces';
import { MatDialogRef } from '@angular/material/dialog';
import { oauthConfig, oauthIsConfigured } from '../oauth.config';
import { AuthenticationService } from './authentication.service';

@Injectable({
    providedIn: 'root',
})
export class PrOAuthService {
    readonly allEvents$: Subject<OAuthEvent> = new ReplaySubject<OAuthEvent>();
    readonly errors$: Observable<OAuthErrorEvent> = this.allEvents$.pipe(
        filter((event: OAuthEvent) => event instanceof OAuthErrorEvent)
    ) as Observable<OAuthErrorEvent>;
    private allEventsSubscription: Subscription | null = null;
    private subscriptionsForLogin: Subscription | null = null;
    private isInitialized = false;
    private confirmationDialogRef: MatDialogRef<ConfirmationDialogComponent, any> | null = null;

    constructor(
        private readonly oauthService: OAuthService,
        @Inject(ENVIRONMENT) private environment: Environment,
        private readonly router: Router,
        private readonly authService: AuthenticationService,
        private readonly applicationStateService: ApplicationStateService,
        @Inject(LoggingService) private readonly loggingService: ILoggingService,
        private readonly messagesService: MessagesService,
        protected dialogService: DialogService
    ) {
        this.subscribeToPageNavigationForInitialization();
    }

    subscribeToPageNavigationForInitialization() {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(async () => {
            if (this.isConfigured()) {
                this.sendPostmessageForTokenRefresh();
                if (!this.isInitialized) {
                    // This is a bit ugly, but required because if you subscribe to the events observable later, you might miss some events which can be errors. Therefore we need to add a subscribe here, which forwards all events to the allEvents replay subject. See MQAW-2926
                    this.oauthService.events.subscribe((event) => this.allEvents$.next(event));
                    if (!this.environment.production) {
                        this.oauthService.events.subscribe((event) => {
                            if (event instanceof OAuthErrorEvent) {
                                console.error('OAuthErrorEvent Object:', event);
                            } else {
                                console.log('OAuthEvent Object:', event);
                            }
                        });
                    }
                    this.isInitialized = true;
                }

                // Do not init the login on the logout page (use window.location.href since the router does not yet have the correct route loaded when this check is executed)
                if (this.oauthService.postLogoutRedirectUri !== window.location.href) {
                    this.initLogin();
                }
            }
        });
    }

    createAuthorizationHeader(): { Authorization?: string } {
        if (this.isConfigured()) {
            return { Authorization: `Bearer ${this.oauthService.getAccessToken()}` };
        } else {
            // When OAuth is not configured, there is nothing to return. So return an empty object that can be used in the spread operator.
            return {};
        }
    }

    private initLogin() {
        this.applicationStateService.debugMode
            .pipe(startWith(this.applicationStateService.debugMode))
            .subscribe(async (mode) => {
                if (mode === DebugMode.auth || mode === DebugMode.all) {
                    if (!this.allEventsSubscription) {
                        this.oauthService.configure(this.createOAuthConfig());
                        try {
                            await this.oauthService.loadDiscoveryDocument();
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } catch (e: any) {
                            this.loggingService.fatal(
                                `Discovery document could not be loaded: ${JSON.stringify(e)}`,
                                new Error(e)
                            );
                            this.messagesService.error(
                                'Something went wrong while loading the login page. The configuration is probably incorrect. Contact your management organization',
                                'Sluit'
                            );
                        }
                        console.warn(
                            'Authentication debugging is enabled, and tokens are automatically refreshed after 5% of their lifetime has expired.',
                            this.oauthService
                        );
                        this.allEventsSubscription = this.allEvents$.subscribe((event) => {
                            if (event instanceof OAuthErrorEvent) {
                                this.loggingService.error(`OAuthErrorEvent Object: ${JSON.stringify(event)}`);
                            } else {
                                this.loggingService.debug(`OAuthEvent Object: ${JSON.stringify(event)}`);
                            }
                        });
                    }
                }
            });
        if (!this.subscriptionsForLogin) this.subscriptionsForLogin = new Subscription();
        const sessionHasExpiredMessage = 'Your session has expired.';
        this.subscriptionsForLogin.add(
            this.oauthService.events.pipe(filter((event) => event.type === 'token_received')).subscribe(() => {
                // Reload the page if we are on the login page (the redirect url from OAuth)
                if (this.userIsOnLoginPage()) {
                    void this.redirectUserToApplication();
                }
                if (this.messagesService.getCurrentMessage()?.message === sessionHasExpiredMessage) {
                    this.messagesService.dismissLastMessage();
                }
            })
        );
        this.subscriptionsForLogin.add(
            this.oauthService.events.pipe(filter((event) => event.type === 'token_refresh_error')).subscribe((e) => {
                // Open the popup for refreshing only when the user is not on the login pages because in that case, the user can just use the sign-in form.
                if (this.isTokenRefreshError(e)) {
                    if (
                        !this.userIsOnLoginPage() &&
                        this.messagesService.getCurrentMessage()?.message !== sessionHasExpiredMessage
                    ) {
                        this.openRefreshSessionDialog();
                    } else {
                        this.loggingService.debug(
                            `Do not inform the user of their expired OAuth session. userIsOnLoginPage: ${this.userIsOnLoginPage()}. Current snackbar message: ${
                                this.messagesService.getCurrentMessage()?.message
                            }`
                        );
                    }
                } else {
                    this.loggingService.warn(`Unexpected token_refresh_error: ${JSON.stringify(e)}`);
                }
            })
        );
        if (!this.hasValidAccessToken() && !!this.authService.user) {
            this.loggingService.warn(
                'Running loadDiscoveryDocumentAndLogin without a valid token, but with a signed in user. This should not occur. The user might have to clear their cookies.'
            );
            this.messagesService.error(
                'An error has been detected in the status of your browser. Please delete your cookies and log in again.',
                'Ok'
            );
            return;
        }
        void this.oauthService.loadDiscoveryDocumentAndLogin();
        this.oauthService.setupAutomaticSilentRefresh();
    }

    redirectUserToApplication() {
        const returnUrl = this.router.routerState.snapshot.root.queryParams.returnUrl ?? '/';
        return this.router.navigate([returnUrl]);
    }

    isConfigured() {
        return oauthIsConfigured(this.environment) && this.applicationStateService.showMenuAndHeader;
    }

    logOut() {
        this.oauthService.logOut();
        this.subscriptionsForLogin?.unsubscribe();
        this.subscriptionsForLogin = null;
    }

    silentRefreshToken() {
        // This refresh is async with an Iframe
        return this.oauthService.silentRefresh();
    }

    refreshToken() {
        // This refresh is synchronous
        return this.oauthService.refreshToken();
    }

    hasAccessToken() {
        return !!this.oauthService.getAccessToken();
    }

    hasValidAccessToken() {
        return this.oauthService.hasValidAccessToken();
    }

    getIdentityClaims() {
        return this.oauthService.getIdentityClaims();
    }

    getUserName(): unknown {
        const claims: { name?: unknown } = this.oauthService.getIdentityClaims();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return claims?.name;
    }

    openRefreshSessionDialog() {
        this.confirmationDialogRef = this.dialogService.confirm(
            'Refresh your session',
            'Your session has expired for security reasons.',
            'Refresh your session',
            ''
        );

        this.confirmationDialogRef.afterClosed().subscribe(() => {
            // The user should always be send to logout even if they clicked away
            void this.openLoginWithPopup();
        });
    }

    openLoginWithPopup() {
        return this.oauthService.initLoginFlowInPopup().then((result) => {
            if (result) {
                this.messagesService.success('Your session has been refreshed.');
            }
        });
    }

    /**
     * This function is used to allow the application itself to be the target of silent refreshes (including refreshing tokens in a popup)
     */
    sendPostmessageForTokenRefresh() {
        // See silent-refresh.html in the angular-oidc-oauth2 library
        // noinspection RegExpRedundantEscape,RegExpDuplicateCharacterInClass
        const checks = [/[\?|&|#]code=/, /[\?|&|#]error=/, /[\?|&|#]token=/, /[\?|&|#]id_token=/];

        function isResponse(str: string) {
            if (!str) return false;
            for (let check of checks) {
                if (str.match(check)) return true;
            }
            return false;
        }

        const message = isResponse(location.hash) ? location.hash : '#' + location.search;
        if (!message) {
            return false;
        }
        (window.opener ?? window.parent).postMessage(message, location.origin);
        return true;
    }

    private createOAuthConfig(editedProperties?: AuthConfig) {
        const defaultConfig = oauthConfig(this.environment);
        let finalConfig = {
            ...defaultConfig,
            ...editedProperties,
        };

        const mode = this.applicationStateService.debugMode.value;
        if (mode === DebugMode.auth || mode === DebugMode.all) {
            finalConfig = {
                ...finalConfig,
                showDebugInformation: true,
                timeoutFactor: 0.05,
            };
        }
        return finalConfig;
    }

    private isTokenRefreshError(e: OAuthEvent) {
        const tokenRefreshError = 'invalid_grant';
        if (e instanceof OAuthErrorEvent) {
            if (e.reason instanceof HttpErrorResponse) {
                return e.reason.error.error === tokenRefreshError;
            }
            if (e.reason.hasOwnProperty('error')) {
                return (e.reason as { error: string }).error === tokenRefreshError;
            }
            return JSON.stringify(e.reason).includes(tokenRefreshError);
        }
        return false;
    }

    private userIsOnLoginPage() {
        return this.router.url.startsWith(`/${this.environment.routes.authenticationModule}`);
    }
}
