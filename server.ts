import BinaryParserImport = require('binary-parser');
var BinaryParser = BinaryParserImport.Parser;
import * as zmq from 'zeromq';
import { Subject, Observable } from 'rxjs/Rx';
import kmeans = require('ml-kmeans');

export interface ServerConfig {
    type: 'bool' | 'float';
    port?: number;
    host?: string;
    maxBitSamples: number;
    sampleRate: number;
    autoCloseTimeout?: number;
}
const DEFAULT_CONFIG = {
    port: 33333,
    host: '127.0.0.1'
};
export interface BitCount {
    value: number;
    times: number;
}
export interface KMeansResult {
    error: number;
    lengths: number[];
}
export class Server {
    private parser: any;
    public dataStream = new Subject<number>();
    private lengthStream = new Subject<number>();
    private config: ServerConfig;
    private socket: zmq.Socket;
    private finished = false;

    constructor(configReq: ServerConfig) {

        this.config = <ServerConfig>DEFAULT_CONFIG;
        Object.assign(this.config, configReq);

        var parserType = (this.config.type === 'float') ? 'floatle' : 'uint8';
        this.parser = new BinaryParser()
            .array('values', {
                readUntil: 'eof',
                type: parserType
            });
        this.lengthStream
            .bufferCount(3,1)
            .filter(lengths => lengths.reduce((tot, val) => tot + val, 0) === 0)
            .take(1)
            .subscribe((vals) => {
                // console.log('EOF Sent, closing');
                this.cleanup();
            });
        if (this.config.autoCloseTimeout) {
            this.dataStream.debounceTime(this.config.autoCloseTimeout).take(1).subscribe(this.cleanup.bind(this));
        }
        this.socket = zmq.socket('pull');
        this.socket.on('message', this.messageHandler);
        this.socket.on('close', this.cleanup.bind(this));
        this.socket.connect('tcp://' + this.config.host + ':' + this.config.port);
    }

    private cleanup() {
        if (this.finished) {
            return;
        }
        // console.log('cleanup');
        this.finished = true;
        this.socket.close();
        this.dataStream.complete();
    }

    messageHandler = (message: Buffer) => {
        this.lengthStream.next(message.length);
        var data = this.parser.parse(message);
        for (let value of data.values) {
            this.dataStream.next(value);
        }
    }

    groupSameBits(): Observable<BitCount> {
        return this.dataStream
            .bufferCount(2, 1)
            .map(arr => arr[0])
            .window(this.dataStream.distinctUntilChanged())
            .skip(1)
            .flatMap(obs => Observable
                .forkJoin(obs.count(), obs.take(1)).map(vals => {
                    return {
                        value: vals[1],
                        times: vals[0]
                    }
                })
            );
    }

    onesGroup(): Observable<BitCount> {
        return this.groupSameBits().filter(v => v.value === 1);
    }

    zerosGroup(): Observable<BitCount> {
        return this.groupSameBits().filter(v => v.value === 0);
    }

    singleKmeans(source: Observable<BitCount>, numGroups: number): Observable<KMeansResult> {
        return source.toArray().map((vals: BitCount[]) => {
            // console.log('kmeans');
            var result = kmeans(vals.map(one => [one.times]), numGroups);
            let ret: KMeansResult = {
                error: result.centroids.reduce((old, now) => now.error + old, 0),
                lengths: result.centroids.map(centroid => centroid.centroid[0]).sort()
            };
            return ret;
        });
    }

    kmeans(zeroGroups: number, onesGroups: number):Observable<KMeansResult[]> {
        return Observable.forkJoin(this.singleKmeans(this.zerosGroup().filter(this.isBitCountWithinRange), zeroGroups),
            this.singleKmeans(this.onesGroup().filter(this.isBitCountWithinRange), onesGroups));
    }

    isBitCountWithinRange = (bit: BitCount) => {
        return bit.times <= this.config.maxBitSamples;
    }

    packets(): Observable<BitCount[]> {
        return this.groupSameBits()
            .filter(this.isBitCountWithinRange)
            .window(this.groupSameBits().filter(val => !this.isBitCountWithinRange(val))
                        .merge(this.groupSameBits()
                                    .debounceTime(Math.max(this.config.maxBitSamples / this.config.sampleRate * 1000.0, 100))))
            .flatMap(obs => obs.toArray())
            .filter(bits => bits.length > 0);
    }

    getConfig(): ServerConfig {
        return this.config;
    }

    setConfig(config: ServerConfig) {
        this.config = config;
    }
}

export abstract class BitInterpreter {
    constructor(protected server: Server, protected canFillWithZeros: boolean) {}
    public abstract getPacketBits(): Observable<number[]>;
}

export class BitLengthInterpreter extends BitInterpreter {
    constructor(server: Server, protected zeroSamples: number, protected oneSamples: number) {
        super(server, false);
    }
    public getPacketBits(): Observable<number[]> {
        return this.server.packets()
            .map(bits => {
                return bits.filter(bit => bit.value === 1).map(this.expandBit);
            });
    }
    public expandBit = (bit: BitCount): number => {
        return (Math.abs(bit.times - this.zeroSamples) < Math.abs(bit.times - this.oneSamples)) ? 0 : 1;
    }
}

export class RawInterpreter extends BitInterpreter {
    constructor(server: Server, protected bitSamples: number) {
        super(server, true);
    }

    public getPacketBits(): Observable<number[]> {
        return this.server.packets().map(bits => {
            return bits.reduce((ret, bit) => {
                let expanded = [];
                for (let i = 0; i < Math.round(bit.times / this.bitSamples); i++) {
                    expanded.push(bit.value);
                }
                return ret.concat(expanded);
            }, []);
        });
    }

}