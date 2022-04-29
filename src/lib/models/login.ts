import { EResponseStatus } from './status';
import { EVerifyMethod } from './verify';

export interface ILoginRequest {
    username: string;
    password: string;
    deviceId: string;
    deviceOS: string;
}

export interface ILoginResult {
    status: EResponseStatus;
    method: EVerifyMethod;
    token: string;
    lastLoginDate: Date; // Format: yyyy-MM-dd'T'HH:mm:ss.SZ
    refreshToken?: string;
}
