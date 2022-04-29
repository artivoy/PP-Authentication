/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-floating-promises */
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { LastLoginService, MessagesService } from '@mq/common';
import moment from 'moment';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter, finalize, first } from 'rxjs/operators';
import { EFormControls } from '../../models/form-controls';
import { EAuthenticationFormType } from '../../models/form-type';
import { EResponseStatus } from '../../models/status';
import { EVerifyMethod } from '../../models/verify';
import { AuthenticationService } from '../../services/authentication.service';
import { DeviceService } from '../../services/device.service';
import { PinCodeInformationComponent } from '../pin-code-information/pin-code-information.component';
import { PincodeErrorsValidationDirective } from '../pin-code-setup/error-state-matcher';

@Component({
    selector: 'mq-authentication',
    templateUrl: './authentication.component.html',
    styleUrls: ['./authentication.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class AuthenticationComponent implements OnInit, OnDestroy {
    @Input() redirectOnIsLoggedIn = true;

    protected attemptsVerificationCode = 0;
    public returnUrl = '';
    public subscriptions: Subscription[] = [];

    public EAuthenticationFormType = EAuthenticationFormType;
    public FormControls = EFormControls;
    public form!: FormGroup;

    // convenience getter for easy access to form fields
    public get loginFields() {
        return (this.form.get(EAuthenticationFormType.login) as FormGroup).controls;
    }
    public get verificationCodeFields() {
        return (this.form.get(EAuthenticationFormType.verify) as FormGroup).controls;
    }

    @ViewChild('verificationCodeInput') verificationCodeInput: ElementRef | undefined;

    public formView$ = this.authService.formView;
    public loading$ = this.authService.loadingSubject;
    // eslint-disable-next-line @typescript-eslint/ban-types
    public error$ = new BehaviorSubject<string | object | Error>({});

    public verifyMethod: EVerifyMethod | null = null;
    public showPassword = false;
    public showPincode = false;

    constructor(
        public authService: AuthenticationService,
        public messagesService: MessagesService,
        public deviceService: DeviceService,
        public formBuilder: FormBuilder,
        public router: Router,
        public route: ActivatedRoute,
        public lastLoginService: LastLoginService,
        public dialog: MatDialog,
        @Optional() public dialogRef?: MatDialogRef<AuthenticationComponent>
    ) {}

    ngOnInit(): void {
        this.createForm();
        this.addSubscriptions();
        this.addValidators();
    }

    ngOnDestroy(): void {
        this.loading$.next(false);
        this.subscriptions.forEach((s) => s.unsubscribe());
    }

    public addSubscriptions() {
        if (this.redirectOnIsLoggedIn) {
            this.subscriptions.push(
                // get return url from route parameters or default to '/'
                this.route.queryParamMap.subscribe((paramMap) => {
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    this.returnUrl = paramMap.get('returnUrl') || '/';
                    // Check if we are already logged in and forward,
                    // to prevent the error from the API: You must log out before you can log in.
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.authService
                        .isLoggedIn()
                        .then((isLoggedIn: boolean) => isLoggedIn && this.router.navigate([this.returnUrl]));
                })
            );
        }
        this.subscriptions.push(
            this.error$.pipe(filter((error) => !!error && Object.keys(error).length !== 0)).subscribe((error) => {
                if (typeof error === 'string') {
                    this.messagesService.error(`${error}`, 'Ok');
                } else if (error instanceof Error) {
                    this.messagesService.error(`${error.message}`, 'Ok');
                } else {
                    this.messagesService.error(`An unknown error has occurred.`, 'Ok');
                    console.error('Something went wrong:', error);
                }
            })
        );
    }

    public onSubmit() {
        const submitFormGroup = this.form.get(this.formView$.value) as FormGroup;
        if (submitFormGroup.invalid) {
            return;
        }

        if (this.formView$.value === EAuthenticationFormType.login) {
            this.login(submitFormGroup);
        } else {
            this.verify(submitFormGroup);
        }
    }

    openNoCodeHelp() {
        this.formView$.next(EAuthenticationFormType.no_code);
    }

    closeNoCodeHelp() {
        this.formView$.next(EAuthenticationFormType.verify);
    }

    getVerifyMethod(): string {
        const defaultValue = 'Unknown';
        if (this.verifyMethod) {
            return EVerifyMethod[this.verifyMethod as keyof typeof EVerifyMethod] || defaultValue;
        }
        return defaultValue;
    }

    public login(form: FormGroup, isRetry = false): void {
        this.loading$.next(true);

        this.authService.isLoggedIn().then((isLoggedIn: boolean) => {
            if (isLoggedIn) {
                if (this.dialogRef) {
                    this.dialogRef.close();
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.router.navigate([this.returnUrl]);
                }
                this.messagesService.info(`Welcome!`, 'Close', 10000);
                return;
            }
        });

        this.authService
            .login(form.getRawValue())
            .pipe(
                first(),
                finalize(() => {
                    form.reset({
                        deviceId: this.deviceService.uuid,
                        deviceOS: this.deviceService.os,
                    });
                    this.loading$.next(false);
                })
            )
            .subscribe(
                (result) => {
                    if (!result) {
                        return;
                    }
                    if (result.token && result.status === EResponseStatus.Verify) {
                        this.verifyMethod = result.method;
                        this.verificationCodeFields.token.setValue(result.token);
                        this.formView$.next(EAuthenticationFormType.verify);
                        setTimeout(() => {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            this.verificationCodeInput?.nativeElement.focus();
                        }, 1);
                    }
                },
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                async (error) => {
                    // Retry the login after resetting the cookie if we get an unexpected exception because the user might have a valid token that does no longer works
                    if (
                        !isRetry &&
                        JSON.stringify(error).includes(
                            'Unexpected exception processing your token. Try again in a minute or two. If it persists, then please contact support.'
                        )
                    ) {
                        try {
                            await this.authService.onlyCookieLogOut();
                        } catch (resetError) {
                            // Only log the error, and retry the login (which will display its own error)
                            console.error(resetError);
                        }
                        await this.login(form, true);
                    } else {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const errorResponse = await this.catchBackendErrors(error);
                        this.error$.next(errorResponse);
                    }
                }
            );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async catchBackendErrors(error: any): Promise<any> {
        const stringifiedError = JSON.stringify(error);
        // BackendOfflineError
        const backendFailure = 'Error trying to issue a verification token: Unable to create socket to';
        const backendFailureResponse =
            'Unable to verify credentials because the server is unavailable. Try again later.';

        // Connection failure (VPN)
        const connectionFailureMessage = 'Could not connect to the server.';

        const sessionFailureMessage =
            'An error has occurred. Your user session is no longer valid. Save your work locally. Try refreshing the page or logging in again. If the problem persists, consult your administrator.';

        const tokenFailure =
            'Invalid token. Try again after logging in. If this problem persists, then please contact support.';
        const loginFailure = 'You must log out before you can log in';

        // Invalid username or password Error
        const invalidUsernamePasswordFailure = 'Login failed: Invalid username or password.';
        const invalidUsernamePasswordResponse =
            'Entered username and/or password are incorrect. Try again.';

        // No email or SMS is specified to send the verificatoin token to
        const noEmailAndPhoneNumberFailure = 'No email or SMS is specified to send the verificatoin token to.';
        const noEmailAndPhoneNumberResponse =
            'No verification code can be sent because no email address or mobile phone number is known. Contact your own management organization.';

        // Server error
        const serverFailure =
            'Unexpected exception processing your token. Try again in a minute or two. If it persists, then please contact support.';
        const serverResponse =
            'An unknown error has occurred. If this problem persists, contact your administrative organization.';

        if (stringifiedError.includes(backendFailure)) {
            return backendFailureResponse;
        } else if (stringifiedError.includes(connectionFailureMessage)) {
            return connectionFailureMessage;
        } else if (stringifiedError.includes(sessionFailureMessage)) {
            return sessionFailureMessage;
        } else if (stringifiedError.includes(loginFailure) || stringifiedError.includes(tokenFailure)) {
            // Backend Token errors
            const loginFailedonBackend = 'Login failed. Try again.';
            return loginFailedonBackend;
        } else if (stringifiedError.includes(invalidUsernamePasswordFailure)) {
            return invalidUsernamePasswordResponse;
        } else if (stringifiedError.includes(noEmailAndPhoneNumberFailure)) {
            const phoneNumber = await this.authService.getPhonenumber().toPromise();
            return `${noEmailAndPhoneNumberResponse}${phoneNumber ? ` ${phoneNumber}` : ``}`;
        } else if (stringifiedError.includes(serverFailure)) {
            return serverResponse;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return error;
        }
    }

    protected createForm() {
        this.form = this.formBuilder.group({
            [EAuthenticationFormType.login]: this.buildLoginGroup(),
            [EAuthenticationFormType.verify]: this.buildVerifyGroup(),
        });
    }

    protected addPinFields() {
        return this.formBuilder.group({
            pin: [null],
            confirmPin: [null],
        });
    }

    protected addValidators() {
        const pinCodes = this.form.get(EAuthenticationFormType.verify)?.get(EAuthenticationFormType.pin) as FormControl;
        pinCodes.setValidators([
            PincodeErrorsValidationDirective(
                this.form.get(EAuthenticationFormType.verify) as FormGroup,
                EAuthenticationFormType.pin
            ),
        ]);
    }

    protected verify(form: FormGroup): void {
        this.loading$.next(true);
        const verifyObject = form.value;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete verifyObject?.pin;
        const pin: string = this.form
            .get(EAuthenticationFormType.verify)
            ?.get(EAuthenticationFormType.pin)
            ?.get('pin')?.value;

        if (pin?.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            verifyObject.pin = pin;
        }

        this.authService
            .verify(verifyObject)
            .pipe(
                first(),
                finalize(() => {
                    this.loading$.next(false);
                })
            )
            .subscribe(
                (result) => {
                    if (!result) {
                        return;
                    }
                    if (result.status === EResponseStatus.Success) {
                        this.authService.storeUserData();
                        this.lastLoginService.lastLogin$.next(result.lastLoginDate);
                        if (this.dialogRef) {
                            this.dialogRef.close();
                        } else {
                            // The cookie is set, so we should be logged in
                            this.authService.loadPerson().then(async () => {
                                await this.router.navigate([this.returnUrl]);
                                this.sendLastLoginMessage(result.lastLoginDate);
                                if (pin?.length > 0) {
                                    if (result.refreshToken) {
                                        this.authService.storeRefreshToken(result.refreshToken);
                                        this.authService.savePinSetState(true);
                                        this.authService.setOnlyCookieLogOut(true);
                                        this.messagesService.info(
                                            'New PIN set. You can then log in with the PIN code',
                                            'Close'
                                        );
                                    }
                                }
                            });
                        }
                        this.form.get(EAuthenticationFormType.verify)?.reset();
                        // Set the formView back to login since Ionic routeReuseStratagy keeps the component alive.
                        setTimeout(() => {
                            this.formView$.next(EAuthenticationFormType.login);
                        }, 100);
                    } else if (result.status === EResponseStatus.Invalid) {
                        this.checkVerificationCodeAttemptsCount(form);
                    }
                },
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                async (error) => {
                    const foundError = await this.catchBackendErrors(error);
                    const isBackendError = foundError !== error;

                    this.error$.next(foundError);
                    if (!isBackendError) {
                        this.checkVerificationCodeAttemptsCount(form);
                    }
                }
            );
    }

    protected buildLoginGroup(): FormGroup {
        return this.formBuilder.group({
            username: [null, Validators.required],
            password: [null, Validators.required],
            deviceId: [this.deviceService.uuid, Validators.required],
            deviceOS: this.deviceService.os,
        });
    }

    protected buildVerifyGroup(): FormGroup {
        return this.formBuilder.group({
            verificationCode: [null, Validators.required],
            token: [null, Validators.required],
            [EAuthenticationFormType.pin]: this.addPinFields(),
        });
    }

    public checkVerificationCodeAttemptsCount(form: FormGroup): void {
        this.attemptsVerificationCode++;
        // We have only "3" attempts to enter the verification code.
        if (this.attemptsVerificationCode === 3) {
            form.reset();
            this.attemptsVerificationCode = 0;
            this.messagesService.error('You entered the wrong code three times. You must log in again.', 'Ok');
            this.formView$.next(EAuthenticationFormType.login);
        } else {
            this.messagesService.error('Verification code is incorrect.', 'Ok');
        }
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

    openMoreInfo() {
        this.dialog.open(PinCodeInformationComponent, {
            width: '400px',
        });
    }
}
