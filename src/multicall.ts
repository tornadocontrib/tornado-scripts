import { BaseContract, Interface } from 'ethers';
import { Multicall } from './typechain';

export interface Call3 {
    contract?: BaseContract;
    address?: string;
    interface?: Interface;
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[];
    allowFailure?: boolean;
}

export async function multicall(Multicall: Multicall, calls: Call3[]) {
    const calldata = calls.map((call) => {
        const target = (call.contract?.target || call.address) as string;
        const callInterface = (call.contract?.interface || call.interface) as Interface;

        return {
            target,
            callData: callInterface.encodeFunctionData(call.name, call.params),
            allowFailure: call.allowFailure ?? false,
        };
    });

    const returnData = await Multicall.aggregate3.staticCall(calldata);

    const res = returnData.map((call, i) => {
        const callInterface = (calls[i].contract?.interface || calls[i].interface) as Interface;
        const [result, data] = call;
        const decodeResult =
            result && data && data !== '0x' ? callInterface.decodeFunctionResult(calls[i].name, data) : null;
        return !decodeResult ? null : decodeResult.length === 1 ? decodeResult[0] : decodeResult;
    });

    return res;
}
