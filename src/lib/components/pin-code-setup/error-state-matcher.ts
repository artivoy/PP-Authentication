/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PincodeErrorsValidationDirective = (form: FormGroup, controlName: string): ValidatorFn => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (control: AbstractControl): ValidationErrors | null => {
        const pinCode: string = form?.get(controlName)?.value?.pin ?? '';
        const confirmPin = form?.get(controlName)?.value?.confirmPin ?? '';
        const pinCodeArray: number[] = pinCode?.split('').map(Number);
        let containsLetters = false;
        let wrongPinPatternAscOrDesc = false;
        let wrongPinPatternRepeated = false;
        let digitsDifference = 0;
        if (pinCodeArray?.length > 0) {
            containsLetters = pinCodeArray?.includes(NaN); // Checking if we had lettters in input
            if (!containsLetters) {
                pinCodeArray.reduce((prev, current) => {
                    if (Math.abs(prev - current) === 0) {
                        // Checking if we have repeating digits
                        wrongPinPatternRepeated = true;
                    }
                    let gapBetween = Math.abs(prev + 10 - (current + 10)); // added 10 to each digit for proper handling of zeros
                    gapBetween = gapBetween === 9 ? 1 : gapBetween;
                    digitsDifference = digitsDifference + gapBetween;
                    return current;
                });
                wrongPinPatternAscOrDesc =
                    pinCodeArray.length - digitsDifference === 1 ? true : wrongPinPatternAscOrDesc;
            }
        }

        if (pinCodeArray?.length > 0 && pinCodeArray?.length < 5) {
            return { invalid: { messages: 'The PIN must consist of at least 5 digits.' } };
        } else if (containsLetters) {
            return { invalid: { messages: 'The PIN must not contain any letters.' } };
        } else if (wrongPinPatternRepeated) {
            return {
                invalid: { messages: 'The PIN cannot contain two or more identical numbers in sequence.' },
            };
        } else if (wrongPinPatternAscOrDesc) {
            return {
                invalid: { messages: 'The PIN cannot be a normal number pattern, such as 00000, 12345, etc.' },
            };
        } else if (pinCode !== confirmPin) {
            return { invalid: { messages: 'Specified PINs do not match.' } };
        }
        return null;
    };
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PincodeEmptyValidation = (form: FormGroup, controlName: string): ValidatorFn => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (control: AbstractControl): ValidationErrors | null => {
        const pinCode: string = form.get(controlName)?.value.pin;
        if (!pinCode) {
            return { invalid: { messages: 'PIN code cannot be empty.' } };
        }
        return null;
    };
};
