import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'mq-pin-code-information',
    templateUrl: './pin-code-information.component.html',
    styleUrls: ['./pin-code-information.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinCodeInformationComponent {
    constructor(public dialogRef: MatDialogRef<PinCodeInformationComponent>) {}

    onClose(): void {
        this.dialogRef.close();
    }
}
