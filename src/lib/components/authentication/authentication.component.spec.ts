/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, fakeAsync, flush, flushMicrotasks, TestBed, waitForAsync } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ApplicationStateService, ENVIRONMENT } from '@app/common';
import { MessagesService } from '@app/common';
import { ActivatedRouteStub } from '@app/common/testing';
import { MaterialModule } from '@app/material-module';
import moment from 'moment';
import { of, throwError } from 'rxjs';
import { PrOAuthService } from '../../services/oauth.service';
import { ILoginResult } from '../../models/login';
import { EResponseStatus } from '../../models/status';
import { AuthenticationService } from '../../services/authentication.service';
import { DeviceService } from '../../services/device.service';
import { EAuthenticationFormType } from '../../models/form-type';
import { AuthenticationComponent } from './authentication.component';

describe('AuthenticationComponent', () => {
    let component: AuthenticationComponent;
    let fixture: ComponentFixture<AuthenticationComponent>;
    let activatedRouteStub: ActivatedRouteStub;
    let authService: AuthenticationService;
    let router: Router;
    let messagesService: MessagesService;

    const authModuleRoute = 'testlogin';

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [AuthenticationComponent],
                imports: [
                    RouterTestingModule.withRoutes([
                        { path: authModuleRoute, component: {} as any },
                        { path: 'testRoute', component: {} as any },
                    ]),
                    HttpClientTestingModule,
                    MaterialModule,
                    BrowserAnimationsModule,
                ],
                providers: [
                    AuthenticationService,
                    MessagesService,
                    DeviceService,
                    FormBuilder,
                    { provide: ActivatedRoute, useValue: new ActivatedRouteStub() },
                    { provide: ENVIRONMENT, useValue: { routes: { authenticationModule: authModuleRoute } } },
                    { provide: APP_NAME, useValue: 'mQ - Test' },
                    { provide: APP_SHORT_NAME, useValue: 'Test' },
                    { provide: PrOAuthService, useValue: { isConfigured: () => false } as PrOAuthService },
                    { provide: ApplicationStateService, useValue: {} as ApplicationStateService },
                ],
                schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(AuthenticationComponent);
        component = fixture.componentInstance;
        activatedRouteStub = TestBed.inject(ActivatedRoute) as any;
        authService = TestBed.inject(AuthenticationService);
        router = TestBed.inject(Router);
        messagesService = TestBed.inject(MessagesService);
        fixture.detectChanges();
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    describe('check form', () => {
        it('should build form', () => {
            expect(component.form).toBeTruthy();
            expect(component.form.get(EAuthenticationFormType.login)).toBeTruthy();
            expect(component.form.get(EAuthenticationFormType.verify)).toBeTruthy();
        });

        it('buildLoginGroup: should init and set initial value to login form group', () => {
            const loginFormGroup = component.form.get(EAuthenticationFormType.login);

            const userNameControl = loginFormGroup!.get('username');
            const passwordControl = loginFormGroup!.get('password');
            const deviceIdControl = loginFormGroup!.get('deviceId');
            const deviceOSControl = loginFormGroup!.get('deviceOS');

            expect(userNameControl).toBeTruthy();
            expect(userNameControl!.value).toBeNull();
            expect(passwordControl).toBeTruthy();
            expect(passwordControl!.value).toBeNull();
            expect(deviceIdControl).toBeTruthy();
            expect(deviceIdControl!.value).not.toBeNull();
            expect(deviceOSControl).toBeTruthy();
            expect(deviceOSControl!.value).not.toBeNull();
        });

        it('buildVerifyGroup: should init and set initial value to login form group', () => {
            const verifyFormGroup = component.form.get(EAuthenticationFormType.verify);

            const verificationCode = verifyFormGroup!.get('verificationCode');
            const token = verifyFormGroup!.get('token');

            expect(verificationCode).toBeTruthy();
            expect(verificationCode!.value).toBeNull();
            expect(token).toBeTruthy();
            expect(token!.value).toBeNull();
        });
    });

    describe('form view switch', () => {
        it('should be login view', () => {
            component.form.get(EAuthenticationFormType.verify)!.get('token')!.setValue(null);

            expect(component.formView$.value).toBe(EAuthenticationFormType.login);
        });
    });

    describe('on submit', () => {
        describe('on submit Login form', () => {
            let dummyLoginResponse: ILoginResult;
            let loginForm: FormGroup;
            let verifyForm: FormGroup;

            beforeEach(() => {
                dummyLoginResponse = {
                    token: 'testToken',
                    status: EResponseStatus.Verify,
                } as ILoginResult;
                loginForm = component.form.get(EAuthenticationFormType.login) as FormGroup;
                verifyForm = component.form.get(EAuthenticationFormType.verify) as FormGroup;
                // set login form view
                verifyForm.get('token')!.setValue(null);
                // make login form valid
                loginForm.get('username')!.setValue('test');
                loginForm.get('password')!.setValue('test');
            });

            it('login form submission should not occur, invalid login form', () => {
                const loginHttpSpy = spyOn(authService, 'login').and.stub();
                const verifyHttpSpy = spyOn(authService, 'verify').and.stub();
                loginForm.get('username')!.setValue(null);
                component.onSubmit();

                expect(loginHttpSpy).not.toHaveBeenCalled();
                expect(verifyHttpSpy).not.toHaveBeenCalled();
            });

            it('should call login', () => {
                const loginHttpSpy = spyOn(authService, 'login').and.callThrough();
                const verifyHttpSpy = spyOn(authService, 'verify').and.callThrough();

                component.onSubmit();

                expect(loginHttpSpy).toHaveBeenCalled();
                expect(loginHttpSpy).toHaveBeenCalledWith(loginForm.value);
                expect(verifyHttpSpy).not.toHaveBeenCalled();
            });

            it('should reset username and password on finalize', () => {
                spyOn(authService, 'login').and.returnValue(of(dummyLoginResponse));
                component.onSubmit();

                expect(loginForm.get('username')!.value).toBeNull();
                expect(loginForm.get('password')!.value).toBeNull();
            });

            it('should set temporary token', () => {
                spyOn(authService, 'login').and.returnValue(of(dummyLoginResponse));
                component.onSubmit();

                expect(verifyForm.get('token')!.value).toBe(dummyLoginResponse.token);
            });

            it('should change formView$ to Verify', () => {
                spyOn(authService, 'login').and.returnValue(of(dummyLoginResponse));
                component.onSubmit();

                expect(component.formView$.value).toBe(EAuthenticationFormType.verify);
            });

            describe('when backend service is unavailable', () => {
                it('should show a message when mQ Services is unavailable', fakeAsync(() => {
                    const loginHttpSpy = spyOn(authService, 'login').and.returnValue(
                        throwError('Error trying to issue a verification token: Unable to create socket to backend')
                    );
                    const messagesServiceSpy = spyOn(messagesService, 'error').and.callThrough();
                    component.onSubmit();
                    flush();
                    flushMicrotasks();

                    expect(loginHttpSpy).toHaveBeenCalled();
                    expect(messagesServiceSpy).toHaveBeenCalled();
                    expect(messagesServiceSpy).toHaveBeenCalledWith(
                        'Kan inloggegevens niet controleren omdat de mijnQuarant server niet beschikbaar is. Probeer het later nog een keer.',
                        'Ok'
                    );
                }));
            });

            describe('when backend throw Login token error', () => {
                it('should show a message when user is already logged', fakeAsync(() => {
                    const loginHttpSpy = spyOn(authService, 'login').and.returnValue(
                        throwError('You must log out before you can log in.')
                    );
                    const messagesServiceSpy = spyOn(messagesService, 'error').and.callThrough();
                    component.onSubmit();
                    flush();
                    flushMicrotasks();

                    expect(loginHttpSpy).toHaveBeenCalled();
                    expect(messagesServiceSpy).toHaveBeenCalled();
                    expect(messagesServiceSpy).toHaveBeenCalledWith(
                        'Inloggen is mislukt. Probeer het nog een keer.',
                        'Ok'
                    );
                }));
            });
        });

        describe('on submit Verify form', () => {
            let dummyVerifyResponse: ILoginResult;
            let loginForm: FormGroup;
            let verifyForm: FormGroup;

            beforeEach(() => {
                dummyVerifyResponse = {
                    token: 'SessionToken',
                    status: EResponseStatus.Success,
                } as ILoginResult;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                loginForm = component.form.get(EAuthenticationFormType.login) as FormGroup;
                verifyForm = component.form.get(EAuthenticationFormType.verify) as FormGroup;

                // make verify form valid, and set verify form view
                verifyForm.get('verificationCode')!.setValue('test');
                verifyForm.get('token')!.setValue('testToken');
                verifyForm.get(EAuthenticationFormType.pin)!.get('pin')!.setValue(null);
                verifyForm.get(EAuthenticationFormType.pin)!.get('confirmPin')!.setValue(null);
            });

            it('verify form submission should not occur, invalid verify form', () => {
                const loginHttpSpy = spyOn(authService, 'login').and.callThrough();
                const verifyHttpSpy = spyOn(authService, 'verify').and.callThrough();
                verifyForm.get('verificationCode')!.setValue(null);
                component.onSubmit();

                expect(loginHttpSpy).not.toHaveBeenCalled();
                expect(verifyHttpSpy).not.toHaveBeenCalled();
            });

            it('should call verify', () => {
                component.formView$.next(EAuthenticationFormType.verify);
                const loginHttpSpy = spyOn(authService, 'login').and.callThrough();
                const verifyHttpSpy = spyOn(authService, 'verify').and.callThrough();

                component.onSubmit();

                expect(verifyHttpSpy).toHaveBeenCalled();
                expect(verifyHttpSpy).toHaveBeenCalledWith(verifyForm.value);
                expect(loginHttpSpy).not.toHaveBeenCalled();
            });

            it('should navigate to returnUrl', fakeAsync(() => {
                component.formView$.next(EAuthenticationFormType.verify);
                const returnUrlParam = { returnUrl: 'testRoute' };
                const verifySpy = spyOn(authService, 'verify').and.returnValue(of(dummyVerifyResponse));
                spyOn(authService, 'loadPerson').and.resolveTo({ id: 'testuser' });

                activatedRouteStub.setQueryParamMap(returnUrlParam);

                const routerSpy = spyOn(router, 'navigate').and.stub();
                component.onSubmit();

                flush();

                expect(verifySpy).toHaveBeenCalled();
                expect(routerSpy).toHaveBeenCalled();
                expect(routerSpy).toHaveBeenCalledWith([returnUrlParam.returnUrl]);
                expect(component.formView$.value).toEqual(EAuthenticationFormType.login);
            }));

            it('should send a snackbar message', fakeAsync(() => {
                component.formView$.next(EAuthenticationFormType.verify);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const returnUrlParam = { returnUrl: 'testRoute' };
                const verifySpy = spyOn(authService, 'verify').and.returnValue(of(dummyVerifyResponse));
                spyOn(authService, 'loadPerson').and.resolveTo({ id: 'testuser' });

                const sendMessageSpy = spyOn(component, 'sendLastLoginMessage').and.stub();
                component.onSubmit();

                flush();

                expect(verifySpy).toHaveBeenCalled();
                expect(sendMessageSpy).toHaveBeenCalled();
            }));

            describe('Verification Code Attempts Count', () => {
                beforeEach(() => {
                    dummyVerifyResponse = {
                        status: EResponseStatus.Invalid,
                    } as ILoginResult;
                    component.formView$.next(EAuthenticationFormType.verify);
                });

                it('should show error messages', () => {
                    spyOn(authService, 'verify').and.returnValue(of(dummyVerifyResponse));
                    const messagesServiceSpy = spyOn(messagesService, 'error').and.stub();

                    // 1 attempt
                    component.onSubmit();

                    expect(messagesServiceSpy).toHaveBeenCalledWith('Verificatiecode is onjuist.', 'Ok');

                    // 2 attempt
                    component.onSubmit();

                    expect(messagesServiceSpy).toHaveBeenCalledWith('Verificatiecode is onjuist.', 'Ok');

                    // 3 attempt
                    component.onSubmit();

                    expect(messagesServiceSpy).toHaveBeenCalledWith(
                        'U hebt drie keer de verkeerde code ingevoerd. U moet opnieuw inloggen.',
                        'Ok'
                    );

                    expect(messagesServiceSpy).toHaveBeenCalledTimes(3);
                });

                it('should reset form after 3 invalid attempts and change view', () => {
                    component.form.get('verify')!.patchValue({ verificationCode: '0000', token: '11111' });
                    spyOn(authService, 'verify').and.returnValue(of(dummyVerifyResponse));
                    // 1 attempt
                    component.onSubmit();
                    // 2 attempt
                    component.onSubmit();
                    // 3 attempt
                    component.onSubmit();

                    expect(verifyForm.invalid).toBeTruthy();
                    expect(verifyForm.get('verificationCode')!.value).toBeNull();
                    expect(verifyForm.get('token')!.value).toBeNull();
                    expect(component.formView$.value).toBe(EAuthenticationFormType.login);
                });
            });
        });
    });

    it('should forward the user to the returnUrl when the user was already logged in', fakeAsync(() => {
        const returnUrlParam = { returnUrl: 'testRoute' };
        spyOn(authService, 'isLoggedIn').and.resolveTo(true);

        activatedRouteStub.setQueryParamMap(returnUrlParam);

        const routerSpy = spyOn(router, 'navigate').and.stub();
        component.ngOnInit();
        flush();

        expect(routerSpy).toHaveBeenCalled();
        expect(routerSpy).toHaveBeenCalledWith([returnUrlParam.returnUrl]);
    }));

    describe('sendLastLoginMessage', () => {
        const baseTime = new Date('2020-09-09T10:00:00.000');
        beforeAll(() => {
            jasmine.clock().mockDate(baseTime);
            moment.locale('nl');
        });

        it('should display the last login as a date when the last login is a week ago', () => {
            const messagesSpy = spyOn(messagesService, 'info').and.stub();
            component.sendLastLoginMessage('2019-03-11T08:00:00.000');

            expect(messagesSpy).toHaveBeenCalledWith(
                `Welkom terug! Uw vorige bezoek was op 11 maart 2019 om 08:00 uur.`,
                'Sluit',
                10000
            );
        });

        it('should display the last login as today when the last login was today', () => {
            const messagesSpy = spyOn(messagesService, 'info').and.stub();
            component.sendLastLoginMessage('2020-09-09T08:00:00.000');

            expect(messagesSpy).toHaveBeenCalledWith(
                `Welkom terug! Uw vorige bezoek was vandaag om 08:00 uur.`,
                'Sluit',
                10000
            );
        });

        it('should display the last login as yesterday when the last login was yesterday', () => {
            const messagesSpy = spyOn(messagesService, 'info').and.stub();
            component.sendLastLoginMessage('2020-09-08T08:00:00.000');

            expect(messagesSpy).toHaveBeenCalledWith(
                `Welkom terug! Uw vorige bezoek was gisteren om 08:00 uur.`,
                'Sluit',
                10000
            );
        });

        it('should display the "Welkom!" mesage for first login', () => {
            const messagesSpy = spyOn(messagesService, 'info').and.stub();
            component.sendLastLoginMessage('');

            expect(messagesSpy).toHaveBeenCalledWith(`Welkom!`, 'Sluit', 10000);
        });
    });
});
