import { Component, ChangeDetectionStrategy, Input, OnInit } from '@angular/core';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { EAuthenticationFormType } from '../../models/form-type';

@Component({
    selector: 'mqm-password',
    templateUrl: './password.component.html',
    styleUrls: ['./password.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordComponent implements OnInit {
    public showPassword = false;
    @Input() formGroup!: FormGroup;
    @Input() groupName!: EAuthenticationFormType;
    @Input() nestedGroupName: EAuthenticationFormType | undefined;
    @Input() controlName!: string;
    @Input() placeholder = 'Wachtwoord';
    @Input() inputmode = 'text';
    @Input() pattern = '';

    public form: FormGroup | undefined;

    constructor(private rootFormGroup: FormGroupDirective) {}

    ngOnInit(): void {
        if (this.groupName) {
            this.form = this.rootFormGroup.form.get(this.groupName) as FormGroup;
            if (this.nestedGroupName) {
                this.form = this.form.get(this.nestedGroupName) as FormGroup;
            }
        } else {
            this.form = this.formGroup;
        }
    }
}
