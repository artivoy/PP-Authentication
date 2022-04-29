export interface ILastLoggedInUser {
    name: string;
    id: string;
    color: string;
    speciality: string;
}
export interface IPinCodeRequest {
    refreshToken: string;
    pin: string;
}

export interface IPinCodeResponse {
    status: string;
    token: string;
    lastLoginDate: Date;
    refreshToken: string;
}
export interface IStoredRefreshToken {
    id: string;
    name: string;
    token: string;
    color: string;
    initials: string;
    speciality: string;
}
