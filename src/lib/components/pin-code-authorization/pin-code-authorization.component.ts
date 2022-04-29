/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { FunctionalError, MessagesService } from '@mq/common';
import moment from 'moment';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter, finalize, first } from 'rxjs/operators';
import { EFormControls } from '../../models/form-controls';
import { IStoredRefreshToken } from '../../models/loggedUser';
import { EResponseStatus } from '../../models/status';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'mq-pin-code-authorization',
    templateUrl: './pin-code-authorization.component.html',
    styleUrls: ['./pin-code-authorization.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class PinCodeAuthorizationComponent implements OnInit, OnDestroy {
    @Input() redirectOnIsLoggedIn = true;

    public loading$ = this.authService.loadingSubject;
    public pinCodeUsers: IStoredRefreshToken[] = [];
    // eslint-disable-next-line @typescript-eslint/ban-types
    public error$ = new BehaviorSubject<{}>({});
    public form!: FormGroup | undefined;
    public showForgotten = new BehaviorSubject<boolean>(false);
    public showPincode = false;
    private attemptsVerificationCode = 0;

    public returnUrl = '';
    public subscriptions: Subscription[] = [];
    public get selectedUser() {
        return this.form?.get('refreshTokenControl')?.value;
    }

    public refreshTokenControl = new FormControl(null);
    public pinControl = new FormControl(null, [Validators.required, Validators.pattern(/^[0-9]\d*$/)]);
    public FormControls = EFormControls;

    constructor(
        public authService: AuthenticationService,
        public dialog: MatDialog,
        @Optional() public dialogRef: MatDialogRef<PinCodeAuthorizationComponent>,
        public messagesService: MessagesService,
        public formBuilder: FormBuilder,
        public router: Router,
        public route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.form = this.formBuilder.group({
            refreshTokenControl: this.refreshTokenControl,
            pin: this.pinControl,
        });
        this.pinCodeUsers = this.authService.getPinCodeUsers();
        this.refreshTokenControl.setValue(this.pinCodeUsers[0]);

        if (this.redirectOnIsLoggedIn) {
            this.subscriptions.push(
                this.route.queryParamMap.subscribe(async (paramMap) => {
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    this.returnUrl = paramMap.get('returnUrl') || '/';
                    // Check if we are already logged in and forward,
                    // to prevent the error from the API: You must log out before you can log in.
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises

                    const isLoggedIn = await this.authService.isLoggedIn();
                    if (isLoggedIn) {
                        this.router.navigate([this.returnUrl]);
                    }
                })
            );
        }

        this.subscriptions.push(
            this.error$.pipe(filter((error) => error && Object.keys(error).length !== 0)).subscribe((error) => {
                //Verification errors we should catch manually, all others errors should not show in snackbar
                console.error('Something went wrong:', error);
            })
        );
    }

    ngOnDestroy() {
        this.subscriptions.forEach((s) => s.unsubscribe());
    }

    deleteUserFromList(user: IStoredRefreshToken) {
        this.authService.deleteFromPincodeUsers(user.id);
        this.pinCodeUsers = this.authService.getPinCodeUsers();
        if (this.pinCodeUsers.length < 1) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.openLogIn();
        }
    }

    public onSubmit() {
        if (this.form) {
            this.login(this.form);
        }
    }

    public logOut(event: MatSelectChange) {
        this.authService.setPinCodeUserToFirst(event.value);
        this.authService.logOut();
    }

    public login(form: FormGroup): void {
        this.loading$.next(true);
        this.authService
            .pinCode({ refreshToken: form.get('refreshTokenControl')?.value.token, pin: form.get('pin')?.value })
            .pipe(
                first(),
                finalize(() => {
                    this.loading$.next(false);
                })
            )
            .subscribe(
                async (result) => {
                    if (!result) {
                        return;
                    }
                    if (result.status === EResponseStatus.Success) {
                        this.authService.setUpPinLogOut(true);
                        if (this.dialogRef) {
                            this.dialogRef.close();
                            const person = await this.authService.loadPerson();
                            if (person) {
                                this.sendLastLoginMessage(result.lastLoginDate);
                                this.authService.storeRefreshToken(result.refreshToken);
                                this.authService.storeUserData();
                            }
                        } else {
                            // The cookie is set, so we should be logged in
                            this.authService.loadPerson().then(async () => {
                                await this.router.navigate([this.returnUrl]);
                                this.sendLastLoginMessage(result.lastLoginDate);
                                this.authService.storeRefreshToken(result.refreshToken);
                                this.authService.storeUserData();
                                this.form?.get('pin')?.reset();
                            });
                        }
                    } else if (result.status === EResponseStatus.Invalid) {
                        this.checkVerificationCodeAttemptsCount(form);
                    }
                },
                (error) => {
                    this.error$.next(error);
                    this.checkVerificationCodeAttemptsCount(form, error);
                }
            );
    }

    public async openLogIn(returnToLogIn = false) {
        this.authService.setUpPinLogOut(false);
        this.authService.savePinSetState(false);
        this.authService.showPinLogin$.next(false);
        await this.authService.logOut(returnToLogIn);
        this.router.navigate([this.returnUrl]);
    }

    public onCancel() {
        if (this.dialogRef) {
            this.dialogRef.close();
        }
    }

    getErrorMessage() {
        if (this.pinControl.hasError('required')) {
            return 'PIN code cannot be empty';
        }
        return this.pinControl.hasError('pattern')
            ? 'Invalid PIN entered. The PIN may only consist of numbers.'
            : '';
    }
    openPinCodeForgotten() {
        this.showForgotten.next(true);
    }
    closePinCodeForgotten() {
        this.showForgotten.next(false);
    }

    sendLastLoginMessage(lastLoginDate: string | Date) {
        if (lastLoginDate) {
            const previousLogin = new Date(lastLoginDate);
            let dateString;
            if (moment(previousLogin).isSame(moment(), 'day')) {
                dateString = 'Today';
            } else if (moment(previousLogin).isSame(moment().subtract(1, 'day'), 'day')) {
                dateString = 'Yesterday';
            } else {
                dateString = `on ${moment(previousLogin).format('DD MMMM yyyy')}`;
            }
            const timeString = moment(previousLogin).format('HH:mm');
            this.messagesService.info(
                `Welcome back! Your previous visit was ${dateString} to ${timeString} o'clock.`,
                'Close',
                10000
            );
        } else {
            this.messagesService.info(`Welcome!`, 'Close', 10000);
        }
    }

    public async checkVerificationCodeAttemptsCount(
        form: FormGroup,
        error?: FunctionalError | HttpErrorResponse | string | undefined
    ): Promise<void> {
        this.attemptsVerificationCode++;

        if (this.attemptsVerificationCode === 3) {
            this.form?.disable();
            this.messagesService.error(
                'PIN was entered incorrectly 3 times. Log in with username and password.',
                'Ok',
                3000
            );
            this.attemptsVerificationCode = 0;
            form.reset();
            await this.openLogIn();
        } else {
            if (error) {
                if (typeof error === 'string') {
                    this.messagesService.error(error, 'Ok');
                } else if (error instanceof FunctionalError) {
                    this.messagesService.error(error.message, 'Ok');
                } else if (error instanceof HttpErrorResponse) {
                    this.messagesService.error(error.error, 'Ok');
                } else {
                    console.error('Something went wrong while validating the pin code', error);
                    this.messagesService.error(
                        'Something went wrong while validating the PIN. Please try again later.',
                        'Ok'
                    );
                }
            } else {
                this.messagesService.error('Entered PIN code is incorrect. Try again', 'Ok');
            }
        }
    }
    public onCancelClick() {
        this.authService.logOut();
    }
}
