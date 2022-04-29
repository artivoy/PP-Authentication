import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import { ENVIRONMENT, Environment } from '@mq/common';

@Component({
    selector: 'mq-logout',
    templateUrl: './logout.component.html',
    styleUrls: ['./logout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutComponent {
    constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {}

    public get loginUrl(): string {
        return this.environment.routes.authenticationModule;
    }
}
