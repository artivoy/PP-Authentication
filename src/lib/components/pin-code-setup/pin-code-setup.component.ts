/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, Optional, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { apiInfo, LastLoginService, MessagesService } from '@app/common';
import { BehaviorSubject } from 'rxjs';
import { EAuthenticationFormType } from '../../models/form-type';
import { EResponseStatus } from '../../models/status';
import { AuthenticationService } from '../../services/authentication.service';
import { DeviceService } from '../../services/device.service';
import { AuthenticationComponent } from '../authentication/authentication.component';
import { PincodeEmptyValidation, PincodeErrorsValidationDirective } from './error-state-matcher';

@Component({
    selector: 'mq-pin-code-setup',
    templateUrl: './pin-code-setup.component.html',
    styleUrls: ['./pin-code-setup.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinCodeSetupComponent extends AuthenticationComponent implements OnInit, OnDestroy {
    public form!: FormGroup;
    private readonly requestWorker: Worker | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public workerData: BehaviorSubject<any> = new BehaviorSubject(null);
    public get formFields(): { [key: string]: AbstractControl } {
        return this.form?.controls;
    }

    constructor(
        _authService: AuthenticationService,
        _messagesService: MessagesService,
        _deviceService: DeviceService,
        _formBuilder: FormBuilder,
        _router: Router,
        _route: ActivatedRoute,
        _lastLoginService: LastLoginService,
        _dialog: MatDialog,
        @Optional() _dialogRef?: MatDialogRef<PinCodeSetupComponent>
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

        // We need a worker because otherwise, we can not set up Pincode without log out.
        this.requestWorker = new Worker('./assets/authentication/pin-code-worker.worker.js');
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.requestWorker.addEventListener(
            'message',
            async (response) => await this.handleWorkerResponse(this.requestWorker, response)
        );
    }

    ngOnInit(): void {
        this.createForm();
        this.addSubscriptions();
        this.addValidators();
    }

    ngOnDestroy(): void {
        this.loading$.next(false);
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.requestWorker?.terminate();
    }

    public onSubmit(): void {
        const submitFormGroup = this.form.get(this.formView$.value) as FormGroup;
        if (submitFormGroup.invalid) {
            return;
        }

        if (this.formView$.value === EAuthenticationFormType.login) {
            this.login(submitFormGroup);
        } else if (this.formView$.value === EAuthenticationFormType.pin) {
            this.workerData = new BehaviorSubject(null);
            this.pinSetUp(this.form.get(EAuthenticationFormType.verify) as FormGroup);
        } else {
            this.verify(submitFormGroup);
        }
    }

    protected addValidators(): void {
        const pinCodes = this.form.get(EAuthenticationFormType.pin) as FormControl;
        pinCodes.setValidators([
            Validators.required,
            Validators.minLength(5),
            PincodeErrorsValidationDirective(this.form, EAuthenticationFormType.pin),
            PincodeEmptyValidation(this.form, EAuthenticationFormType.pin),
        ]);
    }

    protected createForm(): void {
        this.form = this.formBuilder.group({
            [EAuthenticationFormType.login]: this.buildLoginGroup(),
            [EAuthenticationFormType.verify]: this.buildVerifyGroup(),
            [EAuthenticationFormType.pin]: this.addPinFields(),
        });
    }

    protected buildLoginGroup(): FormGroup {
        let username =
            this.authService?.user?.identifier?.find((id) => id.system === apiInfo.codeSystemIdentifiers.UserAccount)
                ?.value ?? null;
        return this.formBuilder.group({
            username: [username, Validators.required],
            password: [null, Validators.required],
            deviceId: [this.deviceService.uuid, Validators.required],
            deviceOS: this.deviceService.os,
        });
    }

    protected buildVerifyGroup(): FormGroup {
        return this.formBuilder.group({
            verificationCode: [null, Validators.required],
            token: [null, Validators.required],
        });
    }

    public login(form: FormGroup): void {
        this.loading$.next(true);
        this.workerData.subscribe((result) => {
            this.loading$.next(false);
            if (!result) {
                return;
            }
            if (result.token && result.status === EResponseStatus.Verify) {
                this.verifyMethod = result.method;
                this.verificationCodeFields.token.setValue(result.token);
                this.formView$.next(EAuthenticationFormType.verify);
            }
            if (result.issue) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.catchBackendErrors(result.issue[0].details.text).then((response) => {
                    this.error$.next(response);
                    this.workerData.next(null);
                });
            }
        });
        const loginData = {
            ...form.getRawValue(),
            url: `${this.authService.environment.apiURL}/${apiInfo.apiVersion}/${apiInfo.apiPoints.login}`,
            request: 'login',
        };

        this.requestWorker?.postMessage(loginData);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected verify(form: FormGroup): void {
        this.formView$.next(EAuthenticationFormType.pin);
    }

    pinSetUp(form: FormGroup): void {
        this.loading$.next(true);
        const verifyObject = form.value;
        const pin: string = this.form.get(EAuthenticationFormType.pin)?.get('pin')?.value;

        if (pin.length > 0) {
            verifyObject.pin = pin;
        }

        this.workerData.subscribe(
            (result) => {
                if (!result) {
                    return;
                }

                if (result.status === EResponseStatus.Success) {
                    this.authService.savePinSetState(true);
                    this.authService.setOnlyCookieLogOut(true);
                    this.authService.storeRefreshToken(result.refreshToken);
                    this.lastLoginService.lastLogin$.next(result.lastLoginDate);
                    if (this.dialogRef) {
                        this.dialogRef.close();
                    } else {
                        // The cookie is set, so we should be logged in
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.authService.loadPerson().then(async () => {
                            await this.router.navigate([this.returnUrl]);
                            this.sendLastLoginMessage(result.lastLoginDate);
                        });
                    }
                    this.messagesService.info(
                        `New PIN set. You can then log in with the PIN code`,
                        'Close',
                        5000
                    );
                } else if (result.issue) {
                    this.formView$.next(EAuthenticationFormType.verify);
                    this.checkVerificationCodeAttemptsCount(form);
                    this.loading$.next(false);
                    this.workerData.next(null);
                }
            },
            (error) => {
                this.error$.next(error);
                this.formView$.next(EAuthenticationFormType.verify);
                this.checkVerificationCodeAttemptsCount(form);
                this.authService.savePinSetState(false);
                this.loading$.next(false);
                this.workerData.next(null);
            }
        );

        const verifyData = {
            ...verifyObject,
            url: `${this.authService.environment.apiURL}/${apiInfo.apiVersion}/${apiInfo.apiPoints.verify}`,
            request: 'verify',
        };

        this.requestWorker?.postMessage(verifyData);
    }

    onCancelClick(): void {
        this.dialogRef?.close();
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async handleWorkerResponse(worker?: Worker, response?: MessageEvent): Promise<void> {
        this.workerData.next(null);
        let data = '';
        if (worker) {
            data = response?.data;
        }
        this.workerData.next(data);
    }
}
