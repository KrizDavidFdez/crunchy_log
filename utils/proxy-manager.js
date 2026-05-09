const PROXY_LIST = [
    '54.83.185.141:3128',
    '72.10.160.174:13093',
    '67.43.236.22:22079',
    '72.10.160.91:8167',
    '85.210.203.188:8080',
    '51.222.161.115:80',
    '104.248.98.31:3128',
    '4.158.55.159:8080',
    '67.43.228.251:3343',
    '13.37.73.214:80',
    '148.72.165.7:30127',
    '43.134.68.153:3128',
    '223.135.156.183:8080',
    '114.129.2.82:8081',
    '64.92.82.59:8080',
    '185.240.49.141:8888',
    '160.86.242.23:8080',
    '129.226.193.16:3128',
    '72.10.160.170:2657',
    '40.76.69.94:8080',
    '4.158.175.186:8080',
    '35.220.254.137:8080',
    '43.153.207.93:3128',
    '43.153.208.148:3128',
    '43.133.59.220:3128',
    '43.134.121.40:3128',
    '85.210.84.189:8080',
    '198.24.188.138:37100',
    '72.10.164.178:1417',
    '67.43.236.20:10145',
    '85.210.121.11:8080',
    '72.10.160.92:5635',
    '20.26.249.29:8080',
    '41.65.236.48:1981',
    '43.134.33.254:3128',
    '79.140.235.3:3128',
    '67.43.228.250:26991',
    '67.43.228.253:12915',
    '139.84.144.214:3129',
    '178.48.68.61:18080',
    '116.102.111.238:10001',
    '87.247.186.40:1081',
    '67.43.228.254:2679',
    '67.43.227.227:11023',
    '72.10.160.173:29439',
    '148.72.140.24:30127',
    '72.10.160.94:8355',
    '47.250.11.111:80',
    '5.189.184.6:80',
    '47.237.113.119:80',
    '176.9.238.155:16379',
    '92.60.190.79:3128',
    '178.63.180.104:3128',
    '177.153.33.94:80',
    '171.238.239.214:5000',
    '34.205.61.74:3128',
    '103.56.157.223:8080',
    '116.99.173.71:8118',
    '222.122.110.26:80',
    '103.157.218.46:3128',
    '200.60.145.167:8082',
    '20.204.214.79:3129',
    '38.65.81.118:8080',
    '20.204.212.45:3129',
    '181.129.183.19:53281',
    '20.44.189.184:3129',
    '103.125.174.49:7777',
    '20.44.188.17:3129',
    '77.237.243.242:8000',
    '212.110.188.198:34405',
    '103.166.8.228:1080',
    '43.131.45.21:8443',
    '41.111.167.61:80',
    '116.104.173.52:5020',
    '183.129.171.205:5678',
    '188.138.125.4:8080',
    '47.88.17.136:18080',
    '174.138.171.164:8900',
    '47.91.104.88:3128',
    '41.111.188.39:80',
    '182.148.186.62:8118',
    '84.214.150.146:8080',
    '201.134.169.214:8205',
    '119.47.90.76:8080',
    '20.27.86.185:8080',
    '47.91.121.127:8081',
    '52.53.191.106:3128',
    '147.139.208.214:8080',
    '139.59.147.47:3128',
    '47.89.184.18:3128',
    '103.89.15.158:1085',
    '58.240.211.250:7890',
    '35.158.109.47:8090',
    '1.52.29.215:8080',
    '38.52.208.6:999',
    '197.218.16.18:8888',
    '86.109.3.28:10346',
    '190.120.249.61:999',
    '86.109.3.27:10086',
    '185.44.232.30:53281'
];

class ProxyManager {
    constructor() {
        this.proxies = [...PROXY_LIST];
        this.currentIndex = 0;
        this.failedProxies = new Map(); // proxy -> timestamp de fallo
        this.failTimeout = 5 * 60 * 1000; // 5 minutos de timeout para proxies fallidos
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0
        };
        
        console.log(`✅ Proxy Manager inicializado con ${this.proxies.length} proxies`);
    }
    
    // Cargar proxies desde una fuente externa (opcional)
    async loadProxiesFromApi(apiUrl) {
        try {
            const axios = require('axios');
            const response = await axios.get(apiUrl, { timeout: 5000 });
            if (response.data && Array.isArray(response.data)) {
                // Filtrar proxies duplicados
                const newProxies = response.data.filter(p => !this.proxies.includes(p));
                this.proxies.push(...newProxies);
                console.log(`✅ Cargados ${newProxies.length} nuevos proxies desde API. Total: ${this.proxies.length}`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error cargando proxies desde API:', error.message);
        }
        return false;
    }
    
    // Agregar proxy manualmente
    addProxy(proxyUrl) {
        if (!this.proxies.includes(proxyUrl)) {
            this.proxies.push(proxyUrl);
            console.log(`➕ Proxy agregado: ${proxyUrl}. Total: ${this.proxies.length}`);
            return true;
        }
        return false;
    }
    
    // Agregar múltiples proxies
    addProxies(proxyList) {
        let added = 0;
        for (const proxy of proxyList) {
            if (this.addProxy(proxy)) {
                added++;
            }
        }
        console.log(`➕ Agregados ${added} nuevos proxies. Total: ${this.proxies.length}`);
        return added;
    }
    
    // Eliminar proxy
    removeProxy(proxyUrl) {
        const index = this.proxies.indexOf(proxyUrl);
        if (index !== -1) {
            this.proxies.splice(index, 1);
            this.failedProxies.delete(proxyUrl);
            console.log(`➖ Proxy eliminado: ${proxyUrl}. Total: ${this.proxies.length}`);
            return true;
        }
        return false;
    }
    
    // Obtener siguiente proxy disponible (round-robin)
    getNextProxy() {
        if (this.proxies.length === 0) {
            console.log('⚠️ No hay proxies disponibles');
            return null;
        }
        
        const availableProxies = this.proxies.filter(proxy => !this.isProxyFailed(proxy));
        
        if (availableProxies.length === 0) {
            console.log('⚠️ Todos los proxies están fallidos, limpiando lista...');
            this.cleanFailedProxies();
            // Intentar de nuevo después de limpiar
            const retryProxies = this.proxies.filter(proxy => !this.isProxyFailed(proxy));
            if (retryProxies.length === 0) {
                console.log('❌ No hay proxies disponibles después de limpiar');
                return null;
            }
            this.currentIndex = 0;
            return retryProxies[0];
        }
        
        if (this.currentIndex >= availableProxies.length) {
            this.currentIndex = 0;
        }
        
        const proxy = availableProxies[this.currentIndex];
        this.currentIndex++;
        
        // Formatear proxy para axios
        const proxyUrl = proxy.startsWith('http') ? proxy : `http://${proxy}`;
        
        return proxyUrl;
    }
    
    // Marcar proxy como fallido
    markProxyFailed(proxyUrl) {
        if (proxyUrl) {
            // Limpiar el formato URL si es necesario
            const cleanProxy = proxyUrl.replace(/^https?:\/\//, '');
            this.failedProxies.set(cleanProxy, Date.now());
            this.stats.failedRequests++;
            console.log(`⚠️ Proxy marcado como fallido: ${cleanProxy}`);
        }
    }
    
    // Marcar proxy como exitoso
    markProxySuccess(proxyUrl) {
        if (proxyUrl) {
            const cleanProxy = proxyUrl.replace(/^https?:\/\//, '');
            if (this.failedProxies.has(cleanProxy)) {
                this.failedProxies.delete(cleanProxy);
                console.log(`✅ Proxy recuperado: ${cleanProxy}`);
            }
            this.stats.successfulRequests++;
        }
        this.stats.totalRequests++;
    }
    
    isProxyFailed(proxyUrl) {
        if (!proxyUrl) return false;
        
        const cleanProxy = proxyUrl.replace(/^https?:\/\//, '');
        
        if (!this.failedProxies.has(cleanProxy)) return false;
        
        const failTime = this.failedProxies.get(cleanProxy);
        if (Date.now() - failTime > this.failTimeout) {
            // El timeout expiró, eliminar de fallidos
            this.failedProxies.delete(cleanProxy);
            console.log(`🔄 Proxy reactivado: ${cleanProxy}`);
            return false;
        }
        return true;
    }
    
    cleanFailedProxies() {
        const now = Date.now();
        let cleaned = 0;
        for (const [proxy, failTime] of this.failedProxies.entries()) {
            if (now - failTime > this.failTimeout) {
                this.failedProxies.delete(proxy);
                cleaned++;
                console.log(`🔄 Proxy recuperado: ${proxy}`);
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 Limpiados ${cleaned} proxies fallidos expirados`);
        }
        return cleaned;
    }
    
    // Obtener estadísticas
    getStats() {
        const availableProxies = this.proxies.filter(p => !this.isProxyFailed(p)).length;
        const activeFailures = this.proxies.filter(p => this.isProxyFailed(p)).length;
        
        return {
            totalProxies: this.proxies.length,
            availableProxies: availableProxies,
            failedProxies: activeFailures,
            currentIndex: this.currentIndex,
            requests: { ...this.stats },
            successRate: this.stats.totalRequests > 0 
                ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }
    
    // Probar un proxy específico
    async testProxy(proxyUrl) {
        const axios = require('axios');
        const https = require('https');
        
        try {
            const proxyConfig = this.parseProxyUrl(proxyUrl);
            if (!proxyConfig) return false;
            
            const startTime = Date.now();
            const response = await axios.get('https://httpbin.org/ip', {
                proxy: proxyConfig,
                timeout: 10000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            
            const latency = Date.now() - startTime;
            
            if (response.status === 200) {
                console.log(`✅ Proxy ${proxyUrl} - Válido (${latency}ms)`);
                return { valid: true, latency, ip: response.data.origin };
            }
            return { valid: false, error: `HTTP ${response.status}` };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
    async testAllProxies() {
        const results = [];
        
        for (const proxy of this.proxies) {
            const result = await this.testProxy(proxy);
            results.push({ proxy, ...result });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const validCount = results.filter(r => r.valid).length;
        console.log(`\n📊 Resultados: ${validCount}/${this.proxies.length} proxies válidos`);
        return results;
    }
    
    parseProxyUrl(proxyUrl) {
        try {
            let url = proxyUrl;
            if (!proxyUrl.startsWith('http')) {
                url = `http://${proxyUrl}`;
            }
            
            const parsed = new URL(url);
            const proxyConfig = {
                host: parsed.hostname,
                port: parseInt(parsed.port) || 80
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
    
    getRandomProxy() {
        const availableProxies = this.proxies.filter(proxy => !this.isProxyFailed(proxy));
        if (availableProxies.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * availableProxies.length);
        const proxy = availableProxies[randomIndex];
        return proxy.startsWith('http') ? proxy : `http://${proxy}`;
    }
    
    resetFailedProxies() {
        const count = this.failedProxies.size;
        this.failedProxies.clear();
        return count;
    }
}

let instance = null;

function getProxyManager() {
    if (!instance) {
        instance = new ProxyManager();
    }
    return instance;
}

module.exports = { ProxyManager, getProxyManager };
