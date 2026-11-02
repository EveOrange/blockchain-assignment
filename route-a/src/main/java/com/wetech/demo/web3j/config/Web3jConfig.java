package com.wetech.demo.web3j.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.StaticGasProvider;

import java.math.BigInteger;

@Slf4j
@Configuration
public class Web3jConfig {

    @Value("${web3j.client-address:https://rpc-testnet.potos.hk}")
    private String clientAddress;

    // 必须由环境变量 WEB3J_PRIVATE_KEY 注入；仓库中不保存明文私钥。
    @Value("${web3j.private-key}")
    private String privateKey;

    @Value("${web3j.gas-price:10000000}")
    private String gasPrice;

    @Value("${web3j.gas-limit:6721975}")
    private String gasLimit;

    @Bean
    public Web3j web3j() {
        log.info("Connecting to Ethereum client: {}", clientAddress);
        return Web3j.build(new HttpService(clientAddress));
    }

    @Bean
    public Credentials credentials() {
        String key = privateKey == null ? "" : privateKey.trim();
        if (!key.startsWith("0x") && !key.startsWith("0X")) {
            key = "0x" + key;
        }
        if (!key.matches("(?i)0x[0-9a-f]{64}")) {
            throw new IllegalStateException(
                    "WEB3J_PRIVATE_KEY must be 64 hex characters, with or without 0x; current length=" + key.length());
        }
        return Credentials.create(key);
    }

    @Bean
    public ContractGasProvider contractGasProvider() {
        return new StaticGasProvider(new BigInteger(gasPrice), new BigInteger(gasLimit));
    }
}