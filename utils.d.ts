import { Observable } from 'rxjs/Rx';
export declare function groupBitsToByte(bits: number[], bitsInBytes: number, canFillWithZeros: boolean): number[];
export declare function getBytes(bitSource: Observable<number[]>, bitsInBytes: number, canFilLWithZeros?: boolean, prefix?: number[]): Observable<number[]>;
export declare function debugLog(bytes: any): void;
