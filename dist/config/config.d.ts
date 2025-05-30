export interface Config {
    port: number;
    nodeEnv: string;
    databaseUrl: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    logLevel: string;
    paymentProvider: {
        apiKey: string;
        secret: string;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=config.d.ts.map