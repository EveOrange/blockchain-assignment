package com.wetech.demo.web3j.service;

import com.wetech.demo.web3j.contracts.escrow.Escrow;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.abi.EventEncoder;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.gas.ContractGasProvider;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class EscrowService {

    private final Web3j web3j;
    private final Credentials credentials;
    private final ContractGasProvider gasProvider;

    private Escrow contract;

    @Getter
    private String contractAddress;

    @Getter
    private BigInteger deployBlock;

    private static final String[] STATUS = {"Created", "Paid", "Completed", "Refunded", "Disputed"};

    public CompletableFuture<Map<String, Object>> deploy() {
        log.info("Deploying Escrow with backend arbiter {}", credentials.getAddress());
        return Escrow.deploy(web3j, credentials, gasProvider, credentials.getAddress())
                .sendAsync()
                .thenApply(c -> {
                    this.contract = c;
                    this.contractAddress = c.getContractAddress();
                    TransactionReceipt receipt = c.getTransactionReceipt()
                            .orElseThrow(() -> new IllegalStateException("deploy receipt missing"));
                    this.deployBlock = receipt.getBlockNumber();
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("contractAddress", this.contractAddress);
                    result.put("transactionHash", receipt.getTransactionHash());
                    result.put("deployBlock", this.deployBlock);
                    result.put("arbiter", credentials.getAddress());
                    return result;
                });
    }

    public void load(String address, BigInteger fromBlock) {
        log.info("Loading Escrow {} from block {}", address, fromBlock);
        this.contract = Escrow.load(address, web3j, credentials, gasProvider);
        this.contractAddress = address;
        this.deployBlock = fromBlock;
    }

    public CompletableFuture<Map<String, Object>> addresses() {
        requireContract();
        return contract.arbiter().sendAsync().thenApply(arbiter -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("contractAddress", contractAddress);
            result.put("arbiter", arbiter);
            return result;
        });
    }

    public CompletableFuture<Map<String, Object>> getOrder(BigInteger id) {
        requireContract();
        return contract.getOrder(id).sendAsync().thenApply(order -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", id);
            result.put("buyer", order.buyer);
            result.put("seller", order.seller);
            result.put("token", order.token);
            result.put("amount", order.amount.toString());
            result.put("deadline", order.deadline.toString());
            result.put("status", statusName(order.status));
            result.put("description", order.description);
            return result;
        });
    }

    /**
     * POTOS 的 eth_getLogs 一次最多 10 个区块，必须分批拉取。
     */
    public List<Map<String, Object>> listOrders() throws Exception {
        requireContract();
        BigInteger latest = web3j.ethBlockNumber().send().getBlockNumber();
        BigInteger from = deployBlock == null ? BigInteger.ZERO : deployBlock;
        List<Map<String, Object>> orders = new ArrayList<>();

        while (from.compareTo(latest) <= 0) {
            BigInteger to = from.add(BigInteger.TEN).subtract(BigInteger.ONE).min(latest);
            EthFilter filter = new EthFilter(
                    DefaultBlockParameter.valueOf(from),
                    DefaultBlockParameter.valueOf(to),
                    contractAddress);
            filter.addSingleTopic(EventEncoder.encode(Escrow.ORDERCREATED_EVENT));

            List<EthLog.LogResult> logs = web3j.ethGetLogs(filter).send().getLogs();
            for (EthLog.LogResult<?> item : logs) {
                Log log = (Log) item.get();
                Escrow.OrderCreatedEventResponse event = Escrow.getOrderCreatedEventFromLog(log);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", event.id);
                row.put("buyer", event.buyer);
                row.put("seller", event.seller);
                row.put("amount", event.amount.toString());
                row.put("blockNumber", log.getBlockNumber());
                row.put("transactionHash", log.getTransactionHash());
                orders.add(row);
            }
            from = to.add(BigInteger.ONE);
        }

        orders.sort(Comparator.comparing(o -> (BigInteger) o.get("id")));
        return orders;
    }

    public CompletableFuture<Map<String, Object>> resolve(BigInteger id, boolean sellerWins) {
        requireContract();
        return contract.resolve(id, sellerWins).sendAsync().thenCompose(receipt ->
                contract.getOrder(id).sendAsync().thenApply(order -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("transactionHash", receipt.getTransactionHash());
                    result.put("blockNumber", receipt.getBlockNumber());
                    result.put("receiptStatus", receipt.getStatus());
                    result.put("status", statusName(order.status));
                    return result;
                }));
    }

    private void requireContract() {
        if (contract == null) {
            throw new IllegalStateException("Contract not deployed or loaded; call /api/escrow/deploy or /load first");
        }
    }

    private static String statusName(BigInteger status) {
        int index = status.intValue();
        return index >= 0 && index < STATUS.length ? STATUS[index] : "Unknown";
    }
}
