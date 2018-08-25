/// <reference types="node" />
import { Subject, Observable } from 'rxjs/Rx';
export interface ServerConfig {
    type: 'bool' | 'float';
    port?: number;
    host?: string;
    maxBitSamples: number;
    sampleRate: number;
    autoCloseTimeout?: number;
}
export interface BitCount {
    value: number;
    times: number;
}
export interface KMeansResult {
    error: number;
    lengths: number[];
}
export declare class Server {
    private parser;
    dataStream: Subject<number>;
    private lengthStream;
    private config;
    private socket;
    private finished;
    constructor(configReq: ServerConfig);
    private cleanup();
    messageHandler: (message: Buffer) => void;
    groupSameBits(): Observable<BitCount>;
    onesGroup(): Observable<BitCount>;
    zerosGroup(): Observable<BitCount>;
    singleKmeans(source: Observable<BitCount>, numGroups: number): Observable<KMeansResult>;
    kmeans(zeroGroups: number, onesGroups: number): Observable<KMeansResult[]>;
    isBitCountWithinRange: (bit: BitCount) => boolean;
    packets(): Observable<BitCount[]>;
    getConfig(): ServerConfig;
    setConfig(config: ServerConfig): void;
}
export declare abstract class BitInterpreter {
    protected server: Server;
    protected canFillWithZeros: boolean;
    constructor(server: Server, canFillWithZeros: boolean);
    abstract getPacketBits(): Observable<number[]>;
}
export declare class BitLengthInterpreter extends BitInterpreter {
    protected zeroSamples: number;
    protected oneSamples: number;
    constructor(server: Server, zeroSamples: number, oneSamples: number);
    getPacketBits(): Observable<number[]>;
    expandBit: (bit: BitCount) => number;
}
export declare class RawInterpreter extends BitInterpreter {
    protected bitSamples: number;
    constructor(server: Server, bitSamples: number);
    getPacketBits(): Observable<number[]>;
}
