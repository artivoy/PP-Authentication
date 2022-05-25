/* eslint-disable @typescript-eslint/naming-convention */
import { Injectable } from '@angular/core';
import { Utils } from '@app/common';
import { DeviceDetectorService } from 'ngx-device-detector';

const DEVICE_ID = 'deviceId';
@Injectable({
    providedIn: 'root',
})
export class DeviceService {
    private OS!: string;
    private UUID!: string;
    public get deviceType(): string {
        return this.getDeviceType();
    }

    public get os(): string {
        if (!this.OS) {
            this.OS = this.getOS();
        }

        return this.OS;
    }

    public get uuid(): string {
        if (!this.UUID) {
            const storedUuid = localStorage.getItem(DEVICE_ID);
            if (!storedUuid) {
                this.UUID = Utils.generateUuid();
                localStorage.setItem(DEVICE_ID, this.UUID);
            } else {
                this.UUID = storedUuid;
            }
        }
        return this.UUID;
    }

    constructor(private readonly deviceDetectorService: DeviceDetectorService) {}

    public getOS(): string {
        const deviceInfo = this.deviceDetectorService.getDeviceInfo();
        return `${deviceInfo.browser} - ${deviceInfo.os}`;
    }

    public getDeviceType(): string {
        const deviceInfo = this.deviceDetectorService.getDeviceInfo();
        return deviceInfo.deviceType ?? 'desktop';
    }
}
