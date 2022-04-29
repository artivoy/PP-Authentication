/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ENVIRONMENT } from '@mq/common';
import { MaterialModule } from '@mq/material-module';
import { AuthenticationService } from '../../services/authentication.service';

import { FastAuthenticationComponent } from './fast-authentication.component';

describe('FastAuthenticationComponent', () => {
    let component: FastAuthenticationComponent;
    let fixture: ComponentFixture<FastAuthenticationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FastAuthenticationComponent],
            imports: [
                HttpClientTestingModule,
                RouterTestingModule.withRoutes([]),
                MaterialModule,
                BrowserAnimationsModule,
                ReactiveFormsModule,
            ],
            providers: [
                AuthenticationService,
                { provide: APP_NAME, useValue: 'mQ - Test' },
                { provide: APP_SHORT_NAME, useValue: 'Test' },
                { provide: ENVIRONMENT, useValue: {} },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(FastAuthenticationComponent);
        component = fixture.componentInstance;
        TestBed.inject(AuthenticationService).setUser({
            id: 'testUser',
            identifier: [{ system: 'https://api.mijnquarant.nl/Employee', value: 'testUser' }],
        } as fhir.Person);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
