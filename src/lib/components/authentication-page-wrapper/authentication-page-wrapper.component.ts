import { Component, OnInit, ChangeDetectionStrategy, Inject, Input, ViewEncapsulation } from '@angular/core';
import { APP_SHORT_NAME, ThemingService } from '@app/common';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'mq-authentication-page-wrapper',
    templateUrl: './authentication-page-wrapper.component.html',
    styleUrls: ['./authentication-page-wrapper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class AuthenticationPageWrapperComponent implements OnInit {
    @Input() public showLogo = true;

    public get appName() {
        return this.authService.appName;
    }

    constructor(
        @Inject(APP_SHORT_NAME) public appShortName: string,
        public authService: AuthenticationService,
        protected readonly theme: ThemingService
    ) {}

    ngOnInit() {
        this.theme.init();
    }
}
