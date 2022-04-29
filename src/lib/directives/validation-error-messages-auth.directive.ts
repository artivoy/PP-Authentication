/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
    selector: '[mqValidationErrorMessagesAuth]',
})
export class ValidationErrorMessagesAuthDirective implements OnInit, AfterViewInit, OnDestroy {
    @Input('mqValidationErrorMessagesAuth') public control!: AbstractControl;
    private block!: HTMLDivElement;
    private errorMessages: string[] = [];
    private subscription!: Subscription;
    constructor(private readonly elRef: ElementRef<HTMLElement>) {}

    public ngOnInit(): void {
        this.createErrorsBlock();
        this.subscription = this.control?.statusChanges?.subscribe(() => {
            this.checkErrors();
        });
    }

    public ngAfterViewInit(): void {
        if (this.control?.errors) {
            this.checkErrors();
        }
    }

    public ngOnDestroy(): void {
        this.block?.remove();
        this.subscription?.unsubscribe();
    }

    private createErrorsBlock(): void {
        this.block = document.createElement('div');
        this.block.classList.add('validation-error-messages');
    }

    private checkErrors(): void {
        this.removeErrorBlock();
        if (this.control?.errors) {
            this.elRef.nativeElement.classList.add('ng-invalid');
            this.errorMessages = this.getControlErrorsMessages();
            this.addErrorBlock();
        }
    }

    private addErrorBlock(): void {
        if (this.errorMessages?.length > 0) {
            this.block.innerHTML = this.errorMessages
                .map((errorMessage) => `<mat-error>${errorMessage}</mat-error>`)
                .join('');
            this.elRef.nativeElement.appendChild(this.block);
        }
    }

    private removeErrorBlock(): void {
        if (!this.elRef.nativeElement.classList.contains('ng-invalid')) {
            return;
        }
        this.elRef.nativeElement.classList.remove('ng-invalid');

        const result = this.elRef.nativeElement.getElementsByClassName('validation-error-messages');
        if (result?.length) {
            this.elRef.nativeElement.removeChild(this.block);
        }

        this.block.innerHTML = '';
    }

    private getControlErrorsMessages(): string[] {
        const errorMessages: string[] = [];
        for (const key in this.control.errors) {
            if (Object.prototype.hasOwnProperty.call(this.control?.errors, key)) {
                const error = this.control?.errors?.[key];
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (error?.messages) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    errorMessages.push(error?.messages as string);
                }
            }
        }
        return errorMessages;
    }
}
