"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BinaryParserImport = require("binary-parser");
var BinaryParser = BinaryParserImport.Parser;
const zmq = require("zeromq");
const Rx_1 = require("rxjs/Rx");
const kmeans = require("ml-kmeans");
const DEFAULT_CONFIG = {
    port: 33333,
    host: '127.0.0.1'
};
class Server {
    constructor(configReq) {
        this.dataStream = new Rx_1.Subject();
        this.lengthStream = new Rx_1.Subject();
        this.finished = false;
        this.messageHandler = (message) => {
            this.lengthStream.next(message.length);
            var data = this.parser.parse(message);
            for (let value of data.values) {
                this.dataStream.next(value);
            }
        };
        this.isBitCountWithinRange = (bit) => {
            return bit.times <= this.config.maxBitSamples;
        };
        this.config = DEFAULT_CONFIG;
        Object.assign(this.config, configReq);
        var parserType = (this.config.type === 'float') ? 'floatle' : 'uint8';
        this.parser = new BinaryParser()
            .array('values', {
            readUntil: 'eof',
            type: parserType
        });
        this.lengthStream
            .bufferCount(3, 1)
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
    cleanup() {
        if (this.finished) {
            return;
        }
        // console.log('cleanup');
        this.finished = true;
        this.socket.close();
        this.dataStream.complete();
    }
    groupSameBits() {
        return this.dataStream
            .bufferCount(2, 1)
            .map(arr => arr[0])
            .window(this.dataStream.distinctUntilChanged())
            .skip(1)
            .flatMap(obs => Rx_1.Observable
            .forkJoin(obs.count(), obs.take(1)).map(vals => {
            return {
                value: vals[1],
                times: vals[0]
            };
        }));
    }
    onesGroup() {
        return this.groupSameBits().filter(v => v.value === 1);
    }
    zerosGroup() {
        return this.groupSameBits().filter(v => v.value === 0);
    }
    singleKmeans(source, numGroups) {
        return source.toArray().map((vals) => {
            // console.log('kmeans');
            var result = kmeans(vals.map(one => [one.times]), numGroups);
            let ret = {
                error: result.centroids.reduce((old, now) => now.error + old, 0),
                lengths: result.centroids.map(centroid => centroid.centroid[0]).sort()
            };
            return ret;
        });
    }
    kmeans(zeroGroups, onesGroups) {
        return Rx_1.Observable.forkJoin(this.singleKmeans(this.zerosGroup().filter(this.isBitCountWithinRange), zeroGroups), this.singleKmeans(this.onesGroup().filter(this.isBitCountWithinRange), onesGroups));
    }
    packets() {
        return this.groupSameBits()
            .filter(this.isBitCountWithinRange)
            .window(this.groupSameBits().filter(val => !this.isBitCountWithinRange(val))
            .merge(this.groupSameBits()
            .debounceTime(Math.max(this.config.maxBitSamples / this.config.sampleRate * 1000.0, 100))))
            .flatMap(obs => obs.toArray())
            .filter(bits => bits.length > 0);
    }
    getConfig() {
        return this.config;
    }
    setConfig(config) {
        this.config = config;
    }
}
exports.Server = Server;
class BitInterpreter {
    constructor(server, canFillWithZeros) {
        this.server = server;
        this.canFillWithZeros = canFillWithZeros;
    }
}
exports.BitInterpreter = BitInterpreter;
class BitLengthInterpreter extends BitInterpreter {
    constructor(server, zeroSamples, oneSamples) {
        super(server, false);
        this.zeroSamples = zeroSamples;
        this.oneSamples = oneSamples;
        this.expandBit = (bit) => {
            return (Math.abs(bit.times - this.zeroSamples) < Math.abs(bit.times - this.oneSamples)) ? 0 : 1;
        };
    }
    getPacketBits() {
        return this.server.packets()
            .map(bits => {
            return bits.filter(bit => bit.value === 1).map(this.expandBit);
        });
    }
}
exports.BitLengthInterpreter = BitLengthInterpreter;
class RawInterpreter extends BitInterpreter {
    constructor(server, bitSamples) {
        super(server, true);
        this.bitSamples = bitSamples;
    }
    getPacketBits() {
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
exports.RawInterpreter = RawInterpreter;
//# sourceMappingURL=server.js.map