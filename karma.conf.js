// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const { join } = require('path');
const getBaseKarmaConfig = require('../../karma.conf');

module.exports = function (config) {
    const baseConfig = getBaseKarmaConfig();
    config.set({
        ...baseConfig,
        coverageReporter: {
            ...baseConfig.coverageReporter,
            dir: join(__dirname, '../../test-reports/coverage/libs/authentication'),
        },
        junitReporter: {
            ...baseConfig.junitReporter,
            outputDir: join(__dirname, '../../test-reports/unittest/libs/authentication/'),
        },
        htmlReporter: {
            ...baseConfig.htmlReporter,
            outputFile: join(__dirname, '../../test-reports/unittest/libs/authentication/index.html'),
        },
    });
};
