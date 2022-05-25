import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@app/common';

import { LogoutComponent } from './logout.component';

describe('LogoutComponent', () => {
    let component: LogoutComponent;
    let fixture: ComponentFixture<LogoutComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LogoutComponent],
            providers: [{ provide: ENVIRONMENT, useValue: { routes: { authenticationModule: 'login' } } }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(LogoutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
