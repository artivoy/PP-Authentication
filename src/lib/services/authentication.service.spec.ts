/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, flush, flushMicrotasks, TestBed, tick } from '@angular/core/testing';

import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { apiInfo, APP_NAME, APP_SHORT_NAME, ENVIRONMENT } from '@app/common';
import { of } from 'rxjs';
import { LoggingService } from '@app/common-interfaces';
import { debounceTime, delay, tap, throttleTime } from 'rxjs/operators';
import { ILoginResult } from '../models/login';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
    let service: AuthenticationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                RouterTestingModule.withRoutes([]),
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule,
            ],
            providers: [
                AuthenticationService,
                { provide: ENVIRONMENT, useValue: {} },
                { provide: APP_NAME, useValue: 'mQ - Test' },
                { provide: APP_SHORT_NAME, useValue: 'Test' },
                {
                    provide: LoggingService,
                    useValue: {},
                },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        });
        service = TestBed.inject(AuthenticationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('#login', () => {
        const dummyLoginResult = {
            status: 'Verify',
            method: 'SMS',
            token: 'TestToken',
        } as ILoginResult;

        const dummyBodyRequest = {
            username: 'testUser',
            password: 'testPassword',
            deviceId: 'testDeviceId',
            deviceOS: 'testDeviceOs',
        };

        it('should return an Observable<ILoginResult>', () => {
            const loginEndpoint = apiInfo.apiPoints.login;

            service.login(dummyBodyRequest).subscribe((result) => {
                expect(result).toBeTruthy();
                expect(result).toEqual(dummyLoginResult);
            });

            const req = httpMock.expectOne(loginEndpoint);

            expect(req.request.method).toBe('POST');
            req.flush(dummyLoginResult);
        });

        it('should throw with an error message when API returns an error', () => {
            const loginEndpoint = apiInfo.apiPoints.login;

            service.login(dummyBodyRequest).subscribe({
                error(actualError) {
                    expect(of(actualError)).toBeTruthy();
                    expect(actualError).not.toBeNull();
                    expect(actualError).not.toBeUndefined();
                },
            });

            const req = httpMock.expectOne(loginEndpoint);

            expect(req.request.method).toEqual('POST');

            req.flush({ errorMessage: 'Uh oh!' }, { status: 500, statusText: 'Server Error' });
        });

        it('should return an offline message when the backend is offline but the API is not', async () => {
            const error = {
                id: '44f56ce8-c009-4961-9bee-ea4d5ff457fb',
                issue: [
                    {
                        severity: 'error',
                        code: 'processing',
                        details: {
                            coding: [
                                {
                                    system: 'https://api.mijnquarant.nl/error-numbers',
                                    version: '1.3.9.0-SNAPSHOT',
                                    code: '-1635450666:29',
                                },
                            ],
                            text: 'Error trying to issue a verification token: Unable to create socket to endpoint [srv9128.prhc.lan:37021]',
                        },
                    },
                ],
            };
            service.login(dummyBodyRequest).subscribe({
                error(actualError) {
                    expect(of(actualError)).toBeTruthy();
                    expect(actualError).toBe(
                        'Kan inloggegevens niet controleren omdat de mijnQuarant server niet beschikbaar is. Probeer het later nog een keer.'
                    );
                },
            });
            const req = httpMock.expectOne(apiInfo.apiPoints.login);

            expect(req.request.method).toEqual('POST');

            req.flush(error, { status: 404, statusText: 'Server Error' });
        });
    });

    describe('#verify', () => {
        it('should return an Observable<ILoginResult>', () => {
            const verifyEndpoint = apiInfo.apiPoints.verify;
            const dummyVerifyResult = {
                status: 'Verify',
                token: 'TestToken',
            } as ILoginResult;

            const dummyBodyRequest = {
                verificationCode: 'testVerificationCode',
                token: 'temporaryToken',
            };

            service.verify(dummyBodyRequest).subscribe((result) => {
                expect(result).toBeTruthy();
                expect(result).toEqual(dummyVerifyResult);
            });

            const req = httpMock.expectOne(verifyEndpoint);

            expect(req.request.method).toBe('POST');
            req.flush(dummyVerifyResult);
        });

        it('should throw with an error message when API returns an error', () => {
            const verifyEndpoint = apiInfo.apiPoints.verify;

            const dummyBodyRequest = {
                verificationCode: 'testVerificationCode',
                token: 'temporaryToken',
            };

            service.verify(dummyBodyRequest).subscribe({
                error(actualError) {
                    expect(of(actualError)).toBeTruthy();
                    expect(actualError).not.toBeNull();
                    expect(actualError).not.toBeUndefined();
                },
            });

            const req = httpMock.expectOne(verifyEndpoint);

            expect(req.request.method).toBe('POST');
            req.flush({ errorMessage: 'Uh oh!' }, { status: 500, statusText: 'Server Error' });
        });
    });

    describe('#whoAmI', () => {
        it('should return an Observable<fhir.Person>', () => {
            const whoAmIEndpoint = apiInfo.apiPoints.whoAmI;

            const dummyWhoAmIResult = {
                resourceType: 'Person',
            } as fhir.Person;

            service.whoAmI().subscribe((result) => {
                expect(result).toBeTruthy();
                expect(result).toEqual(dummyWhoAmIResult);
            });

            const req = httpMock.expectOne(whoAmIEndpoint);

            expect(req.request.method).toBe('GET');
            req.flush(dummyWhoAmIResult);
        });

        it('should throw with an error message when API returns an error', () => {
            const whoAmIEndpoint = apiInfo.apiPoints.whoAmI;

            service.whoAmI().subscribe({
                error(actualError) {
                    expect(of(actualError)).toBeTruthy();
                    expect(actualError).not.toBeNull();
                    expect(actualError).not.toBeUndefined();
                },
            });

            const req = httpMock.expectOne(whoAmIEndpoint);

            expect(req.request.method).toBe('GET');
            req.flush({ errorMessage: 'Uh oh!' }, { status: 500, statusText: 'Server Error' });
        });
    });

    describe('logged in user', () => {
        it('should be created user with null value', () => {
            expect(service.user).toBeNull();
        });

        it('should change a user value', () => {
            const newUserValue = { user: 1, resourceType: 'Person' } as fhir.Person;

            expect(service.user).toBeNull();
            service.setUser(newUserValue);

            expect(service.user).toEqual(newUserValue);
        });

        it('the observable should emit changes about new user value', () => {
            const newUserValue = { user: 2, resourceType: 'Person' } as fhir.Person;
            service.setUser(newUserValue);
            service.userAsObservable$.subscribe((result) => {
                expect(result).toEqual(newUserValue);
            });
        });

        it('should set current user', async () => {
            const dummyPerson = { user: 3, resourceType: 'Person' } as fhir.Person;
            spyOn(service, 'whoAmI').and.returnValue(of(dummyPerson));

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const userServiceSetUserSpy = spyOn(service, 'setUser').and.callThrough();
            await service.loadPerson();
            service.userAsObservable$.subscribe((result) => {
                expect(userServiceSetUserSpy).toHaveBeenCalled();
                expect(result).toEqual(dummyPerson);
            });
        });

        it('should call WhoAmI only once', () => {
            const dummyPerson = { user: 3, resourceType: 'Person' } as fhir.Person;
            const whoAmI = spyOn(service, 'whoAmI').and.returnValue(of(dummyPerson).pipe(delay(500)));

            const userServiceSetUserSpy = spyOn(service, 'setUser').and.callThrough();
            service.loadPerson();
            service.loadPerson();
            service.loadPerson(); //called it 3 times

            expect(whoAmI).toHaveBeenCalledTimes(1); // whoAmI should called only once
        });
    });

    describe('logout', () => {
        it('should clear the page title', fakeAsync(async () => {
            const titleSpy = spyOn(TestBed.inject(Title), 'setTitle').and.callThrough();
            const logoutRequest = service.logOut(false);
            const req = httpMock.expectOne(apiInfo.apiPoints.logout);
            req.flush({});
            flush();
            await logoutRequest;

            expect(titleSpy).toHaveBeenCalled();
            expect(TestBed.inject(Title).getTitle()).toEqual(TestBed.inject(APP_NAME));
        }));

        it('should call the registered callbacks on logout', fakeAsync(() => {
            let callbackFunc = jasmine.createSpy();
            service.addLogOutAction('test', callbackFunc);

            service.logOut(false);
            flushMicrotasks();
            const req = httpMock.expectOne(apiInfo.apiPoints.logout);
            req.flush({});
            flush();

            expect(callbackFunc).toHaveBeenCalledOnceWith();
        }));
    });
});
