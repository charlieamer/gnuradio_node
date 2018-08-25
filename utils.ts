import { Observable } from 'rxjs/Rx';

export function groupBitsToByte(bits: number[], bitsInBytes: number, canFillWithZeros: boolean): number[] {
    let ret = [];
    if (canFillWithZeros) {
        for (; bits.length % bitsInBytes !== 0; bits.push(0));
    }
    for (let i = 0; i < bits.length - (bits.length % bitsInBytes); i += bitsInBytes) {
        var bitString = bits.slice(i, i+bitsInBytes).reduce((prev: string, bit: number) => {
            return prev + bit.toString();
        }, '');
        ret.push(parseInt(bitString, 2));
    }
    // if (bits.length % bitsInBytes !== 0 && !this.canFillWithZeros) {
    //     console.log('Warning: ' + (bits.length % bitsInBytes) + ' bits hanging');
    // }
    return ret;

}

export function getBytes(bitSource: Observable<number[]>, bitsInBytes: number, canFilLWithZeros = false, prefix?: number[]): Observable<number[]> {
    return bitSource
        .filter(bits => !prefix || bits.slice(0, prefix.length).join(' ') === prefix.join(' '))
        .map(bits => prefix ? bits.slice(prefix.length) : bits)
        .map(bits => groupBitsToByte(bits, bitsInBytes, canFilLWithZeros)).filter(bytes => bytes.length > 0);
}

export function debugLog(bytes) {
    console.log(bytes.map(byte => '0x' + byte.toString(16)).join(' '));
}