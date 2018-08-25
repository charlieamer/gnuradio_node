"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function groupBitsToByte(bits, bitsInBytes, canFillWithZeros) {
    let ret = [];
    if (canFillWithZeros) {
        for (; bits.length % bitsInBytes !== 0; bits.push(0))
            ;
    }
    for (let i = 0; i < bits.length - (bits.length % bitsInBytes); i += bitsInBytes) {
        var bitString = bits.slice(i, i + bitsInBytes).reduce((prev, bit) => {
            return prev + bit.toString();
        }, '');
        ret.push(parseInt(bitString, 2));
    }
    // if (bits.length % bitsInBytes !== 0 && !this.canFillWithZeros) {
    //     console.log('Warning: ' + (bits.length % bitsInBytes) + ' bits hanging');
    // }
    return ret;
}
exports.groupBitsToByte = groupBitsToByte;
function getBytes(bitSource, bitsInBytes, canFilLWithZeros = false, prefix) {
    return bitSource
        .filter(bits => !prefix || bits.slice(0, prefix.length).join(' ') === prefix.join(' '))
        .map(bits => prefix ? bits.slice(prefix.length) : bits)
        .map(bits => groupBitsToByte(bits, bitsInBytes, canFilLWithZeros)).filter(bytes => bytes.length > 0);
}
exports.getBytes = getBytes;
function debugLog(bytes) {
    console.log(bytes.map(byte => '0x' + byte.toString(16)).join(' '));
}
exports.debugLog = debugLog;
//# sourceMappingURL=utils.js.map