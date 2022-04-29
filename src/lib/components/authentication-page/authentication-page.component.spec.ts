/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ENVIRONMENT, MessagesService } from '@mq/common';
import { PrOAuthService } from '../../services/oauth.service';
import { AuthenticationPageComponent } from './authentication-page.component';

describe('AuthenticationPageComponent', () => {
    let component: AuthenticationPageComponent;
    let fixture: ComponentFixture<AuthenticationPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AuthenticationPageComponent],
            imports: [MatDialogModule, HttpClientTestingModule, RouterTestingModule],
            providers: [
                {
                    provide: APP_NAME,
                    useValue: 'mQ - Test',
                },
                {
                    provide: APP_SHORT_NAME,
                    useValue: 'Test',
                },
                {
                    provide: MessagesService,
                    useValue: {} as MessagesService,
                },
                { provide: ENVIRONMENT, useValue: {} },
                { provide: PrOAuthService, useValue: { isConfigured: () => false } as PrOAuthService },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AuthenticationPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
