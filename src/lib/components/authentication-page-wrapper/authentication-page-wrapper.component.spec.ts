import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ENVIRONMENT } from '@app/common';
import { MaterialModule } from '@app/material-module';
import { AuthenticationService } from '../../services/authentication.service';

import { AuthenticationPageWrapperComponent } from './authentication-page-wrapper.component';

describe('AuthenticationPageWrapperComponent', () => {
    let component: AuthenticationPageWrapperComponent;
    let fixture: ComponentFixture<AuthenticationPageWrapperComponent>;
    const authModuleRoute = 'testlogin';

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AuthenticationPageWrapperComponent],
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
                { provide: APP_NAME, useValue: 'mQ - Test' },
                { provide: APP_SHORT_NAME, useValue: 'Test' },
                { provide: ENVIRONMENT, useValue: {} },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AuthenticationPageWrapperComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
