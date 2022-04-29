import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EAuthenticationFormType } from '../../models/form-type';

import { PasswordComponent } from './password.component';

describe('PasswordComponent', () => {
    let component: PasswordComponent;
    let fixture: ComponentFixture<PasswordComponent>;
    let formBuilder: FormBuilder;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PasswordComponent],
            imports: [CommonModule, FormsModule, ReactiveFormsModule],

            providers: [FormGroupDirective],
        })
            .compileComponents()
            .then(() => {
                formBuilder = TestBed.inject(FormBuilder);
            });
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PasswordComponent);
        component = fixture.componentInstance;
        let form = formBuilder.group({
            field: [null],
        });
        component.formGroup = form;
        component.controlName = 'field';
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should get control from flat form group', () => {
        fixture.detectChanges();

        expect(component.form).toBeTruthy();
    });

    it('should get controller from nested form group with one level', () => {
        component.controlName = 'field';
        component.groupName = EAuthenticationFormType.verify;
        let form = formBuilder.group({
            [EAuthenticationFormType.verify]: formBuilder.group({
                field: [null],
            }),
        });

        component.formGroup = form;
        (component as any).rootFormGroup.form = form;

        fixture.detectChanges();

        expect(component.form.get('field')).toBeTruthy();
    });

    it('should get controller from nested form group with two levels', () => {
        component.controlName = 'field';
        component.groupName = EAuthenticationFormType.verify;
        component.nestedGroupName = EAuthenticationFormType.pin;
        let form = formBuilder.group({
            [EAuthenticationFormType.verify]: formBuilder.group({
                [EAuthenticationFormType.pin]: formBuilder.group({
                    field: [null],
                }),
            }),
        });

        component.formGroup = form;
        (component as any).rootFormGroup.form = form;

        fixture.detectChanges();

        expect(component.form.get('field')).toBeTruthy();
    });
});
