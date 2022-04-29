/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
    apiInfo,
    ApiMetadataService,
    APP_NAME,
    Constants,
    CurrentUserService,
    ENVIRONMENT,
    Environment,
    EventService,
    FunctionalError,
    ICommonEvent,
    MessagesService,
    PersonUtils,
} from '@mq/common';
import { PermissionService } from '@mq/permissions';
import moment from 'moment';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize, share, take } from 'rxjs/operators';
import { EAuthenticationFormType } from '../models/form-type';
import { ILastLoggedInUser, IPinCodeRequest, IPinCodeResponse, IStoredRefreshToken } from '../models/loggedUser';
import { ILoginRequest, ILoginResult } from '../models/login';
import { IVerificationRequest } from '../models/verify';

export const localStorageNames = {
    lastLogged: 'lastLogged',
    firstLoginDate: 'firstLoginDate',
    pinIsSet: 'pinIsSet',
    pinCodeUsers: 'pinCodeUsers',
    serverLogOut: 'serverLogOut',
};

@Injectable({
    providedIn: 'root',
})
export class AuthenticationService {
    public shouldUseOnlyCookieLogout = false;

    public get user(): fhir.Person | null {
        return this.currentUser.user;
    }
    public get employeeId(): string {
        return this.currentUser.employeeId;
    }
    public get userAsObservable$(): Observable<fhir.Person | null> {
        return this.currentUser.currentUserAsObservable$;
    }
    public lastLoggedUsers: ILastLoggedInUser[] = [];
    public showPinLogin$: BehaviorSubject<boolean> = new BehaviorSubject(this.getPinSetState());

    private logOutActions: { [key: string]: () => Promise<void> } = {};

    private formView$ = new BehaviorSubject<EAuthenticationFormType>(EAuthenticationFormType.login);
    private loading$ = new BehaviorSubject<boolean>(false);

    private get firstLoginDateLocalStorageKey() {
        return `${localStorageNames.firstLoginDate}-${this.user?.id}`;
    }

    public get loadingSubject() {
        return this.loading$;
    }
    public get isLoading() {
        return this.loading$.getValue();
    }
    public get formView() {
        return this.formView$;
    }
    private personCachedObservable: Observable<fhir.Person> | undefined = undefined;

    constructor(
        private readonly httpClient: HttpClient,
        private readonly router: Router,
        private readonly messagesService: MessagesService,
        private readonly dialogRef: MatDialog,
        private readonly permissionsService: PermissionService,
        private readonly eventService: EventService,
        private readonly titleService: Title,
        private readonly currentUser: CurrentUserService,
        private apiMetadataService: ApiMetadataService,
        @Inject(APP_NAME) public appName: string,
        @Inject(ENVIRONMENT) public readonly environment: Environment
    ) {}

    public login(bodyRequest: ILoginRequest): Observable<ILoginResult> {
        return this.httpClient.post<ILoginResult>(apiInfo.apiPoints.login, bodyRequest).pipe(
            catchError((loginError: HttpErrorResponse) => {
                const backendFailure = 'Error trying to issue a verification token: Unable to create socket to';
                const backendFailureResponse =
                    'Kan inloggegevens niet controleren omdat de mijnQuarant server niet beschikbaar is. Probeer het later nog een keer.';

                if (JSON.stringify(loginError.error)?.includes(backendFailure)) {
                    return throwError(backendFailureResponse);
                }
                return throwError(loginError);
            })
        );
    }

    public verify(bodyVerifyRequest: IVerificationRequest): Observable<ILoginResult> {
        return this.httpClient.post<ILoginResult>(apiInfo.apiPoints.verify, bodyVerifyRequest);
    }

    public pinCode(bodyPinRequest: IPinCodeRequest): Observable<IPinCodeResponse> {
        return this.httpClient.post<IPinCodeResponse>(apiInfo.apiPoints.refresh, bodyPinRequest).pipe(
            catchError((loginError: HttpErrorResponse | FunctionalError) => {
                const stringifiedErrorMessage =
                    loginError instanceof HttpErrorResponse
                        ? JSON.stringify(loginError.error)
                        : JSON.stringify(loginError.message);

                const backendFailure = 'Error trying to issue a verification token: Unable to create socket to';
                const backendFailureResponse =
                    'Unable to verify credentials because the server is unavailable. Try again later.';
                if (stringifiedErrorMessage.includes(backendFailure)) {
                    return throwError(backendFailureResponse);
                }

                const verificationFailure = 'Error trying to get the backend to refresh a token for you.';
                const verificationFailureResponse = 'Entered PIN code is incorrect. Try again.';
                if (stringifiedErrorMessage.includes(verificationFailure)) {
                    return throwError(verificationFailureResponse);
                }

                const invalidTokenFailure = 'You are not allowed to access this resource without a valid token';
                const invalidTokenFailureResponse =
                    'Your PIN has expired or is incorrect. Try again, or go to forgot PIN.';
                if (stringifiedErrorMessage.includes(invalidTokenFailure)) {
                    return throwError(invalidTokenFailureResponse);
                }

                const unexpectedFailure =
                    'Unexpected exception processing your token. Try again in a minute or two. If it persists, then please contact support.';
                const unexpectedFailureResponse =
                    'Your login token could not be processed. Please try again later. If the problem persists, please contact your management organization.';
                if (stringifiedErrorMessage.includes(unexpectedFailure)) {
                    return throwError(unexpectedFailureResponse);
                }

                return throwError(loginError);
            })
        );
    }

    public whoAmI(): Observable<fhir.Person> {
        return this.httpClient.get<fhir.Person>(apiInfo.apiPoints.whoAmI);
    }

    public async logOut(redirectToLogin = true): Promise<void> {
        try {
            // exec added callback function
            for (const key of Object.keys(this.logOutActions)) {
                await this.logOutActions[key]();
            }

            this.isOnlyCookieLogOut()
                ? await this.onlyCookieLogOut()
                : await this.httpClient.post(apiInfo.apiPoints.logout, null).toPromise();

            this.setUser(null);

            // Clear the title of any sensitive information
            this.titleService.setTitle(this.appName);

            this.permissionsService.clearPermissions();

            this.messagesService.dismissLastMessage();
            this.messagesService.success('Successfully logged out!');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err.message?.includes('You are not or no longer logged in.')) {
                this.setUser(null);
            } else {
                this.messagesService.info('Failed to log out');
                console.error('Failing to logout.', err);
            }
        } finally {
            if (redirectToLogin) {
                this.dialogRef.closeAll();
                this.formView.next(EAuthenticationFormType.login);
                const url = this.router.url;
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                this.router.navigate([`/${this.environment?.routes?.authenticationModule || 'login'}`], {
                    queryParams: {
                        returnUrl: url,
                    },
                });
            }
        }
    }

    public setUser(user: fhir.Person | null): void {
        this.currentUser.setUser(user);
        const event: ICommonEvent = {
            type: Constants.USER_CHANGED,
            data: user,
        };
        this.eventService.emit(event);
    }

    public async loadPerson(): Promise<fhir.Person> {
        let observable: Observable<fhir.Person>;

        if (this.personCachedObservable) {
            observable = this.personCachedObservable;
        } else {
            this.personCachedObservable = this.whoAmI().pipe(
                take(1),
                share(),
                finalize(() => {
                    // reset the cache, so we actually call the api again on the next auth check.
                    // caching is only meant for short term to prevent duplicate requests shortly after each other.
                    this.personCachedObservable = undefined;
                })
            );
            observable = this.personCachedObservable;
        }

        const res = observable.toPromise();
        res.then(
            (result) => {
                if (result?.resourceType === 'Person') {
                    this.setUser(result);
                }
            },
            (error) => {
                // Avoid showing error messages if we are not logged in.
                if (error.status !== 500) {
                    this.messagesService.exception(error);
                }
            }
        );
        return res;
    }

    public async isLoggedIn(): Promise<boolean> {
        if (!this.user) {
            try {
                await this.loadPerson();
            } catch {
                // Something went wrong during the loadPerson, which is most likely because we are not logged in
                // So do nothing with that and just return false.
                return false;
            }
        }
        return !!this.user;
    }

    public addLogOutAction(key: string, callBackFunc: () => Promise<void>): void {
        this.logOutActions[key] = callBackFunc;
    }

    public verifyPin(pin: string): Observable<{ pin: string }> {
        return this.httpClient.post<{ pin: string }>(apiInfo.apiPoints.verifyPin, { pin });
    }

    public storeUserData() {
        this.addLastLoggedInUser();
        this.addFirstLoginDate();
    }

    public getFirstLoginDate(): Date | null {
        const firstLoginDate = localStorage.getItem(this.firstLoginDateLocalStorageKey);
        return firstLoginDate ? new Date(firstLoginDate) : null;
    }

    private loadLastLoggedInUsers() {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        this.lastLoggedUsers = JSON.parse(localStorage.getItem(localStorageNames.lastLogged) || '[]');
    }

    private addFirstLoginDate() {
        const storedFirstLoginDate = this.getFirstLoginDate();
        if (!storedFirstLoginDate) {
            this.loadPerson().then(() => {
                const today = moment().format();
                localStorage.setItem(this.firstLoginDateLocalStorageKey, today);
            });
        }
    }

    private async addLastLoggedInUser() {
        this.loadLastLoggedInUsers();
        let lastLoggedUser: ILastLoggedInUser | undefined;

        const isLoggedIn = await this.isLoggedIn();

        if (isLoggedIn) {
            lastLoggedUser = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                name: PersonUtils.getFullNameOrPresentationName(this.user as any) ?? 'Onbekend',
                id: this.user?.id ?? '',
                color: this.user ? PersonUtils.getPersonColor(this.user) : '',
                speciality: this.user ? PersonUtils.getEmployeeSpeciality(this.user) : '',
            };
            if (lastLoggedUser.id !== '') {
                this.deleteFromLastLoggedInUsers(lastLoggedUser);
                this.lastLoggedUsers?.unshift(lastLoggedUser);
                this.saveLastLoggedInUsers();
            }
        }
    }

    private deleteFromLastLoggedInUsers(user: ILastLoggedInUser) {
        if (user) {
            this.loadLastLoggedInUsers();
            this.lastLoggedUsers = this.lastLoggedUsers.filter((u) => !(u.id === user.id));
        }
    }

    private saveLastLoggedInUsers() {
        if (this.lastLoggedUsers?.length) {
            localStorage.setItem(localStorageNames.lastLogged, JSON.stringify(this.lastLoggedUsers));
        }
    }

    public savePinSetState(set: boolean) {
        localStorage.setItem(localStorageNames.pinIsSet, JSON.stringify(set));
        this.showPinLogin$.next(set);
    }
    public getPinSetState() {
        return (
            JSON.parse(localStorage.getItem(localStorageNames.pinIsSet) || 'false') &&
            JSON.parse(localStorage.getItem(localStorageNames.pinCodeUsers) || '[]').length > 0
        );
    }
    public setOnlyCookieLogOut(set: boolean) {
        localStorage.setItem(localStorageNames.serverLogOut, JSON.stringify(set));
    }
    public isOnlyCookieLogOut(): boolean {
        return JSON.parse(localStorage.getItem(localStorageNames.serverLogOut) || 'false');
    }

    public setUpPinLogOut(set: boolean) {
        this.setOnlyCookieLogOut(set);
        this.shouldUseOnlyCookieLogout = set;
    }

    public storeRefreshToken(refreshToken: string) {
        const storedUser = this.composeUserInfo(this.user, refreshToken);
        if (storedUser) {
            let localPinUsers: IStoredRefreshToken[] | undefined = JSON.parse(
                localStorage.getItem(localStorageNames.pinCodeUsers) || '[]'
            );
            if (localPinUsers?.find((user) => user.id.toUpperCase() === storedUser.id.toUpperCase())) {
                this.deleteFromPincodeUsers(storedUser.id);
            }
            localPinUsers = JSON.parse(localStorage.getItem(localStorageNames.pinCodeUsers) || '[]');
            localPinUsers?.unshift(storedUser);
            if (localPinUsers && localPinUsers?.length > 5) localPinUsers.length = 5;
            localStorage.setItem(localStorageNames.pinCodeUsers, JSON.stringify(localPinUsers));
        }
    }

    public getPinCodeUsers(): IStoredRefreshToken[] {
        return JSON.parse(localStorage.getItem(localStorageNames.pinCodeUsers) || '[]');
    }

    public setPinCodeUserToFirst(user: IStoredRefreshToken) {
        const localPinUsers = this.getPinCodeUsers();
        localStorage.setItem(
            localStorageNames.pinCodeUsers,
            JSON.stringify([user, ...localPinUsers.filter((localUser) => localUser.id !== user.id)])
        );
    }

    public getStoredUserRefreshToken(user: string): string | undefined {
        const localPinUsers = this.getPinCodeUsers();
        if (localPinUsers) {
            const refreshToken = localPinUsers.find((storedUser) => storedUser.name === user)?.token;
            return refreshToken ?? undefined;
        }
        return undefined;
    }

    public deleteFromPincodeUsers(userId: string) {
        let localPinUsers = this.getPinCodeUsers();
        localPinUsers =
            localPinUsers?.filter((storedUser) => storedUser.id.toUpperCase() !== userId.toUpperCase()) || [];
        localStorage.setItem(localStorageNames.pinCodeUsers, JSON.stringify(localPinUsers));
    }

    public composeUserInfo(user: fhir.Person | null, refreshToken: string): IStoredRefreshToken | undefined {
        const userId = user?.id?.toUpperCase();
        if (user?.name && userId) {
            return {
                name: PersonUtils.getFullNameOrPresentationName(user) ?? 'Onbekend',
                speciality: PersonUtils.getEmployeeSpeciality(user),
                id: userId,
                token: refreshToken,
                initials: PersonUtils.getNameInitials(user),
                color: PersonUtils.getPersonColor(user),
            };
        }
        return undefined;
    }
    public getPhonenumber(): Observable<string | undefined> {
        this.loading$.next(true);
        return this.apiMetadataService.contactInfo.pipe(finalize(() => this.loading$.next(false)));
    }

    public async onlyCookieLogOut() {
        await this.httpClient.post(apiInfo.apiPoints.resetCookie, null).toPromise();
    }
}
