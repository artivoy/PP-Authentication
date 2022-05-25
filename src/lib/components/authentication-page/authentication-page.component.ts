import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnInit,
    Optional,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { APP_SHORT_NAME, Environment, ENVIRONMENT, ThemingService } from '@app/common';
import { shareReplay } from 'rxjs/operators';
import { EAuthenticationFormType } from '../../models/form-type';
import { AuthenticationService } from '../../services/authentication.service';
import { AuthenticationComponent } from '../authentication/authentication.component';
import { PrOAuthService } from '../../services/oauth.service';

@Component({
    selector: 'mq-authentication-page',
    templateUrl: './authentication-page.component.html',
    styleUrls: ['./authentication-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class AuthenticationPageComponent implements OnInit {
    @ViewChild(AuthenticationComponent, { static: false })
    public authenticationComponent: AuthenticationComponent | undefined;
    public get formView(): EAuthenticationFormType.login | EAuthenticationFormType {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return this.authService?.formView.value || EAuthenticationFormType.login;
    }
    public get appName() {
        return this.authService.appName;
    }

    public pinIsSet$ = this.authService.showPinLogin$.asObservable().pipe(shareReplay());
    get isOauthActive(): boolean {
        return this.oauthService.isConfigured();
    }

    constructor(
        @Inject(APP_SHORT_NAME) public appShortName: string,
        public readonly authService: AuthenticationService,
        public readonly oauthService: PrOAuthService,
        @Inject(ENVIRONMENT) private readonly environment: Environment,
        @Optional() protected readonly theme?: ThemingService
    ) {}

    ngOnInit() {
        this.theme?.init();
    }
}
