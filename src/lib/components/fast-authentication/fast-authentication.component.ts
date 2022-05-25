import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { LastLoginService, MessagesService } from '@app/common';
import { AuthenticationService } from '../../services/authentication.service';
import { DeviceService } from '../../services/device.service';
import { AuthenticationComponent } from '../authentication/authentication.component';

@Component({
    selector: 'mq-fast-authentication',
    templateUrl: './fast-authentication.component.html',
    styleUrls: ['./fast-authentication.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class FastAuthenticationComponent extends AuthenticationComponent implements OnInit, OnDestroy {
    @Input() redirectOnIsLoggedIn = false;

    public pinIsSet$ = this.authService.showPinLogin$.asObservable();

    constructor(
        _authService: AuthenticationService,
        _messagesService: MessagesService,
        _deviceService: DeviceService,
        _formBuilder: FormBuilder,
        _router: Router,
        _route: ActivatedRoute,
        _lastLoginService: LastLoginService,
        _dialog: MatDialog,
        @Optional() _dialogRef?: MatDialogRef<AuthenticationComponent>
    ) {
        super(
            _authService,
            _messagesService,
            _deviceService,
            _formBuilder,
            _router,
            _route,
            _lastLoginService,
            _dialog,
            _dialogRef
        );
    }

    ngOnInit(): void {
        this.createForm();
        this.addSubscriptions();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((s) => s.unsubscribe());
    }

    onCancelClick() {
        this.dialogRef?.close();
        void this.authService.logOut();
    }
}
