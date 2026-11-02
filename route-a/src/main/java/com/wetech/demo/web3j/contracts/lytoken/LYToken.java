package com.wetech.demo.web3j.contracts.lytoken;

import io.reactivex.Flowable;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.BaseEventResponse;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/**
 * <p>Auto generated code.
 * <p><strong>Do not modify!</strong>
 * <p>Please use the <a href="https://docs.web3j.io/command_line.html">web3j command line tools</a>,
 * or the org.web3j.codegen.SolidityFunctionWrapperGenerator in the 
 * <a href="https://github.com/LFDT-web3j/web3j/tree/main/codegen">codegen module</a> to update.
 *
 * <p>Generated with web3j version 4.14.0.
 */
@SuppressWarnings("rawtypes")
public class LYToken extends Contract {
    public static final String BINARY = "60c06040526007608090815266262caa37b5b2b760c91b60a0525f90610025908261012c565b5060408051808201909152600e81526d262c9918191a1c991a1a9898991960911b6020820152600190610058908261012c565b506002805460ff19166012179055348015610071575f5ffd5b50600480546001600160a01b031916331790556101ea565b634e487b7160e01b5f52604160045260245ffd5b600181811c908216806100b157607f821691505b6020821081036100cf57634e487b7160e01b5f52602260045260245ffd5b50919050565b601f821115610127578282111561012757805f5260205f20601f840160051c602085101561010057505f5b90810190601f840160051c035f5b81811015610123575f8382015560010161010e565b5050505b505050565b81516001600160401b0381111561014557610145610089565b61015981610153845461009d565b846100d5565b6020601f82116001811461018b575f83156101745750848201515b5f19600385901b1c1916600184901b1784556101e3565b5f84815260208120601f198516915b828110156101ba578785015182556020948501946001909201910161019a565b50848210156101d757868401515f19600387901b60f8161c191681555b505060018360011b0184555b5050505050565b610acc806101f75f395ff3fe608060405234801561000f575f5ffd5b50600436106100b1575f3560e01c806342966c681161006e57806342966c681461015457806370a08231146101675780638da5cb5b1461018f57806395d89b41146101ba578063a9059cbb146101c2578063dd62ed3e146101d5575f5ffd5b806306fdde03146100b5578063095ea7b3146100d357806318160ddd146100f657806323b872dd1461010d578063313ce5671461012057806340c10f191461013f575b5f5ffd5b6100bd61020d565b6040516100ca91906108ea565b60405180910390f35b6100e66100e136600461093a565b610298565b60405190151581526020016100ca565b6100ff60035481565b6040519081526020016100ca565b6100e661011b366004610962565b610304565b60025461012d9060ff1681565b60405160ff90911681526020016100ca565b61015261014d36600461093a565b6105a6565b005b61015261016236600461099c565b6106d3565b6100ff6101753660046109b3565b6001600160a01b03165f9081526005602052604090205490565b6004546101a2906001600160a01b031681565b6040516001600160a01b0390911681526020016100ca565b6100bd61079f565b6100e66101d036600461093a565b6107ac565b6100ff6101e33660046109d3565b6001600160a01b039182165f90815260066020908152604080832093909416825291909152205490565b5f805461021990610a04565b80601f016020809104026020016040519081016040528092919081815260200182805461024590610a04565b80156102905780601f1061026757610100808354040283529160200191610290565b820191905f5260205f20905b81548152906001019060200180831161027357829003601f168201915b505050505081565b335f8181526006602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906102f29086815260200190565b60405180910390a35060015b92915050565b5f6001600160a01b0384166103705760405162461bcd60e51b815260206004820152602760248201527f4c59546f6b656e3a207472616e736665722066726f6d20746865207a65726f206044820152666164647265737360c81b60648201526084015b60405180910390fd5b6001600160a01b0383166103d45760405162461bcd60e51b815260206004820152602560248201527f4c59546f6b656e3a207472616e7366657220746f20746865207a65726f206164604482015264647265737360d81b6064820152608401610367565b6001600160a01b0384165f9081526005602052604090205482111561044c5760405162461bcd60e51b815260206004820152602860248201527f4c59546f6b656e3a207472616e7366657220616d6f756e7420657863656564736044820152672062616c616e636560c01b6064820152608401610367565b6001600160a01b0384165f9081526006602090815260408083203384529091529020548211156104d15760405162461bcd60e51b815260206004820152602a60248201527f4c59546f6b656e3a207472616e7366657220616d6f756e74206578636565647360448201526920616c6c6f77616e636560b01b6064820152608401610367565b6001600160a01b0384165f90815260066020908152604080832033845290915281208054849290610503908490610a50565b90915550506001600160a01b0384165f908152600560205260408120805484929061052f908490610a50565b90915550506001600160a01b0383165f908152600560205260408120805484929061055b908490610a63565b92505081905550826001600160a01b0316846001600160a01b03165f516020610a775f395f51905f528460405161059491815260200190565b60405180910390a35060019392505050565b6004546001600160a01b031633146106005760405162461bcd60e51b815260206004820181905260248201527f4c59546f6b656e3a2063616c6c6572206973206e6f7420746865206f776e65726044820152606401610367565b6001600160a01b0382166106605760405162461bcd60e51b815260206004820152602160248201527f4c59546f6b656e3a206d696e7420746f20746865207a65726f206164647265736044820152607360f81b6064820152608401610367565b8060035f8282546106719190610a63565b90915550506001600160a01b0382165f908152600560205260408120805483929061069d908490610a63565b90915550506040518181526001600160a01b038316905f905f516020610a775f395f51905f529060200160405180910390a35050565b335f9081526005602052604090205481111561073d5760405162461bcd60e51b8152602060048201526024808201527f4c59546f6b656e3a206275726e20616d6f756e7420657863656564732062616c604482015263616e636560e01b6064820152608401610367565b335f908152600560205260408120805483929061075b908490610a50565b925050819055508060035f8282546107739190610a50565b90915550506040518181525f9033905f516020610a775f395f51905f529060200160405180910390a350565b6001805461021990610a04565b5f6001600160a01b0383166108035760405162461bcd60e51b815260206004820181905260248201527f4c59546f6b656e3a5472616e7366657220746f207a65726f20616464726573736044820152606401610367565b335f908152600560205260409020548211156108715760405162461bcd60e51b815260206004820152602760248201527f4c59546f6b656e3a5472616e7366657220616d6f756e7420657863656564732060448201526662616c616e636560c81b6064820152608401610367565b335f908152600560205260408120805484929061088f908490610a50565b90915550506001600160a01b0383165f90815260056020526040812080548492906108bb908490610a63565b90915550506040518281526001600160a01b0384169033905f516020610a775f395f51905f52906020016102f2565b602081525f82518060208401528060208501604085015e5f604082850101526040601f19601f83011684010191505092915050565b80356001600160a01b0381168114610935575f5ffd5b919050565b5f5f6040838503121561094b575f5ffd5b6109548361091f565b946020939093013593505050565b5f5f5f60608486031215610974575f5ffd5b61097d8461091f565b925061098b6020850161091f565b929592945050506040919091013590565b5f602082840312156109ac575f5ffd5b5035919050565b5f602082840312156109c3575f5ffd5b6109cc8261091f565b9392505050565b5f5f604083850312156109e4575f5ffd5b6109ed8361091f565b91506109fb6020840161091f565b90509250929050565b600181811c90821680610a1857607f821691505b602082108103610a3657634e487b7160e01b5f52602260045260245ffd5b50919050565b634e487b7160e01b5f52601160045260245ffd5b818103818111156102fe576102fe610a3c565b808201808211156102fe576102fe610a3c56feddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa2646970667358221220d4e87a1c551171261c7049ea6b4734ebaf64a3a8f24703eb08292b14230a12a364736f6c63430008230033";

    private static String librariesLinkedBinary;

    public static final String FUNC_ALLOWANCE = "allowance";

    public static final String FUNC_APPROVE = "approve";

    public static final String FUNC_BALANCEOF = "balanceOf";

    public static final String FUNC_BURN = "burn";

    public static final String FUNC_DECIMALS = "decimals";

    public static final String FUNC_MINT = "mint";

    public static final String FUNC_NAME = "name";

    public static final String FUNC_OWNER = "owner";

    public static final String FUNC_SYMBOL = "symbol";

    public static final String FUNC_TOTALSUPPLY = "totalSupply";

    public static final String FUNC_TRANSFER = "transfer";

    public static final String FUNC_TRANSFERFROM = "transferFrom";

    public static final Event APPROVAL_EVENT = new Event("Approval", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Address>(true) {}, new TypeReference<Address>(true) {}, new TypeReference<Uint256>() {}));
    ;

    public static final Event TRANSFER_EVENT = new Event("Transfer", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Address>(true) {}, new TypeReference<Address>(true) {}, new TypeReference<Uint256>() {}));
    ;

    @Deprecated
    protected LYToken(String contractAddress, Web3j web3j, Credentials credentials,
            BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    protected LYToken(String contractAddress, Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    @Deprecated
    protected LYToken(String contractAddress, Web3j web3j, TransactionManager transactionManager,
            BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    protected LYToken(String contractAddress, Web3j web3j, TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static List<ApprovalEventResponse> getApprovalEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(APPROVAL_EVENT, transactionReceipt);
        ArrayList<ApprovalEventResponse> responses = new ArrayList<ApprovalEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ApprovalEventResponse typedResponse = new ApprovalEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.owner = (String) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.spender = (String) eventValues.getIndexedValues().get(1).getValue();
            typedResponse.value = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static ApprovalEventResponse getApprovalEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(APPROVAL_EVENT, log);
        ApprovalEventResponse typedResponse = new ApprovalEventResponse();
        typedResponse.log = log;
        typedResponse.owner = (String) eventValues.getIndexedValues().get(0).getValue();
        typedResponse.spender = (String) eventValues.getIndexedValues().get(1).getValue();
        typedResponse.value = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<ApprovalEventResponse> approvalEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getApprovalEventFromLog(log));
    }

    public Flowable<ApprovalEventResponse> approvalEventFlowable(DefaultBlockParameter startBlock,
            DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(APPROVAL_EVENT));
        return approvalEventFlowable(filter);
    }

    public static List<TransferEventResponse> getTransferEvents(
            TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(TRANSFER_EVENT, transactionReceipt);
        ArrayList<TransferEventResponse> responses = new ArrayList<TransferEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            TransferEventResponse typedResponse = new TransferEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.from = (String) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.to = (String) eventValues.getIndexedValues().get(1).getValue();
            typedResponse.value = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static TransferEventResponse getTransferEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(TRANSFER_EVENT, log);
        TransferEventResponse typedResponse = new TransferEventResponse();
        typedResponse.log = log;
        typedResponse.from = (String) eventValues.getIndexedValues().get(0).getValue();
        typedResponse.to = (String) eventValues.getIndexedValues().get(1).getValue();
        typedResponse.value = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<TransferEventResponse> transferEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getTransferEventFromLog(log));
    }

    public Flowable<TransferEventResponse> transferEventFlowable(DefaultBlockParameter startBlock,
            DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(TRANSFER_EVENT));
        return transferEventFlowable(filter);
    }

    public RemoteFunctionCall<BigInteger> allowance(String _owner, String spender) {
        final Function function = new Function(FUNC_ALLOWANCE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, _owner), 
                new org.web3j.abi.datatypes.Address(160, spender)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<TransactionReceipt> approve(String spender, BigInteger value) {
        final Function function = new Function(
                FUNC_APPROVE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, spender), 
                new org.web3j.abi.datatypes.generated.Uint256(value)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<BigInteger> balanceOf(String account) {
        final Function function = new Function(FUNC_BALANCEOF, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, account)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<TransactionReceipt> burn(BigInteger value) {
        final Function function = new Function(
                FUNC_BURN, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(value)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<BigInteger> decimals() {
        final Function function = new Function(FUNC_DECIMALS, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint8>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<TransactionReceipt> mint(String to, BigInteger value) {
        final Function function = new Function(
                FUNC_MINT, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, to), 
                new org.web3j.abi.datatypes.generated.Uint256(value)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<String> name() {
        final Function function = new Function(FUNC_NAME, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Utf8String>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteFunctionCall<String> owner() {
        final Function function = new Function(FUNC_OWNER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteFunctionCall<String> symbol() {
        final Function function = new Function(FUNC_SYMBOL, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Utf8String>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteFunctionCall<BigInteger> totalSupply() {
        final Function function = new Function(FUNC_TOTALSUPPLY, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<TransactionReceipt> transfer(String to, BigInteger value) {
        final Function function = new Function(
                FUNC_TRANSFER, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, to), 
                new org.web3j.abi.datatypes.generated.Uint256(value)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> transferFrom(String from, String to,
            BigInteger value) {
        final Function function = new Function(
                FUNC_TRANSFERFROM, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Address(160, from), 
                new org.web3j.abi.datatypes.Address(160, to), 
                new org.web3j.abi.datatypes.generated.Uint256(value)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    @Deprecated
    public static LYToken load(String contractAddress, Web3j web3j, Credentials credentials,
            BigInteger gasPrice, BigInteger gasLimit) {
        return new LYToken(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    @Deprecated
    public static LYToken load(String contractAddress, Web3j web3j,
            TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return new LYToken(contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    public static LYToken load(String contractAddress, Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        return new LYToken(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static LYToken load(String contractAddress, Web3j web3j,
            TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return new LYToken(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static RemoteCall<LYToken> deploy(Web3j web3j, Credentials credentials,
            ContractGasProvider contractGasProvider) {
        return deployRemoteCall(LYToken.class, web3j, credentials, contractGasProvider, getDeploymentBinary(), "");
    }

    public static RemoteCall<LYToken> deploy(Web3j web3j, TransactionManager transactionManager,
            ContractGasProvider contractGasProvider) {
        return deployRemoteCall(LYToken.class, web3j, transactionManager, contractGasProvider, getDeploymentBinary(), "");
    }

    @Deprecated
    public static RemoteCall<LYToken> deploy(Web3j web3j, Credentials credentials,
            BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(LYToken.class, web3j, credentials, gasPrice, gasLimit, getDeploymentBinary(), "");
    }

    @Deprecated
    public static RemoteCall<LYToken> deploy(Web3j web3j, TransactionManager transactionManager,
            BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(LYToken.class, web3j, transactionManager, gasPrice, gasLimit, getDeploymentBinary(), "");
    }

    public static void linkLibraries(List<Contract.LinkReference> references) {
        librariesLinkedBinary = linkBinaryWithReferences(BINARY, references);
    }

    private static String getDeploymentBinary() {
        if (librariesLinkedBinary != null) {
            return librariesLinkedBinary;
        } else {
            return BINARY;
        }
    }

    public static class ApprovalEventResponse extends BaseEventResponse {
        public String owner;

        public String spender;

        public BigInteger value;
    }

    public static class TransferEventResponse extends BaseEventResponse {
        public String from;

        public String to;

        public BigInteger value;
    }
}
