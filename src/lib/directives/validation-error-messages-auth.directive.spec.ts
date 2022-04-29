/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ElementRef } from '@angular/core';
import { ValidationErrorMessagesAuthDirective } from './validation-error-messages-auth.directive';

describe('ValidationErrorMessagesAuthDirective', () => {
    it('should create an instance', () => {
        const directive = new ValidationErrorMessagesAuthDirective({} as ElementRef);

        expect(directive).toBeTruthy();
    });
});
