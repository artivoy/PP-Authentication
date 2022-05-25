/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { APP_NAME, APP_SHORT_NAME, ENVIRONMENT, MessagesService } from '@app/common';
import { PinCodeSetupComponent } from './pin-code-setup.component';

describe('PinCodeSetupComponent', () => {
    let component: PinCodeSetupComponent;
    let fixture: ComponentFixture<PinCodeSetupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PinCodeSetupComponent],
            imports: [MatDialogModule, HttpClientTestingModule, RouterTestingModule, FormsModule, ReactiveFormsModule],
            providers: [
                { provide: APP_NAME, useValue: 'mQ - Test' },
                { provide: APP_SHORT_NAME, useValue: 'Test' },
                { provide: MessagesService, useValue: {} as MessagesService },
                { provide: ENVIRONMENT, useValue: {} },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PinCodeSetupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
