import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "./common";
export interface ENSInterface extends Interface {
    getFunction(nameOrSignature: "supportsInterface" | "setText" | "interfaceImplementer" | "ABI" | "setPubkey" | "setContenthash" | "addr(bytes32)" | "addr(bytes32,uint256)" | "setAuthorisation" | "text" | "setABI" | "name" | "setName" | "setAddr(bytes32,uint256,bytes)" | "setAddr(bytes32,address)" | "contenthash" | "pubkey" | "setInterface" | "authorisations"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "AuthorisationChanged" | "TextChanged" | "PubkeyChanged" | "NameChanged" | "InterfaceChanged" | "ContenthashChanged" | "AddrChanged" | "AddressChanged" | "ABIChanged"): EventFragment;
    encodeFunctionData(functionFragment: "supportsInterface", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "setText", values: [BytesLike, string, string]): string;
    encodeFunctionData(functionFragment: "interfaceImplementer", values: [BytesLike, BytesLike]): string;
    encodeFunctionData(functionFragment: "ABI", values: [BytesLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "setPubkey", values: [BytesLike, BytesLike, BytesLike]): string;
    encodeFunctionData(functionFragment: "setContenthash", values: [BytesLike, BytesLike]): string;
    encodeFunctionData(functionFragment: "addr(bytes32)", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "addr(bytes32,uint256)", values: [BytesLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "setAuthorisation", values: [BytesLike, AddressLike, boolean]): string;
    encodeFunctionData(functionFragment: "text", values: [BytesLike, string]): string;
    encodeFunctionData(functionFragment: "setABI", values: [BytesLike, BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "name", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "setName", values: [BytesLike, string]): string;
    encodeFunctionData(functionFragment: "setAddr(bytes32,uint256,bytes)", values: [BytesLike, BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "setAddr(bytes32,address)", values: [BytesLike, AddressLike]): string;
    encodeFunctionData(functionFragment: "contenthash", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "pubkey", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "setInterface", values: [BytesLike, BytesLike, AddressLike]): string;
    encodeFunctionData(functionFragment: "authorisations", values: [BytesLike, AddressLike, AddressLike]): string;
    decodeFunctionResult(functionFragment: "supportsInterface", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setText", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "interfaceImplementer", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "ABI", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setPubkey", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setContenthash", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addr(bytes32)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addr(bytes32,uint256)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setAuthorisation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "text", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setABI", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setName", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setAddr(bytes32,uint256,bytes)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setAddr(bytes32,address)", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "contenthash", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "pubkey", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setInterface", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "authorisations", data: BytesLike): Result;
}
export declare namespace AuthorisationChangedEvent {
    type InputTuple = [
        node: BytesLike,
        owner: AddressLike,
        target: AddressLike,
        isAuthorised: boolean
    ];
    type OutputTuple = [
        node: string,
        owner: string,
        target: string,
        isAuthorised: boolean
    ];
    interface OutputObject {
        node: string;
        owner: string;
        target: string;
        isAuthorised: boolean;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace TextChangedEvent {
    type InputTuple = [node: BytesLike, indexedKey: string, key: string];
    type OutputTuple = [node: string, indexedKey: string, key: string];
    interface OutputObject {
        node: string;
        indexedKey: string;
        key: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace PubkeyChangedEvent {
    type InputTuple = [node: BytesLike, x: BytesLike, y: BytesLike];
    type OutputTuple = [node: string, x: string, y: string];
    interface OutputObject {
        node: string;
        x: string;
        y: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace NameChangedEvent {
    type InputTuple = [node: BytesLike, name: string];
    type OutputTuple = [node: string, name: string];
    interface OutputObject {
        node: string;
        name: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace InterfaceChangedEvent {
    type InputTuple = [
        node: BytesLike,
        interfaceID: BytesLike,
        implementer: AddressLike
    ];
    type OutputTuple = [
        node: string,
        interfaceID: string,
        implementer: string
    ];
    interface OutputObject {
        node: string;
        interfaceID: string;
        implementer: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ContenthashChangedEvent {
    type InputTuple = [node: BytesLike, hash: BytesLike];
    type OutputTuple = [node: string, hash: string];
    interface OutputObject {
        node: string;
        hash: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace AddrChangedEvent {
    type InputTuple = [node: BytesLike, a: AddressLike];
    type OutputTuple = [node: string, a: string];
    interface OutputObject {
        node: string;
        a: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace AddressChangedEvent {
    type InputTuple = [
        node: BytesLike,
        coinType: BigNumberish,
        newAddress: BytesLike
    ];
    type OutputTuple = [
        node: string,
        coinType: bigint,
        newAddress: string
    ];
    interface OutputObject {
        node: string;
        coinType: bigint;
        newAddress: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ABIChangedEvent {
    type InputTuple = [node: BytesLike, contentType: BigNumberish];
    type OutputTuple = [node: string, contentType: bigint];
    interface OutputObject {
        node: string;
        contentType: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface ENS extends BaseContract {
    connect(runner?: ContractRunner | null): ENS;
    waitForDeployment(): Promise<this>;
    interface: ENSInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    supportsInterface: TypedContractMethod<[
        interfaceID: BytesLike
    ], [
        boolean
    ], "view">;
    setText: TypedContractMethod<[
        node: BytesLike,
        key: string,
        value: string
    ], [
        void
    ], "nonpayable">;
    interfaceImplementer: TypedContractMethod<[
        node: BytesLike,
        interfaceID: BytesLike
    ], [
        string
    ], "view">;
    ABI: TypedContractMethod<[
        node: BytesLike,
        contentTypes: BigNumberish
    ], [
        [bigint, string]
    ], "view">;
    setPubkey: TypedContractMethod<[
        node: BytesLike,
        x: BytesLike,
        y: BytesLike
    ], [
        void
    ], "nonpayable">;
    setContenthash: TypedContractMethod<[
        node: BytesLike,
        hash: BytesLike
    ], [
        void
    ], "nonpayable">;
    "addr(bytes32)": TypedContractMethod<[node: BytesLike], [string], "view">;
    "addr(bytes32,uint256)": TypedContractMethod<[
        node: BytesLike,
        coinType: BigNumberish
    ], [
        string
    ], "view">;
    setAuthorisation: TypedContractMethod<[
        node: BytesLike,
        target: AddressLike,
        isAuthorised: boolean
    ], [
        void
    ], "nonpayable">;
    text: TypedContractMethod<[node: BytesLike, key: string], [string], "view">;
    setABI: TypedContractMethod<[
        node: BytesLike,
        contentType: BigNumberish,
        data: BytesLike
    ], [
        void
    ], "nonpayable">;
    name: TypedContractMethod<[node: BytesLike], [string], "view">;
    setName: TypedContractMethod<[
        node: BytesLike,
        name: string
    ], [
        void
    ], "nonpayable">;
    "setAddr(bytes32,uint256,bytes)": TypedContractMethod<[
        node: BytesLike,
        coinType: BigNumberish,
        a: BytesLike
    ], [
        void
    ], "nonpayable">;
    "setAddr(bytes32,address)": TypedContractMethod<[
        node: BytesLike,
        a: AddressLike
    ], [
        void
    ], "nonpayable">;
    contenthash: TypedContractMethod<[node: BytesLike], [string], "view">;
    pubkey: TypedContractMethod<[
        node: BytesLike
    ], [
        [string, string] & {
            x: string;
            y: string;
        }
    ], "view">;
    setInterface: TypedContractMethod<[
        node: BytesLike,
        interfaceID: BytesLike,
        implementer: AddressLike
    ], [
        void
    ], "nonpayable">;
    authorisations: TypedContractMethod<[
        arg0: BytesLike,
        arg1: AddressLike,
        arg2: AddressLike
    ], [
        boolean
    ], "view">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "supportsInterface"): TypedContractMethod<[interfaceID: BytesLike], [boolean], "view">;
    getFunction(nameOrSignature: "setText"): TypedContractMethod<[
        node: BytesLike,
        key: string,
        value: string
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "interfaceImplementer"): TypedContractMethod<[
        node: BytesLike,
        interfaceID: BytesLike
    ], [
        string
    ], "view">;
    getFunction(nameOrSignature: "ABI"): TypedContractMethod<[
        node: BytesLike,
        contentTypes: BigNumberish
    ], [
        [bigint, string]
    ], "view">;
    getFunction(nameOrSignature: "setPubkey"): TypedContractMethod<[
        node: BytesLike,
        x: BytesLike,
        y: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "setContenthash"): TypedContractMethod<[
        node: BytesLike,
        hash: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "addr(bytes32)"): TypedContractMethod<[node: BytesLike], [string], "view">;
    getFunction(nameOrSignature: "addr(bytes32,uint256)"): TypedContractMethod<[
        node: BytesLike,
        coinType: BigNumberish
    ], [
        string
    ], "view">;
    getFunction(nameOrSignature: "setAuthorisation"): TypedContractMethod<[
        node: BytesLike,
        target: AddressLike,
        isAuthorised: boolean
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "text"): TypedContractMethod<[node: BytesLike, key: string], [string], "view">;
    getFunction(nameOrSignature: "setABI"): TypedContractMethod<[
        node: BytesLike,
        contentType: BigNumberish,
        data: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "name"): TypedContractMethod<[node: BytesLike], [string], "view">;
    getFunction(nameOrSignature: "setName"): TypedContractMethod<[node: BytesLike, name: string], [void], "nonpayable">;
    getFunction(nameOrSignature: "setAddr(bytes32,uint256,bytes)"): TypedContractMethod<[
        node: BytesLike,
        coinType: BigNumberish,
        a: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "setAddr(bytes32,address)"): TypedContractMethod<[
        node: BytesLike,
        a: AddressLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "contenthash"): TypedContractMethod<[node: BytesLike], [string], "view">;
    getFunction(nameOrSignature: "pubkey"): TypedContractMethod<[
        node: BytesLike
    ], [
        [string, string] & {
            x: string;
            y: string;
        }
    ], "view">;
    getFunction(nameOrSignature: "setInterface"): TypedContractMethod<[
        node: BytesLike,
        interfaceID: BytesLike,
        implementer: AddressLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "authorisations"): TypedContractMethod<[
        arg0: BytesLike,
        arg1: AddressLike,
        arg2: AddressLike
    ], [
        boolean
    ], "view">;
    getEvent(key: "AuthorisationChanged"): TypedContractEvent<AuthorisationChangedEvent.InputTuple, AuthorisationChangedEvent.OutputTuple, AuthorisationChangedEvent.OutputObject>;
    getEvent(key: "TextChanged"): TypedContractEvent<TextChangedEvent.InputTuple, TextChangedEvent.OutputTuple, TextChangedEvent.OutputObject>;
    getEvent(key: "PubkeyChanged"): TypedContractEvent<PubkeyChangedEvent.InputTuple, PubkeyChangedEvent.OutputTuple, PubkeyChangedEvent.OutputObject>;
    getEvent(key: "NameChanged"): TypedContractEvent<NameChangedEvent.InputTuple, NameChangedEvent.OutputTuple, NameChangedEvent.OutputObject>;
    getEvent(key: "InterfaceChanged"): TypedContractEvent<InterfaceChangedEvent.InputTuple, InterfaceChangedEvent.OutputTuple, InterfaceChangedEvent.OutputObject>;
    getEvent(key: "ContenthashChanged"): TypedContractEvent<ContenthashChangedEvent.InputTuple, ContenthashChangedEvent.OutputTuple, ContenthashChangedEvent.OutputObject>;
    getEvent(key: "AddrChanged"): TypedContractEvent<AddrChangedEvent.InputTuple, AddrChangedEvent.OutputTuple, AddrChangedEvent.OutputObject>;
    getEvent(key: "AddressChanged"): TypedContractEvent<AddressChangedEvent.InputTuple, AddressChangedEvent.OutputTuple, AddressChangedEvent.OutputObject>;
    getEvent(key: "ABIChanged"): TypedContractEvent<ABIChangedEvent.InputTuple, ABIChangedEvent.OutputTuple, ABIChangedEvent.OutputObject>;
    filters: {
        "AuthorisationChanged(bytes32,address,address,bool)": TypedContractEvent<AuthorisationChangedEvent.InputTuple, AuthorisationChangedEvent.OutputTuple, AuthorisationChangedEvent.OutputObject>;
        AuthorisationChanged: TypedContractEvent<AuthorisationChangedEvent.InputTuple, AuthorisationChangedEvent.OutputTuple, AuthorisationChangedEvent.OutputObject>;
        "TextChanged(bytes32,string,string)": TypedContractEvent<TextChangedEvent.InputTuple, TextChangedEvent.OutputTuple, TextChangedEvent.OutputObject>;
        TextChanged: TypedContractEvent<TextChangedEvent.InputTuple, TextChangedEvent.OutputTuple, TextChangedEvent.OutputObject>;
        "PubkeyChanged(bytes32,bytes32,bytes32)": TypedContractEvent<PubkeyChangedEvent.InputTuple, PubkeyChangedEvent.OutputTuple, PubkeyChangedEvent.OutputObject>;
        PubkeyChanged: TypedContractEvent<PubkeyChangedEvent.InputTuple, PubkeyChangedEvent.OutputTuple, PubkeyChangedEvent.OutputObject>;
        "NameChanged(bytes32,string)": TypedContractEvent<NameChangedEvent.InputTuple, NameChangedEvent.OutputTuple, NameChangedEvent.OutputObject>;
        NameChanged: TypedContractEvent<NameChangedEvent.InputTuple, NameChangedEvent.OutputTuple, NameChangedEvent.OutputObject>;
        "InterfaceChanged(bytes32,bytes4,address)": TypedContractEvent<InterfaceChangedEvent.InputTuple, InterfaceChangedEvent.OutputTuple, InterfaceChangedEvent.OutputObject>;
        InterfaceChanged: TypedContractEvent<InterfaceChangedEvent.InputTuple, InterfaceChangedEvent.OutputTuple, InterfaceChangedEvent.OutputObject>;
        "ContenthashChanged(bytes32,bytes)": TypedContractEvent<ContenthashChangedEvent.InputTuple, ContenthashChangedEvent.OutputTuple, ContenthashChangedEvent.OutputObject>;
        ContenthashChanged: TypedContractEvent<ContenthashChangedEvent.InputTuple, ContenthashChangedEvent.OutputTuple, ContenthashChangedEvent.OutputObject>;
        "AddrChanged(bytes32,address)": TypedContractEvent<AddrChangedEvent.InputTuple, AddrChangedEvent.OutputTuple, AddrChangedEvent.OutputObject>;
        AddrChanged: TypedContractEvent<AddrChangedEvent.InputTuple, AddrChangedEvent.OutputTuple, AddrChangedEvent.OutputObject>;
        "AddressChanged(bytes32,uint256,bytes)": TypedContractEvent<AddressChangedEvent.InputTuple, AddressChangedEvent.OutputTuple, AddressChangedEvent.OutputObject>;
        AddressChanged: TypedContractEvent<AddressChangedEvent.InputTuple, AddressChangedEvent.OutputTuple, AddressChangedEvent.OutputObject>;
        "ABIChanged(bytes32,uint256)": TypedContractEvent<ABIChangedEvent.InputTuple, ABIChangedEvent.OutputTuple, ABIChangedEvent.OutputObject>;
        ABIChanged: TypedContractEvent<ABIChangedEvent.InputTuple, ABIChangedEvent.OutputTuple, ABIChangedEvent.OutputObject>;
    };
}
