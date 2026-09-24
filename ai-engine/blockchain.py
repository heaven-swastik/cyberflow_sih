"""
CyberFlow Blockchain Ledger

Implements a local blockchain for immutable, tamper-evident recording of
critical investigation events. Only hashes of sensitive data are stored
on-chain — raw PII, transaction amounts, and complaint details remain
in the existing off-chain storage.

Block structure:
  { index, timestamp, data_hash, record_type, case_id, prev_hash, nonce, hash }

Record types:
  - complaint_filed
  - prediction_generated
  - alert_dispatched
  - account_frozen
  - path_validated

Uses simplified Proof-of-Work (hash must start with "00") for demo speed.
"""

import hashlib
import json
import time
import os


class Block:
    """A single block in the CyberFlow blockchain."""

    def __init__(self, index, timestamp, record_type, case_id, data_hash,
                 prev_hash, nonce=0, block_hash=None):
        self.index = index
        self.timestamp = timestamp
        self.record_type = record_type
        self.case_id = case_id
        self.data_hash = data_hash
        self.prev_hash = prev_hash
        self.nonce = nonce
        self.hash = block_hash or self.compute_hash()

    def compute_hash(self):
        """SHA-256 hash of the block's contents."""
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "record_type": self.record_type,
            "case_id": self.case_id,
            "data_hash": self.data_hash,
            "prev_hash": self.prev_hash,
            "nonce": self.nonce,
        }, sort_keys=True).encode("utf-8")
        return hashlib.sha256(block_string).hexdigest()

    def to_dict(self):
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "record_type": self.record_type,
            "case_id": self.case_id,
            "data_hash": self.data_hash,
            "prev_hash": self.prev_hash,
            "nonce": self.nonce,
            "hash": self.hash,
        }

    @staticmethod
    def from_dict(d):
        return Block(
            index=d["index"],
            timestamp=d["timestamp"],
            record_type=d["record_type"],
            case_id=d["case_id"],
            data_hash=d["data_hash"],
            prev_hash=d["prev_hash"],
            nonce=d["nonce"],
            block_hash=d["hash"],
        )


class CyberFlowBlockchain:
    """
    Local blockchain ledger for CyberFlow.

    Provides immutable, tamper-evident recording of investigation events.
    """

    DIFFICULTY = 2  # Hash must start with this many zeros (low for demo speed)

    def __init__(self):
        self.chain = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        """Create the first block in the chain."""
        genesis = Block(
            index=0,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            record_type="genesis",
            case_id="SYSTEM",
            data_hash=hashlib.sha256(b"CyberFlow Genesis Block").hexdigest(),
            prev_hash="0" * 64,
        )
        genesis.hash = self._proof_of_work(genesis)
        self.chain.append(genesis)

    def _proof_of_work(self, block):
        """
        Simplified Proof-of-Work: find a nonce such that the block hash
        starts with DIFFICULTY zeros.
        """
        block.nonce = 0
        computed = block.compute_hash()
        prefix = "0" * self.DIFFICULTY
        while not computed.startswith(prefix):
            block.nonce += 1
            computed = block.compute_hash()
        return computed

    def add_record(self, record_type, case_id, data_dict):
        """
        Add a new record to the blockchain.

        Only the SHA-256 hash of data_dict is stored on-chain.
        Raw data remains off-chain in the existing in-memory/SQLite storage.

        Args:
            record_type: One of 'complaint_filed', 'prediction_generated',
                         'alert_dispatched', 'account_frozen', 'path_validated'
            case_id: Associated case identifier
            data_dict: The actual data to hash (not stored, only its hash)

        Returns:
            The newly created Block
        """
        data_hash = hashlib.sha256(
            json.dumps(data_dict, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        prev_block = self.chain[-1]
        new_block = Block(
            index=len(self.chain),
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            record_type=record_type,
            case_id=case_id,
            data_hash=data_hash,
            prev_hash=prev_block.hash,
        )
        new_block.hash = self._proof_of_work(new_block)
        self.chain.append(new_block)
        return new_block

    def verify_chain(self):
        """
        Verify the integrity of the entire blockchain.

        Returns:
            dict with 'valid' (bool), 'blocks_checked' (int),
            'violations' (list of error strings)
        """
        violations = []

        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Check hash linkage
            if current.prev_hash != previous.hash:
                violations.append(
                    f"Block {i}: prev_hash mismatch "
                    f"(expected {previous.hash[:16]}..., got {current.prev_hash[:16]}...)"
                )

            # Recompute and verify hash
            recomputed = current.compute_hash()
            if current.hash != recomputed:
                violations.append(
                    f"Block {i}: hash has been tampered with "
                    f"(stored {current.hash[:16]}..., recomputed {recomputed[:16]}...)"
                )

            # Verify proof of work
            prefix = "0" * self.DIFFICULTY
            if not current.hash.startswith(prefix):
                violations.append(
                    f"Block {i}: proof-of-work invalid "
                    f"(hash does not start with {'0' * self.DIFFICULTY})"
                )

        return {
            "valid": len(violations) == 0,
            "blocks_checked": len(self.chain),
            "violations": violations,
        }

    def export_chain(self):
        """Export the blockchain as a JSON-serializable list."""
        return [block.to_dict() for block in self.chain]

    def import_chain(self, chain_data):
        """Import a blockchain from a JSON-serializable list."""
        self.chain = [Block.from_dict(d) for d in chain_data]

    def get_records_for_case(self, case_id):
        """Get all blockchain records associated with a specific case."""
        return [b.to_dict() for b in self.chain if b.case_id == case_id]

    def get_stats(self):
        """Get blockchain statistics."""
        record_types = {}
        for block in self.chain:
            rt = block.record_type
            record_types[rt] = record_types.get(rt, 0) + 1

        return {
            "total_blocks": len(self.chain),
            "record_types": record_types,
            "latest_block_hash": self.chain[-1].hash if self.chain else None,
            "genesis_hash": self.chain[0].hash if self.chain else None,
            "chain_valid": self.verify_chain()["valid"],
        }

    def save(self, path):
        """Save blockchain to a JSON file."""
        with open(path, "w") as f:
            json.dump(self.export_chain(), f, indent=2)

    def load(self, path):
        """Load blockchain from a JSON file."""
        if not os.path.exists(path):
            return False
        with open(path) as f:
            data = json.load(f)
        self.import_chain(data)
        return True


# ── Standalone test ──
if __name__ == "__main__":
    print("=" * 60)
    print("CYBERFLOW BLOCKCHAIN — TEST")
    print("=" * 60)

    bc = CyberFlowBlockchain()

    # Add sample records
    bc.add_record("complaint_filed", "CF-1042", {
        "complainant": "Rajesh Kumar",
        "fraud_type": "investment_scam",
        "amount_inr": 3360000,
    })
    print(f"[+] Block 1: complaint_filed for CF-1042")

    bc.add_record("prediction_generated", "CF-1042", {
        "predicted_state": "cashout_prep",
        "risk_score": 0.99,
        "predicted_zone": "zone_b",
    })
    print(f"[+] Block 2: prediction_generated for CF-1042")

    bc.add_record("alert_dispatched", "CF-1042", {
        "alert_id": "ALT-0001",
        "sent_to": ["LEA Cyber Cell", "SBI Fraud Ops"],
        "priority": "HIGH",
    })
    print(f"[+] Block 3: alert_dispatched for CF-1042")

    bc.add_record("account_frozen", "CF-1042", {
        "account_id": "ACC-1000",
        "freeze_type": "temporary",
    })
    print(f"[+] Block 4: account_frozen for CF-1042")

    # Verify
    result = bc.verify_chain()
    print(f"\nChain verification: {'VALID' if result['valid'] else 'INVALID'}")
    print(f"Blocks checked: {result['blocks_checked']}")

    if result["violations"]:
        for v in result["violations"]:
            print(f"  X {v}")

    # Stats
    stats = bc.get_stats()
    print(f"\nBlockchain stats:")
    print(f"  Total blocks: {stats['total_blocks']}")
    print(f"  Record types: {stats['record_types']}")
    print(f"  Chain valid: {stats['chain_valid']}")

    # Test tampering detection
    print("\n--- Tampering test ---")
    bc.chain[2].case_id = "CF-TAMPERED"
    result = bc.verify_chain()
    print(f"After tampering: {'VALID' if result['valid'] else 'INVALID (tampering detected)'}")
    for v in result["violations"]:
        print(f"  X {v}")

    print("\n[+] Blockchain module test complete.")
