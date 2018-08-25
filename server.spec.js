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
const dgram = require("dgram");
var testPort = 1234;
let BasicTest = class BasicTest {
    constructor() {
        this.closed = false;
        this.host = '127.0.0.1';
    }
    before() {
        this.server = new server_1.Server({
            port: testPort,
            type: 'bool'
        });
        this.client = dgram.createSocket('udp4');
    }
    receive(done) {
        this.server.dataStream.toArray().subscribe(vals => {
            console.log(vals);
            done();
        });
        this.send(new Buffer('01000100', 'hex'));
    }
    send(message) {
        this.client.send(message, 0, message.length, testPort, this.host, function (err, bytes) {
            console.log('Sent:', message.length, 'bytes');
        });
    }
    close() {
        if (!this.closed) {
            for (let n = 0; n < 3; n++) {
                this.send(new Buffer(''));
            }
        }
        else {
            this.closed = true;
        }
    }
    after() {
        this.client.close();
    }
};
__decorate([
    mocha_typescript_1.test('basic receive test')
], BasicTest.prototype, "receive", null);
BasicTest = __decorate([
    mocha_typescript_1.suite('Basic')
], BasicTest);
