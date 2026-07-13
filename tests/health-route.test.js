const test = require('node:test');
const assert = require('node:assert/strict');

const healthRoutePath = require.resolve('../server/api-routes/health');
const supabaseAdminPath = require.resolve('../server/supabase-admin');

function clearModuleCache() {
    delete require.cache[healthRoutePath];
    delete require.cache[supabaseAdminPath];
}

test('health route probes app_settings with a column that exists in the schema', async () => {
    clearModuleCache();

    const supabaseAdmin = require('../server/supabase-admin');
    const calls = [];

    supabaseAdmin.supabaseFetch = async (url) => {
        calls.push(url);
        return {};
    };
    supabaseAdmin.send = (response, statusCode, payload) => {
        response.statusCode = statusCode;
        response.body = payload;
    };

    const handler = require('../server/api-routes/health');
    const response = {};

    await handler({ method: 'GET' }, response);

    assert.deepEqual(calls, ['/rest/v1/app_settings?select=setting_key&limit=1']);
    clearModuleCache();
});
