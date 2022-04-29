/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { FormBuilder } from '@angular/forms';
import { EAuthenticationFormType } from '../../models/form-type';
import { PincodeEmptyValidation, PincodeErrorsValidationDirective } from './error-state-matcher';

describe('PincodeValidator', () => {
    const form = new FormBuilder().group({
        pin: new FormBuilder().group({
            pin: [null],
            confirmPin: [null],
        }),
    });

    const pincode = form.get('pin').get('pin');
    const pinVerify = form.get('pin').get('confirmPin');
    const pinCodeValidator = PincodeErrorsValidationDirective(form, EAuthenticationFormType.pin);
    const pinCodeEmptyValidator = PincodeEmptyValidation(form, EAuthenticationFormType.pin);
    form.setValidators([
        PincodeErrorsValidationDirective(form, EAuthenticationFormType.pin),
        PincodeEmptyValidation(form, EAuthenticationFormType.pin),
    ]);

    it('should return error if pincode is empty', () => {
        pincode.setValue(null);
        pinVerify.setValue(null);

        expect(pinCodeEmptyValidator(form)).toEqual({ invalid: { messages: 'Pincode mag niet leeg zijn.' } });
    });

    it('should return null if input is valid pincode', () => {
        pincode.setValue('13214');
        pinVerify.setValue('13214');

        expect(pinCodeValidator(form)).toBeNull();
    });

    it('should return error if pincode is not match with verify', () => {
        pincode.setValue('132142');
        pinVerify.setValue('132114');

        expect(pinCodeValidator(form)).toEqual({
            invalid: { messages: 'Opgegeven pincodes komen niet met elkaar overeen.' },
        });
    });

    it('should return error if pincode is restricted pattern', () => {
        pincode.setValue('89012');
        pinVerify.setValue('89012');

        expect(pinCodeValidator(form)).toEqual({
            invalid: { messages: 'De pincode mag geen normaal nummerpatroon zijn, zoals 00000, 12345, etc.' },
        });
    });

    it('should return error if pincode less than 5 digits', () => {
        pincode.setValue('8904');
        pinVerify.setValue('8904');

        expect(pinCodeValidator(form)).toEqual({
            invalid: { messages: 'De pincode moet bestaan uit minimaal 5 cijfers.' },
        });
    });

    it('should return error if pincode has characters', () => {
        pincode.setValue('1639x');

        expect(pinCodeValidator(form)).toEqual({ invalid: { messages: 'De pincode mag geen letters bevatten.' } });
    });

    it('should return error if pincode have repeated numbers', () => {
        pincode.setValue('112201');

        expect(pinCodeValidator(form)).toEqual({
            invalid: { messages: 'De pincode mag geen twee of meerdere identieke cijfers op volgorde bevatten.' },
        });
    });

    it('should return error if pincode have ascending numbers', () => {
        pincode.setValue('12345');

        expect(pinCodeValidator(form)).toEqual({
            invalid: { messages: 'De pincode mag geen normaal nummerpatroon zijn, zoals 00000, 12345, etc.' },
        });
    });

    it('should return error if pincode have descending numbers', () => {
        pincode.setValue('54321');

        expect(pinCodeValidator(form)).toEqual({
            invalid: { messages: 'De pincode mag geen normaal nummerpatroon zijn, zoals 00000, 12345, etc.' },
        });
    });
});
