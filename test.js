"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const mocha_typescript_1 = require("mocha-typescript");
require("should");
const zmq = require("zeromq");
const utils_1 = require("./utils");
var testPort = 1234;
let BasicTest = class BasicTest {
    constructor() {
        this.closed = false;
        this.host = '127.0.0.1';
    }
    before() {
        this.client = zmq.socket('push');
        this.client.bindSync('tcp://' + this.host + ':' + testPort);
        this.server = new server_1.Server({
            port: testPort,
            type: 'bool',
            sampleRate: 10,
            maxBitSamples: 3,
            autoCloseTimeout: 500
        });
    }
    receive(done) {
        let bits = [1, 0, 1, 1, 0];
        this.server.dataStream.toArray().subscribe(vals => {
            vals.should.deepEqual(bits);
            done();
        });
        this.sendBits(bits);
        this.close();
    }
    receiveGrouped(done) {
        let bits = [1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1];
        let emitCount = 0;
        this.server.groupSameBits()
            .do(() => emitCount++)
            .toArray()
            .subscribe(bits => {
            const test = [{
                    value: 1,
                    times: 3
                }, {
                    value: 0,
                    times: 2
                }, {
                    value: 1,
                    times: 1
                }, {
                    value: 0,
                    times: 4
                }, {
                    value: 1,
                    times: 1
                }];
            bits.should.deepEqual(test);
        });
        this.sendBits(bits);
        setTimeout(() => {
            emitCount.should.equal(4);
            this.close();
            done();
        }, 100);
    }
    kmeans(done) {
        let bits = [1, 1, 1, 0, 0, 1, 0, 0, 0, 1];
        this.server.kmeans(2, 2).subscribe(result => {
            result[0].lengths.should.containEql(2);
            result[0].lengths.should.containEql(3);
            result[1].lengths.should.containEql(1);
            result[1].lengths.should.containEql(3);
            done();
        });
        this.sendBits(bits);
        this.close();
    }
    kmeansTimeout(done) {
        let bits = [1, 1, 1, 0, 0, 1, 0, 0, 0, 1];
        let checked = false;
        this.server.kmeans(2, 2).subscribe(result => {
            result[0].lengths.should.containEql(2);
            result[0].lengths.should.containEql(3);
            result[1].lengths.should.containEql(1);
            result[1].lengths.should.containEql(3);
            checked = true;
            this.close();
        });
        this.sendBits(bits);
        setTimeout(() => {
            checked.should.be.equal(true);
            done();
        }, 1000);
    }
    packets(done) {
        let bits = [1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1];
        this.server.packets().toArray().subscribe(packets => {
            packets.should.have.length(2);
            packets[0].should.have.length(6);
            packets[1].should.have.length(4);
            packets.should.deepEqual([[{
                        value: 0,
                        times: 3
                    }, {
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }, {
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }, {
                        value: 1,
                        times: 2
                    }],
                [{
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }, {
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }]]);
            done();
        });
        this.sendBits(bits);
        this.close();
    }
    packetsDelay(done) {
        var bits = [1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1];
        var bits2 = [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1];
        var bits3 = [0, 0, 0, 0, 0, 1, 1, 1, 1];
        this.server.packets().toArray().subscribe(packets => {
            packets.should.have.length(2);
            packets[0].should.have.length(6);
            packets[1].should.have.length(4);
            packets.should.deepEqual([[{
                        value: 0,
                        times: 3
                    }, {
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }, {
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }, {
                        value: 1,
                        times: 2
                    }],
                [{
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }, {
                        value: 1,
                        times: 1
                    }, {
                        value: 0,
                        times: 1
                    }]]);
            done();
        });
        this.sendBits(bits);
        setTimeout(() => {
            this.sendBits(bits2);
            setTimeout(() => {
                this.sendBits(bits3);
                this.close();
            }, 200);
        }, 200);
    }
    bitLength(done) {
        let bits = [1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1];
        let interpreter = new server_1.BitLengthInterpreter(this.server, 1, 2);
        interpreter.getPacketBits().subscribe(interpreted => {
            interpreted.should.deepEqual([0, 1, 1, 0, 0]);
        });
        utils_1.getBytes(interpreter.getPacketBits(), 2).subscribe(bytes => {
            bytes.should.deepEqual([1, 2]);
            done();
        });
        this.sendBits(bits);
        this.close();
    }
    rawInterpreter(done) {
        let bits = [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0];
        this.server.setConfig({
            type: 'bool',
            maxBitSamples: 1000,
            sampleRate: 10,
            port: testPort
        });
        let interpreter = new server_1.RawInterpreter(this.server, 2);
        interpreter.getPacketBits().subscribe(interpreted => {
            interpreted.should.deepEqual([1, 1, 0, 1, 1, 1, 0]);
            done();
        });
        this.sendBits(bits);
        this.close();
    }
    send(message) {
        this.client.send(message);
    }
    sendBits(bits) {
        let message = '';
        for (let bit of bits) {
            message += '0';
            message += (bit === 0) ? '0' : '1';
        }
        this.send(new Buffer(message, 'hex'));
    }
    close() {
        if (!this.closed) {
            for (let n = 0; n < 3; n++) {
                this.send(new Buffer(''));
            }
            this.closed = true;
        }
    }
    after() {
        this.close();
        this.client.close();
    }
};
__decorate([
    mocha_typescript_1.test('basic receive test')
], BasicTest.prototype, "receive", null);
__decorate([
    mocha_typescript_1.slow(150), mocha_typescript_1.test('bit grouping test')
], BasicTest.prototype, "receiveGrouped", null);
__decorate([
    mocha_typescript_1.test('kmeans')
], BasicTest.prototype, "kmeans", null);
__decorate([
    mocha_typescript_1.slow(1100), mocha_typescript_1.test('kmeans timeout')
], BasicTest.prototype, "kmeansTimeout", null);
__decorate([
    mocha_typescript_1.test('packet detection')
], BasicTest.prototype, "packets", null);
__decorate([
    mocha_typescript_1.slow(450), mocha_typescript_1.test('packets with delay')
], BasicTest.prototype, "packetsDelay", null);
__decorate([
    mocha_typescript_1.test('bit length interpreter')
], BasicTest.prototype, "bitLength", null);
__decorate([
    mocha_typescript_1.test('raw bit interpreter')
], BasicTest.prototype, "rawInterpreter", null);
BasicTest = __decorate([
    mocha_typescript_1.suite('Basic')
], BasicTest);
//# sourceMappingURL=test.js.map