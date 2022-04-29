export interface IVerificationRequest {
    verificationCode: string;
    token: string;
    pin?: string;
}

export enum EVerifyMethod {
    SMS = 'SMS',
    Email = 'e-mail',
}
