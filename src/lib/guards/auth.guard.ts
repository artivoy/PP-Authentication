/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Environment, ENVIRONMENT } from '@mq/common';
import { MessagesService } from '@mq/common';
import { AuthenticationService } from '../services/authentication.service';
import { PrOAuthService } from '../services/oauth.service';

@Injectable({
    providedIn: 'root',
})
export class AuthGuard implements CanActivate {
    constructor(
        private readonly authService: AuthenticationService,
        private readonly oauthService: PrOAuthService,
        private readonly router: Router,
        private readonly messagesService: MessagesService,
        @Inject(ENVIRONMENT) private readonly environment: Environment
    ) {}
    async canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
        const authRoutePath = `/${this.environment.routes.authenticationModule}`;
        const shouldBeLoggedIn = !state.url.startsWith(authRoutePath);
        let isLoggedIn = await this.authService.isLoggedIn();

        if (shouldBeLoggedIn === false && isLoggedIn === false) {
            return true;
        }

        if (shouldBeLoggedIn === true && isLoggedIn === true) {
            return true;
        }

        // We are logged in, so we should navigate to the returnUrl if given
        if (isLoggedIn === true && state.root?.queryParams.returnUrl) {
            this.router.navigate([state.root.queryParams.returnUrl]);
            return false;
        }

        if (shouldBeLoggedIn === false && isLoggedIn === true && state.url === `${authRoutePath}/logout`) {
            return true;
        }

        if (this.oauthService.isConfigured() && this.oauthService.hasValidAccessToken()) {
            return true;
        }

        const navigateToRoute = state.url === authRoutePath ? '/' : authRoutePath;
        this.messagesService.dismissLastMessage();
        const extras = !['/', authRoutePath].includes(state.url)
            ? {
                  queryParams: {
                      returnUrl: state.url,
                  },
              }
            : undefined;
        this.router.navigate([navigateToRoute], extras);

        return false;
    }
}
