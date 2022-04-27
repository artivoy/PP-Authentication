"use strict";
/// <reference lib="webworker" />
addEventListener('message', messageEvent => {
    networkRequest(messageEvent.data);
});
async function  networkRequest(data) {
    let logindata = '';

    if (data.request === 'login'){
        logindata = {
            username: data.username,
            password: data.password,
            deviceId: data.deviceId,
            deviceOS: data.deviceOS
        }
    }
    if (data.request === 'verify'){
        logindata = {
            verificationCode: data.verificationCode,
            token: data.token,
            pin: data.pin,
        }
    }

    const options = {
        method: 'POST',
        body: JSON.stringify(logindata),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // send post request
    await fetch(data.url, options)
        .then(res => res.json())
        .then(res => { postMessage(res);})
        .catch(err => { postMessage(err);});
}
