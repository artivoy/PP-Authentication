import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, NgZone } from '@angular/core';
import { delay, distinctUntilChanged, filter, map, scan, shareReplay } from 'rxjs/operators';
import { OAuthErrorEvent } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { PrOAuthService } from '../../services/oauth.service';

@Component({
    selector: 'mq-oauth-splash-screen',
    templateUrl: './oauth-splash-screen.component.html',
    styleUrls: ['./oauth-splash-screen.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthSplashScreenComponent implements OnInit, OnDestroy {
    oauthErrors$?: Observable<string[]>;
    showRefreshButton$ = new BehaviorSubject<boolean>(false);
    private subscriptions = new Subscription();
    private retries = 0;
    constructor(private oauthService: PrOAuthService, private router: Router, private ngZone: NgZone) {}

    ngOnInit() {
        this.oauthErrors$ = this.oauthService?.errors$.pipe(
            map(this.processErrorEvent),
            scan((errors: string[], newErrorMessage: string) => [...errors, newErrorMessage], []),
            shareReplay()
        );
        this.subscriptions.add(
            this.oauthService.allEvents$.pipe(filter((event) => event.type === 'token_received')).subscribe(() => {
                this.ngZone.run(() => {
                    void this.redirectToApplication();
                });
            })
        );
        this.subscriptions.add(
            this.showRefreshButton$.pipe(distinctUntilChanged(), delay(3000)).subscribe(() => {
                this.showRefreshButton$.next(true);
            })
        );
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    processErrorEvent(event: OAuthErrorEvent) {
        if (event.params?.hasOwnProperty('error_description')) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            return (event.params as { error_description: string }).error_description;
        } else if (event.type) {
            return `Event type: ${event.type}.`;
        } else {
            return 'Unknown error.';
        }
    }

    async refresh() {
        this.retries++;
        if (this.retries > 2) {
            document.location.reload();
        } else {
            this.showRefreshButton$.next(false);
            await this.oauthService.refreshToken();
            await this.redirectToApplication();
        }
    }

    async redirectToApplication() {
        const returnUrl = this.router.routerState.snapshot.root.queryParams.returnUrl ?? '/';
        await this.router.navigate([returnUrl]);
    }
}
