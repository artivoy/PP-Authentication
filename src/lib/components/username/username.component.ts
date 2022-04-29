import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EAuthenticationFormType } from '../../models/form-type';

@Component({
    selector: 'mqm-username',
    templateUrl: './username.component.html',
    styleUrls: ['./username.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsernameComponent {
    @Input() formGroup!: FormGroup;
    @Input() groupName!: EAuthenticationFormType;
    @Input() controlName!: string;

    public EAuthenticationFormType = EAuthenticationFormType;
}
