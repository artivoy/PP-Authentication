/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { PinCodeInformationComponent } from './pin-code-information.component';

describe('PinCodeInformationComponent', () => {
    let component: PinCodeInformationComponent;
    let fixture: ComponentFixture<PinCodeInformationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PinCodeInformationComponent],
            providers: [{ provide: MatDialogRef, useValue: {} }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PinCodeInformationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
