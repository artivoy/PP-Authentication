import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'mqm-auth-help',
    templateUrl: './auth-help.component.html',
    styleUrls: ['./auth-help.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHelpComponent {
    @Input() pinCode = false;

    public loading$ = this.authService.loadingSubject;

    constructor(public authService: AuthenticationService) {}

    getPhonenumber(): Observable<string | undefined> {
        return this.authService.getPhonenumber();
    }
}
