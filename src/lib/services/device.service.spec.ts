/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/naming-convention */
import { DeviceDetectorService } from 'ngx-device-detector';

import { DeviceService } from './device.service';
const deviceInfo = {
    os: 'PinkRoccade OS',
    os_version: '1.0',
    browser: 'PinkRoccade Browser',
    browser_version: '2.0',
};
const deviceDetectorServiceStub = {
    getDeviceInfo: () => deviceInfo,
};

describe('DeviceService', () => {
    let service: DeviceService;

    beforeEach(() => {
        service = new DeviceService(deviceDetectorServiceStub as unknown as DeviceDetectorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('OS info', () => {
        beforeEach(() => {
            (service as any).OS = undefined;
        });

        it('should call deviceDetectorService.getDeviceInfo', () => {
            const getDeviceInfoSpy = spyOn((service as any).deviceDetectorService, 'getDeviceInfo').and.callThrough();
            service.getOS();

            expect(getDeviceInfoSpy).toHaveBeenCalled();
        });

        it('should set the value for os, after we first try to get it', () => {
            const getDeviceInfoSpy = spyOn((service as any).deviceDetectorService, 'getDeviceInfo').and.callThrough();

            expect((service as any).OS).toBeUndefined();
            expect(service.os).toBe(`${deviceInfo.browser} - ${deviceInfo.os}`);
            expect(getDeviceInfoSpy).toHaveBeenCalled();
            expect((service as any).OS).toBe(`${deviceInfo.browser} - ${deviceInfo.os}`);
        });
    });

    describe('Device Uuid', () => {
        beforeEach(() => {
            (service as any).UUID = undefined;
        });

        it('should set the value for Uuid, after we first try to get it', () => {
            expect((service as any).UUID).toBeUndefined();
            expect(service.uuid).not.toBeUndefined();
            expect((service as any).UUID).not.toBeUndefined();
        });

        it('should return the UUID from local storage if it is set', () => {
            expect((service as any).UUID).toBeUndefined();
            spyOn(localStorage.__proto__, 'setItem');
            spyOn(localStorage.__proto__, 'getItem').and.returnValue('storedUuid');

            expect(service.uuid).toEqual('storedUuid');
            expect(localStorage.__proto__.getItem).toHaveBeenCalled();
            expect((service as any).UUID).not.toBeUndefined();
        });
    });
});
