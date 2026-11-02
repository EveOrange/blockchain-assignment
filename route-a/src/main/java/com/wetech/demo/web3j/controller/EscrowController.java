package com.wetech.demo.web3j.controller;

import com.wetech.demo.web3j.service.EscrowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/api/escrow")
@RequiredArgsConstructor
public class EscrowController {

    private final EscrowService escrowService;

    @PostMapping("/deploy")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> deploy() {
        return escrowService.deploy().thenApply(ResponseEntity::ok);
    }

    @PostMapping("/load")
    public ResponseEntity<Map<String, Object>> load(@RequestParam String address,
                                                    @RequestParam BigInteger fromBlock) {
        escrowService.load(address, fromBlock);
        return ResponseEntity.ok(Map.of(
                "contractAddress", address,
                "fromBlock", fromBlock
        ));
    }

    @GetMapping("/addresses")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> addresses() {
        return escrowService.addresses().thenApply(ResponseEntity::ok);
    }

    @GetMapping("/orders/{id}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> order(@PathVariable BigInteger id) {
        return escrowService.getOrder(id).thenApply(ResponseEntity::ok);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> orders() throws Exception {
        return ResponseEntity.ok(escrowService.listOrders());
    }

    @PostMapping("/orders/{id}/resolve")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> resolve(
            @PathVariable BigInteger id,
            @RequestParam boolean sellerWins) {
        return escrowService.resolve(id, sellerWins).thenApply(ResponseEntity::ok);
    }
}
