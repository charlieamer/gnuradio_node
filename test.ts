import { Server, BitCount, BitLengthInterpreter, RawInterpreter } from './server';
import { suite, test, slow } from 'mocha-typescript';
import 'should';
import * as zmq from 'zeromq';
import { getBytes } from './utils';


var testPort = 1234;

@suite('Basic') class BasicTest {
    server: Server;
    closed = false;
    client: zmq.Socket;
    host = '127.0.0.1';
    before() {
        this.client = zmq.socket('push');
        this.client.bindSync('tcp://' + this.host + ':' + testPort);
        this.server = new Server({
            port: testPort,
            type: 'bool',
            sampleRate: 10,
            maxBitSamples: 3,
            autoCloseTimeout: 500
        });
    }

    @test('basic receive test') receive(done: Function) {
        let bits = [1, 0, 1, 1, 0];
        this.server.dataStream.toArray().subscribe(vals => {
            vals.should.deepEqual(bits);
            done();
        });
        this.sendBits(bits);
        this.close();
    }

    @slow(150) @test('bit grouping test') receiveGrouped(done: Function) {
        let bits = [1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1];
        let emitCount = 0;
        this.server.groupSameBits()
            .do(() => emitCount++)
            .toArray()
            .subscribe(bits => {
                const test: BitCount[] = [{
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

    @test('kmeans') kmeans(done: Function) {
        let bits = [1, 1, 1, 0, 0, 1, 0, 0, 0, 1];
        this.server.kmeans(2,2).subscribe(result => {
            result[0].lengths.should.containEql(2);
            result[0].lengths.should.containEql(3);
            result[1].lengths.should.containEql(1);
            result[1].lengths.should.containEql(3);
            done();
        });
        this.sendBits(bits);
        this.close();
    }

    @slow(1100) @test('kmeans timeout') kmeansTimeout(done: Function) {
        let bits = [1, 1, 1, 0, 0, 1, 0, 0, 0, 1];
        let checked = false;
        this.server.kmeans(2,2).subscribe(result => {
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

    @test('packet detection') packets(done: Function) {
        let bits = [1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1];
        this.server.packets().toArray().subscribe(packets => {
            packets.should.have.length(2);
            packets[0].should.have.length(6);
            packets[1].should.have.length(4);
            packets.should.deepEqual([[{
                value: 0,
                times: 3
            },{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            },{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            },{
                value: 1,
                times: 2
            }],
            
            [{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            },{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            }]]);
            done();
        });
        this.sendBits(bits);
        this.close();
    }

    @slow(450) @test('packets with delay') packetsDelay(done: Function) {
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
            },{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            },{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            },{
                value: 1,
                times: 2
            }],
            
            [{
                value: 1,
                times: 1
            },{
                value: 0,
                times: 1
            },{
                value: 1,
                times: 1
            },{
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

    @test('bit length interpreter') bitLength(done: Function) {
        let bits = [1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1];
        let interpreter = new BitLengthInterpreter(this.server, 1, 2);
        interpreter.getPacketBits().subscribe(interpreted => {
            interpreted.should.deepEqual([0, 1, 1, 0, 0]);
        });
        getBytes(interpreter.getPacketBits(), 2).subscribe(bytes => {
            bytes.should.deepEqual([1, 2]);
            done();
        });
        this.sendBits(bits);
        this.close();
    }

    @test('raw bit interpreter') rawInterpreter(done: Function) {
        let bits = [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0];
        this.server.setConfig({
            type: 'bool',
            maxBitSamples: 1000,
            sampleRate: 10,
            port: testPort
        });
        let interpreter = new RawInterpreter(this.server, 2);
        interpreter.getPacketBits().subscribe(interpreted => {
            interpreted.should.deepEqual([1, 1, 0, 1, 1, 1, 0]);
            done();
        });
        this.sendBits(bits);
        this.close();
    }

    send(message: Buffer) {
        this.client.send(message);
    }
    sendBits(bits: number[]) {
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
}