import { Environment } from '@mq/common';
import { AuthConfig, OAuthModuleConfig } from 'angular-oauth2-oidc';

export const oauthConfig: (e: Environment) => AuthConfig = (environment) => {
    if (!oauthIsConfigured(environment)) {
        return {} as AuthConfig;
    }

    return {
        issuer: environment.oauth?.issuer, //(required parameter (called ObjectId in Azure))
        clientId: environment.oauth?.clientId, //(required parameter (called ApplicationId in Azure))
        // Important: Request offline_access to get a refresh token
        scope: environment.oauth?.scope ?? 'openid profile email offline_access', // For Azure we need an extra custom api to get a valid signed JWT (optional parameter, defaults to "openid profile email offline_access")

        showDebugInformation: !!environment.production,
        requireHttps: false, // Debugging without HTTPS
        redirectUri: `${window.location.origin}/login`,
        postLogoutRedirectUri: `${window.location.origin}/login/logout`,
        responseType: 'code', // CodeFlow (code) is the recommended flow (vs implicit flow)
        strictDiscoveryDocumentValidation: false, // Microsoft Azure endpoints require this to be false
        maxRefreshRetries: 5, // Allow this many retries before giving up on refreshing the token.
    };
};

export const oauthModuleConfig: (e: Environment) => OAuthModuleConfig = (environment) => {
    if (!oauthIsConfigured(environment)) {
        return {} as OAuthModuleConfig;
    }
    const config: OAuthModuleConfig = {
        // Inject "Authorization: Bearer ..." header for the request to the apiURL
        resourceServer: {
            allowedUrls: [environment.apiURL],
            sendAccessToken: true,
        },
    };
    return config;
};

export const oauthIsConfigured: (e: Environment) => boolean = (environment) => {
    return !!environment.oauth?.issuer && !!environment.oauth.clientId;
};
