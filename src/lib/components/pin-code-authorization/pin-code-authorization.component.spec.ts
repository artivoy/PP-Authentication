/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ENVIRONMENT, MessagesService } from '@app/common';
import { MaterialModule } from '@app/material-module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthenticationService } from '../../services/authentication.service';
import { PinCodeAuthorizationComponent } from './pin-code-authorization.component';

describe('PinCodeAuthorizationComponent', () => {
    let component: PinCodeAuthorizationComponent;
    let fixture: ComponentFixture<PinCodeAuthorizationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PinCodeAuthorizationComponent],
            imports: [
                MatDialogModule,
                HttpClientTestingModule,
                RouterTestingModule,
                FormsModule,
                ReactiveFormsModule,
                MaterialModule,
                BrowserAnimationsModule,
            ],
            providers: [
                { provide: MessagesService, useValue: {} as MessagesService },
                MessagesService,
                AuthenticationService,
                FormBuilder,
                { provide: ENVIRONMENT, useValue: {} },
                { provide: APP_NAME, useValue: 'mQ - Test' },
                { provide: APP_SHORT_NAME, useValue: 'Test' },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PinCodeAuthorizationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should track errors to console', fakeAsync(() => {
        let consoleError = spyOn(console, 'error').and.callThrough();
        component.error$.next('test error');

        expect(consoleError).toHaveBeenCalled();
    }));
});
