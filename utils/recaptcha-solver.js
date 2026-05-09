const axios = require('axios');

const recaptchaClient = axios.create({
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000
});

function buildCo(url) {
    const { origin, protocol } = new URL(url);
    const port = protocol === 'https:' ? '443' : '80';
    return Buffer.from(`${origin}:${port}`).toString('base64').replace(/=/g, '');
}

async function solveRecaptchaV3({ sitekey, url, co, action, v, hl, anchorUrl } = {}) {
    let versionPath = 'api2';
    let paramsString;

    if (anchorUrl) {
        const match = anchorUrl.match(/(api2|enterprise)\/anchor\?(.*)/);
        [, versionPath, paramsString] = match;
    } else {
        const coParam = co ?? (url ? buildCo(url) : null);
        paramsString = new URLSearchParams({
            ar: '1',
            k: sitekey,
            co: coParam,
            hl: hl ?? 'en',
            v: v ?? 'pCoGBhjs9s8EhFOHJFe8cqis',
            size: 'invisible',
            cb: Math.random().toString(36).slice(2)
        }).toString();
    }

    const base = `https://www.google.com/recaptcha/${versionPath}/`;
    const params = Object.fromEntries(new URLSearchParams(paramsString));

    try {
        const anchorRes = await recaptchaClient.get(`${base}anchor?${paramsString}`);
        const tokenMatch = anchorRes.data.match(/"recaptcha-token" value="(.*?)"/);
        
        const postData = new URLSearchParams({
            v: params.v,
            reason: 'q',
            c: tokenMatch[1],
            k: params.k,
            co: params.co,
            ...(action ? { sa: action } : {})
        }).toString();

        const reloadRes = await recaptchaClient.post(`${base}reload?k=${params.k}`, postData);
        const answerMatch = reloadRes.data.match(/"rresp","(.*?)"/);
        
        if (!answerMatch) {
        }
        
        return answerMatch[1];
    } catch (error) {
        throw error;
    }
}

module.exports = { solveRecaptchaV3, buildCo };
