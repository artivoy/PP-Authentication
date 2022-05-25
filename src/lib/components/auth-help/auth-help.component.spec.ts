import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, ENVIRONMENT, MessagesService } from '@app/common';
import { MaterialModule } from '@app/material-module';
import { AuthenticationService } from '../../services/authentication.service';

import { AuthHelpComponent } from './auth-help.component';

describe('AuthHelpComponent', () => {
    let component: AuthHelpComponent;
    let fixture: ComponentFixture<AuthHelpComponent>;
    let httpClient: HttpClient;
    let httpTestingController: HttpTestingController;
    const authModuleRoute = 'testlogin';

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AuthHelpComponent],
            imports: [RouterTestingModule.withRoutes([]), MaterialModule, HttpClientTestingModule],
            providers: [
                AuthenticationService,
                MessagesService,
                { provide: ENVIRONMENT, useValue: { routes: { authenticationModule: authModuleRoute } } },
                { provide: APP_NAME, useValue: 'mQ - Test' },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        httpClient = TestBed.inject(HttpClient);
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(AuthHelpComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
